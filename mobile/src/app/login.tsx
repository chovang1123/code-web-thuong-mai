import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, ErrorCard, Field, FormScreen, ui } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useShop } from '../state/shop';

export default function LoginScreen() {
  const { session, store } = useShop();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      setError('Vui lòng nhập email hợp lệ và mật khẩu.'); return;
    }
    setBusy(true);
    setError('');
    try {
      await store.login(email, password);
      if (store.getSnapshot().session?.user.role === 'seller') router.replace('/(seller)');
      else if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/account');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  if (session) return <FormScreen><Text style={ui.heading}>Bạn đã đăng nhập</Text><Button title="Tiếp tục" onPress={() => router.replace(session.user.role === 'seller' ? '/(seller)' : '/(tabs)')} /></FormScreen>;

  return <FormScreen>
    <View style={{ gap: 12, paddingVertical: 12 }}>
      <Text style={ui.label}>Tài khoản Net Store</Text><Text style={ui.title}>Đăng nhập</Text>
      <Text style={ui.muted}>Dùng tài khoản mua hàng hoặc người bán trên website. Đăng ký tài khoản mới trên website nếu bạn chưa có tài khoản.</Text>
    </View>
    <View style={ui.card}>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" editable={!busy} placeholder="ban@example.com" />
      <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
        autoComplete="current-password" editable={!busy} onSubmitEditing={() => { void submit(); }} returnKeyType="go" />
      {error ? <ErrorCard message={error} /> : null}
      <Button title="Đăng nhập" loading={busy} onPress={() => { void submit(); }} />
    </View>
  </FormScreen>;
}
