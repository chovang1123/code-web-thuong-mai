import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, colors, ErrorCard, Field, Loading, ui } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useSeller } from '../../lib/use-seller';
import type { SellerDashboard } from '../../types';
import { useShop } from '../../state/shop';

function ProfileForm({ shop, onSaved }: { shop: SellerDashboard['shop']; onSaved: () => Promise<void> }) {
  const { store, session } = useShop();
  const [name, setName] = useState(shop.name);
  const [location, setLocation] = useState(shop.location);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save() {
    if (!name.trim() || !location.trim()) { setError('Nhập tên và địa chỉ gian hàng'); return; }
    setBusy(true); setError(''); setNotice('');
    try { await store.saveSellerProfile(name.trim(), location.trim()); await onSaved(); setNotice('Đã cập nhật gian hàng'); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <View style={ui.card}><Text style={ui.heading}>Hồ sơ gian hàng</Text>
    <Field label="Tên gian hàng" value={name} onChangeText={setName} maxLength={80} editable={!busy} />
    <Field label="Địa chỉ" value={location} onChangeText={setLocation} maxLength={120} editable={!busy} />
    <Text style={ui.muted}>Chủ gian hàng</Text><Text style={ui.text}>{session?.user.name}</Text><Text style={ui.muted}>{session?.user.email}</Text>
    {error && <ErrorCard message={error} />}{!!notice && <Text accessibilityLiveRegion="polite" style={[ui.text, { color: colors.green }]}>{notice}</Text>}
    <Button title="Lưu thông tin" loading={busy} onPress={() => { void save(); }} />
  </View>;
}
export default function SellerStore() {
  const { data, loading, error, refresh, store } = useSeller();
  const [logoutError, setLogoutError] = useState('');
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => { void refresh(); }} tintColor={colors.green} />}>
    <Text style={ui.label}>Net Seller</Text><Text style={ui.title}>Gian hàng của bạn</Text>
    {error && <ErrorCard message={error} onRetry={() => { void refresh(); }} />}
    {!data && loading ? <Loading /> : data && <ProfileForm shop={data.shop} onSaved={refresh} />}
    {logoutError && <ErrorCard message={logoutError} />}
    <Button title="Đăng xuất" variant="secondary" onPress={() => { void store.logout().then(() => router.replace('/login')).catch(failure => setLogoutError(errorMessage(failure))); }} />
  </ScrollView>;
}
