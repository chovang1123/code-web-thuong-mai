param(
    [switch]$Setup,
    [int]$Port = 8082
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $mobileRoot '.tools'
$androidCli = Join-Path $toolsRoot 'android.exe'
$env:ANDROID_HOME = Join-Path $toolsRoot 'sdk'
$env:ANDROID_AVD_HOME = Join-Path $toolsRoot 'avd'
$adb = Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'
$emulator = Join-Path $env:ANDROID_HOME 'emulator\emulator.exe'

Set-Location -LiteralPath $mobileRoot

if ($Setup) {
    New-Item -ItemType Directory -Path $toolsRoot,$env:ANDROID_HOME,$env:ANDROID_AVD_HOME -Force | Out-Null
    if (-not (Test-Path -LiteralPath $androidCli)) {
        Write-Host 'Downloading the official Google Android CLI...'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/cli/latest/windows_x86_64/android.exe' -OutFile $androidCli
    }
    & $androidCli --no-metrics "--sdk=$env:ANDROID_HOME" sdk install platform-tools emulator
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
    $avds = & $emulator -list-avds
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Android virtual devices.' }
    if ($avds -notcontains 'medium_phone') {
        # Android CLI currently creates AVD files in the user profile even when
        # ANDROID_AVD_HOME is set. Copy that new device into the project tools.
        $defaultAvdRoot = Join-Path $env:USERPROFILE '.android\avd'
        $defaultAvdIni = Join-Path $defaultAvdRoot 'medium_phone.ini'
        if (-not (Test-Path -LiteralPath $defaultAvdIni)) {
            & $androidCli --no-metrics "--sdk=$env:ANDROID_HOME" emulator create medium_phone
            if ($LASTEXITCODE -ne 0) { throw 'Android virtual device creation failed.' }
        }
        $localAvdFolder = Join-Path $env:ANDROID_AVD_HOME 'medium_phone.avd'
        Copy-Item -LiteralPath (Join-Path $defaultAvdRoot 'medium_phone.avd') -Destination $localAvdFolder -Recurse -Force
        Get-Content -LiteralPath $defaultAvdIni | Where-Object { $_ -notmatch '^path\.rel=' } | ForEach-Object {
            if ($_ -match '^path=') { "path=$localAvdFolder" } else { $_ }
        } | Set-Content -LiteralPath (Join-Path $env:ANDROID_AVD_HOME 'medium_phone.ini') -Encoding ascii
    }
    Write-Host 'Android tools are ready. Run: npm run android'
    exit 0
}

if (-not (Test-Path -LiteralPath $adb) -or -not (Test-Path -LiteralPath $emulator) -or -not (Test-Path -LiteralPath $androidCli)) {
    throw 'Android tools are missing. Run: npm run android:setup'
}

$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
$devices = & $adb devices
if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to adb.' }
if (-not ($devices -match '^emulator-\d+\s+device\s*$')) {
    if (-not ($devices -match '^emulator-\d+\s+')) {
        # Reset saved geometry before launch so the title bar and full phone
        # stay accessible on a 1080p desktop, including after monitor changes.
        $windowIni = Join-Path $env:ANDROID_AVD_HOME 'medium_phone.avd\emulator-user.ini'
        $windowSettings = @()
        if (Test-Path -LiteralPath $windowIni) {
            $windowSettings = @(Get-Content -LiteralPath $windowIni | Where-Object { $_ -notmatch '^window\.(x|y|scale)\s*=' })
        }
        $windowSettings += @('window.x = 60', 'window.y = 40', 'window.scale = 0.300000')
        $windowSettings | Set-Content -LiteralPath $windowIni -Encoding ascii
        # A visible, independent window is intentional: the user interacts with it.
        Start-Process -FilePath $emulator -ArgumentList @('-avd', 'medium_phone', '-gpu', 'software', '-no-snapshot-load') -WindowStyle Normal `
            -RedirectStandardOutput (Join-Path $toolsRoot 'emulator-out.log') `
            -RedirectStandardError (Join-Path $toolsRoot 'emulator-error.log') | Out-Null
    }
}

# ADB can connect before Android's package manager is ready to install Expo Go.
$deadline = (Get-Date).AddSeconds(180)
$bootReady = $false
Write-Host 'Waiting for Android and its package manager...'
while ((Get-Date) -lt $deadline) {
    $devices = & $adb devices
    if ($devices -match '^emulator-\d+\s+device\s*$') {
        $boot = & $adb shell getprop sys.boot_completed
        if ($boot -eq '1') {
            $packages = & $adb shell cmd package list packages android
            if ($packages -contains 'package:android') { $bootReady = $true; break }
        }
    }
    Start-Sleep -Seconds 2
}
if (-not $bootReady) { throw 'Emulator boot timed out. Check .tools/emulator-error.log and Windows WHPX.' }

& $adb reverse "tcp:$Port" "tcp:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Cannot forward the Metro port through adb.' }

# Re-running this command must not start a second Metro on the same port.
# Verify the project in Expo's manifest before reusing any existing server.
$metroUrl = "http://127.0.0.1:$Port"
$metroRunning = $false
$portOpen = $false
$client = New-Object System.Net.Sockets.TcpClient
try {
    $connection = $client.ConnectAsync('127.0.0.1', $Port)
    if ($connection.Wait(1000)) { $portOpen = $client.Connected }
} catch { $portOpen = $false }
finally { $client.Dispose() }

if ($portOpen) {
    try {
        $status = Invoke-RestMethod -Uri "$metroUrl/status" -TimeoutSec 5
        if ($status.Trim() -eq 'packager-status:running') {
            $manifest = Invoke-RestMethod -Uri $metroUrl -Headers @{ 'expo-platform' = 'android' } -TimeoutSec 5
            $projectRoot = $manifest.extra.expoClient._internal.projectRoot
            $metroRunning = $projectRoot -and [IO.Path]::GetFullPath($projectRoot).TrimEnd('\') -eq $mobileRoot.TrimEnd('\')
        }
    } catch { $metroRunning = $false }
    if (-not $metroRunning) {
        throw "Port $Port is used by another server. Use: npm run android -- -Port 8083"
    }
}

if ($metroRunning) {
    Write-Host "Reusing Net Store Metro on port $Port. No second server will be started."
    & $adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:$Port" host.exp.exponent
    if ($LASTEXITCODE -ne 0) { throw 'Cannot open Net Store in Expo Go.' }
    Write-Host 'Net Store opened. Keep the original Metro terminal running.'
    exit 0
}

& (Join-Path $mobileRoot 'node_modules\.bin\expo.cmd') start --go --android --localhost --port $Port
exit $LASTEXITCODE
