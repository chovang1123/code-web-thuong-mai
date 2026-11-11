import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading, colors } from '../components/ui';
import { ShopProvider, useShop } from '../state/shop';

function Navigation() {
  const { ready } = useShop();
  if (!ready) return <Loading text="Đang mở Net Store…" />;
  return <Stack screenOptions={{ headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="product/[id]" options={{ title: 'Chi tiết sản phẩm' }} />
    <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
    <Stack.Screen name="checkout" options={{ title: 'Xác nhận đặt hàng' }} />
  </Stack>;
}

export default function RootLayout() {
  return <SafeAreaProvider><ShopProvider><StatusBar style="dark" /><Navigation /></ShopProvider></SafeAreaProvider>;
}
