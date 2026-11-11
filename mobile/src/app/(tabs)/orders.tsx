import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SignInPrompt } from '../../components/sign-in-prompt';
import { Button, colors, Empty, ErrorCard, Loading, ui } from '../../components/ui';
import { dateTime, money, orderStatuses } from '../../lib/format';
import { useRemote } from '../../lib/use-remote';
import { useShop } from '../../state/shop';
import type { Order } from '../../types';

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={ui.card}>
    <View style={ui.between}><Text style={ui.heading}>#{order._id.slice(-8).toUpperCase()}</Text><Text style={{ color: colors.primary, fontWeight: '700' }}>{orderStatuses[order.status] ?? order.status}</Text></View>
    <Text style={ui.muted}>{dateTime(order.createdAt)}</Text>
    <Text style={ui.text}>{order.orderItems.map((item) => `${item.name} × ${item.quantity}`).join('\n')}</Text>
    <Text style={ui.price}>{money(order.totalPrice)}</Text>
    <Button title={expanded ? 'Thu gọn' : 'Xem chi tiết'} variant="secondary" onPress={() => setExpanded(!expanded)} />
    {expanded ? <View style={{ gap: 8 }}>
      <Text selectable style={ui.muted}>Mã đơn đầy đủ: {order._id}</Text>
      <Text style={ui.heading}>Giao đến</Text>
      <Text style={ui.text}>{order.shippingAddress.fullName} · {order.shippingAddress.phoneNumber}</Text>
      <Text style={ui.text}>{order.shippingAddress.streetAddress}, {order.shippingAddress.city}</Text>
      {order.orderItems.map((item, index) => <Text key={item._id ?? index} style={ui.muted}>{item.name}: {money(item.price)} × {item.quantity}</Text>)}
    </View> : null}
  </View>;
}

export default function OrdersScreen() {
  const { session, store } = useShop();
  const loader = useCallback(() => session ? store.orders() : Promise.resolve([] as Order[]), [session, store]);
  const { data, loading, error, refresh } = useRemote(loader);
  if (!session) return <View style={[ui.screen, ui.content]}><SignInPrompt /></View>;
  return <View style={ui.screen}>
    <FlatList data={data ?? []} keyExtractor={(order) => order._id} contentContainerStyle={ui.content}
      refreshing={loading && data !== null} onRefresh={() => { void refresh(); }}
      ListHeaderComponent={<View style={{ gap: 14 }}><Text style={ui.title}>Đơn hàng của tôi</Text><Text style={ui.muted}>Kéo xuống để cập nhật trạng thái từ website.</Text>{error ? <ErrorCard message={error} onRetry={() => { void refresh(); }} /> : null}</View>}
      ListEmptyComponent={loading ? <Loading /> : !error ? <Empty title="Chưa có đơn hàng" message="Đơn hàng đã đặt trên website và app sẽ xuất hiện tại đây." /> : null}
      renderItem={({ item }) => <OrderCard order={item} />} />
  </View>;
}
