import { useCallback, useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors, Empty, ErrorCard, FormScreen, Loading, ui } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useShop } from '../state/shop';
import type { Order } from '../types';

export default function PaymentResultScreen() {
  const { orderId, result } = useLocalSearchParams<{ orderId: string; result?: string }>();
  const { session, store } = useShop();
  const [snapshot, setSnapshot] = useState<{ orderId: string; token: string; value: Pick<Order, 'paymentStatus' | 'orderStatus'> | null; error: string } | null>(null);
  const current = snapshot?.orderId === orderId && snapshot.token === session?.token ? snapshot : null;
  const status = current?.value;
  const error = current?.error || '';
  const [checking, setChecking] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!orderId || !session) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const read = async (attempt: number) => {
      try {
        const data = await store.orderStatus(orderId);
        if (!active) return;
        setSnapshot({ orderId, token: session.token, value: data, error: '' });
        if (data.paymentStatus === 'unpaid' && data.orderStatus === 'pending' && attempt < 12) timer = setTimeout(() => { void read(attempt + 1); }, 2500);
        else setChecking(false);
      } catch (failure) { if (active) { setSnapshot({ orderId, token: session.token, value: null, error: errorMessage(failure) }); setChecking(false); } }
    };
    void read(0);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { setChecking(true); clearTimeout(timer); void read(0); } });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, [orderId, session, store, retry]);
  const checkAgain = useCallback(() => { setChecking(true); setRetry(value => value + 1); }, []);
  const paid = status?.paymentStatus === 'paid';
  const failed = status?.paymentStatus === 'failed' || result === 'failed';
  const cancelled = result === 'cancelled' || status?.orderStatus === 'cancelled';
  const reading = checking || !current;
  if (!orderId) return <FormScreen><Empty title="Không tìm thấy mã đơn" message="Mở đơn hàng cần kiểm tra từ danh sách của bạn"><Button title="Xem đơn hàng" onPress={() => router.replace('/(tabs)/orders')} /></Empty></FormScreen>;
  return <FormScreen><View style={ui.card}>
    <Text style={ui.label}>Kết quả thanh toán</Text>
    <Text style={ui.title}>{paid ? 'Đặt hàng thành công' : cancelled ? 'Thanh toán đã hủy' : failed ? 'Thanh toán chưa thành công' : 'Đang xác nhận thanh toán'}</Text>
    <Text style={ui.muted}>{paid ? 'Đã nhận xác nhận thanh toán. Shop có thể xử lý đơn hàng của bạn.' : 'Đơn chỉ được xác nhận sau khi hệ thống nhận kết quả thanh toán từ VNPay.'}</Text>
    {!!orderId && <Text style={ui.text}>Đơn #{orderId.slice(-8).toUpperCase()}</Text>}
    {reading && session && !paid ? <Loading text="Đang kiểm tra kết quả" /> : null}
    {!session && <Text style={ui.muted}>Đăng nhập tài khoản đã đặt đơn để xem kết quả</Text>}
    {error && <ErrorCard message={error} onRetry={checkAgain} />}
    {!reading && !paid && !failed && !cancelled && <Text style={[ui.text, { color: colors.green }]}>Chưa nhận được xác nhận. Bạn có thể kiểm tra lại trong Đơn hàng.</Text>}
    {!session ? <Button title="Đăng nhập" onPress={() => router.push('/login')} /> : !paid && <Button title="Kiểm tra lại" loading={reading} onPress={checkAgain} />}
    <Button title="Xem đơn hàng" onPress={() => router.replace('/(tabs)/orders')} />
    <Button title="Tiếp tục mua sắm" variant="secondary" onPress={() => router.replace('/(tabs)')} />
  </View></FormScreen>;
}
