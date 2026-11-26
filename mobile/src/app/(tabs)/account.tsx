import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SignInPrompt } from '../../components/sign-in-prompt';
import { Button, ErrorCard, ui } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useShop } from '../../state/shop';
import { router } from 'expo-router';
import { DeliveryAddress } from '../../components/delivery-address';

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
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    {session ? <View style={ui.card}>
      <Text style={ui.label}>Tài khoản của bạn</Text><Text style={ui.title}>{session.user.name}</Text><Text style={ui.text}>{session.user.email}</Text>
      <Text style={ui.muted}>Bạn đang dùng chung tài khoản với website Net Store.</Text>
      <Button title="Đăng xuất" variant="secondary" loading={busy} disabled={cartBusy} onPress={() => { void logout(); }} />
      <Button title="Đơn hàng của tôi" variant="secondary" onPress={() => router.push('/(tabs)/orders')} />
    </View> : <SignInPrompt />}
    {session?.user.role === 'customer' && <DeliveryAddress />}
    {error ? <ErrorCard message={error} /> : null}
    <View style={ui.card}><Text style={ui.heading}>Mua sắm cùng Net Store</Text><Text style={ui.muted}>Sản phẩm, giỏ hàng và đơn hàng được đồng bộ với tài khoản trên website.</Text>
    </View>
  </ScrollView>;
}
