import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, colors, ErrorCard, Field, Loading, ui } from './ui';
import { Chip, ChipRow } from './catalog-controls';
import { useShop } from '../state/shop';
import { useRemote } from '../lib/use-remote';
import { deliveryAddressError, deliveryAddressText, emptyAddress } from '../lib/addresses';
import { errorMessage } from '../lib/api';
import type { AddressInput, SavedAddress, ShippingAddress, User } from '../types';

function AddressFields({ address, onChange, disabled }: { address: AddressInput; onChange: (address: AddressInput) => void; disabled: boolean }) {
  const field = (key: keyof AddressInput) => (value: string) => onChange({ ...address, [key]: value });
  return <View style={{ gap: 16 }}>
    <Field label="Họ và tên *" value={address.fullName} onChangeText={field('fullName')} maxLength={100} editable={!disabled} autoComplete="name" />
    <Field label="Số điện thoại *" value={address.phoneNumber} onChangeText={field('phoneNumber')} maxLength={20} editable={!disabled} keyboardType="phone-pad" autoComplete="tel" />
    <Field label="Tỉnh / Thành phố *" value={address.state} onChangeText={field('state')} maxLength={100} editable={!disabled} />
    <Field label="Quận / Huyện *" value={address.city} onChangeText={field('city')} maxLength={100} editable={!disabled} />
    <Field label="Địa chỉ nhận hàng *" value={address.streetAddress} onChangeText={field('streetAddress')} maxLength={250} editable={!disabled} placeholder="Số nhà, đường, phường/xã" multiline />
    <Field label="Mã bưu chính" value={address.zipCode || ''} onChangeText={field('zipCode')} maxLength={10} editable={!disabled} keyboardType="numeric" placeholder="Không bắt buộc" />
  </View>;
}

function AddressEntry({ preferred, user, checkout, disabled, onChange, onSaved }: { preferred?: SavedAddress; user: User; checkout: boolean; disabled: boolean; onChange?: (address: ShippingAddress | null) => void; onSaved: () => Promise<void> }) {
  const { store } = useShop();
  const [saved, setSaved] = useState(preferred);
  const [draft, setDraft] = useState<AddressInput>(preferred || emptyAddress(user));
  const [temporary, setTemporary] = useState<AddressInput>(() => emptyAddress(user, false));
  const [editing, setEditing] = useState(!preferred);
  const [mode, setMode] = useState('saved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const candidate = mode === 'temporary' ? temporary : !editing && !busy ? saved || null : null;
  useEffect(() => { onChange?.(candidate); }, [candidate, onChange]);
  async function save() {
    if (lock.current || disabled) return;
    const validation = deliveryAddressError(draft);
    if (validation) { setError(validation); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const address = await store.saveDefaultAddress(draft, saved?._id);
      if (!active.current) return;
      setSaved(address); setDraft(address); setEditing(false);
      await onSaved();
    } catch (failure) { if (active.current) setError(errorMessage(failure)); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  const blocked = disabled || busy;
  return <View style={ui.card}>
    <Text style={ui.heading}>{checkout ? 'Địa chỉ nhận hàng' : 'Địa chỉ và số điện thoại mặc định'}</Text>
    {checkout && <ChipRow>{[['saved', 'Địa chỉ mặc định'], ['temporary', 'Giao đến địa chỉ khác']].map(([value, label]) => <Chip key={value} label={label} selected={mode === value} onPress={() => { if (!blocked) { setMode(value); setError(''); } }} />)}</ChipRow>}
    {mode === 'temporary' ? <><Text style={ui.muted}>Chỉ dùng cho đơn này, giữ nguyên địa chỉ mặc định</Text><AddressFields address={temporary} onChange={setTemporary} disabled={blocked} /></> : editing ? <>
      <Text style={ui.muted}>Lưu trên tài khoản để tự điền cho lần đặt sau, dùng chung với website</Text>
      <AddressFields address={draft} onChange={setDraft} disabled={blocked} />
      <Button title="Lưu địa chỉ mặc định" loading={busy} disabled={disabled} onPress={() => { void save(); }} />
      {saved && <Button title="Hủy sửa địa chỉ" variant="secondary" disabled={blocked} onPress={() => { setDraft(saved); setEditing(false); setError(''); }} />}
    </> : saved && <>
      <Text style={ui.label}>Mặc định · {saved.label}</Text><Text style={ui.text}>{saved.fullName}</Text><Text selectable style={ui.text}>{saved.phoneNumber}</Text><Text style={ui.muted}>{deliveryAddressText(saved)}</Text>
      <Button title="Sửa địa chỉ mặc định" variant="secondary" disabled={blocked} onPress={() => { setDraft(saved); setEditing(true); setError(''); }} />
      {!checkout && <Text style={[ui.muted, { color: colors.green }]}>Thông tin này sẽ được điền sẵn khi đặt hàng</Text>}
    </>}
    {error && <ErrorCard message={error} />}
  </View>;
}

export function DeliveryAddress({ checkout = false, disabled = false, onChange }: { checkout?: boolean; disabled?: boolean; onChange?: (address: ShippingAddress | null) => void }) {
  const { session, store } = useShop();
  const token = session?.token;
  const loader = useCallback(() => token ? store.addresses() : Promise.resolve([]), [store, token]);
  const { data, loading, error, refresh } = useRemote(loader);
  if (!session) return null;
  const preferred = data?.find(address => address.isDefault) || data?.[0];
  return <View style={{ gap: 12 }}>
    {error && <ErrorCard message={error} onRetry={() => { void refresh(); }} />}
    {!data && loading ? <Loading text="Đang tải địa chỉ đã lưu" /> : data && <AddressEntry key={token + JSON.stringify(preferred || null)} preferred={preferred} user={session.user} checkout={checkout} disabled={disabled} onChange={onChange} onSaved={refresh} />}
  </View>;
}
