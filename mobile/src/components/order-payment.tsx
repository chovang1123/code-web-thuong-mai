import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { openMobilePayment } from '../lib/payment';
import { useShop } from '../state/shop';
import { errorMessage } from '../lib/api';
import type { Order } from '../types';
import { Button, ErrorCard, ui } from './ui';

const labels: Record<string, string> = {
  unpaid: 'Chưa thanh toán', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', expired: 'Hết hạn thanh toán',
  failed: 'Thanh toán thất bại', needs_review: 'Đã nhận tiền, chờ đối soát',
};

export function OrderPayment({ order }: { order: Order }) {
  const { store } = useShop();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const end = Date.parse(order.expiresAt || '');
    if (!Number.isFinite(end)) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, end - Date.now()));
    return () => clearTimeout(timer);
  }, [order.expiresAt]);
  if (!order.paymentMethod || order.paymentMethod === 'cod') return order.paymentStatus ? <Text style={ui.text}>COD · {labels[order.paymentStatus] ?? order.paymentStatus}</Text> : null;
  const status = order.paymentStatus ?? order.paymentResult?.status ?? 'unpaid';
  async function open() {
    setBusy(true);
    setError('');
    try {
      await openMobilePayment(store, order._id);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <View><Text style={ui.text}>{order.paymentMethod.toUpperCase()} · {labels[status] ?? status}</Text>
    {['pending', 'unpaid', 'failed'].includes(status) && order.orderStatus === 'pending' && Date.parse(order.expiresAt || '') > now && <Button title="Mở cổng thanh toán" loading={busy} onPress={() => { void open(); }} />}
    {error ? <ErrorCard message={error} /> : null}
  </View>;
}
