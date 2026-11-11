import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SignInPrompt } from '../../components/sign-in-prompt';
import { Button, ErrorCard, ui } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { API_URL, useShop } from '../../state/shop';

export default function AccountScreen() {
  const { session, cartBusy, store } = useShop();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    setError('');
    try { await store.logout(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
    {session ? <View style={ui.card}>
      <Text style={ui.label}>TÀI KHOẢN KHÁCH HÀNG</Text><Text style={ui.title}>{session.user.name}</Text><Text style={ui.text}>{session.user.email}</Text>
      <Text style={ui.muted}>Bạn đang dùng chung tài khoản với website Net Store.</Text>
      <Button title="Đăng xuất" variant="secondary" loading={busy} disabled={cartBusy} onPress={() => { void logout(); }} />
    </View> : <SignInPrompt />}
    {error ? <ErrorCard message={error} /> : null}
    <View style={ui.card}><Text style={ui.heading}>Net Store · Android</Text><Text style={ui.muted}>Bản kiểm tra: sản phẩm, giỏ hàng, đặt hàng và lịch sử đơn.</Text>
      <Text style={ui.muted}>Máy chủ đang kết nối</Text><Text selectable style={ui.text}>{API_URL}</Text>
    </View>
  </ScrollView>;
}
