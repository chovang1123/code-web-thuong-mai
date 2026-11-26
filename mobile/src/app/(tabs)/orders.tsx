import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { SignInPrompt } from '../../components/sign-in-prompt';
import { colors, Empty, ErrorCard, Loading, ui } from '../../components/ui';
import { Chip, ChipRow, Pagination } from '../../components/catalog-controls';
import { OrderSummary, orderLabel } from '../../components/order-summary';
import { normalize, paginate } from '../../lib/catalog';
import { useRemote } from '../../lib/use-remote';
import { useShop } from '../../state/shop';
import type { Order } from '../../types';

export default function OrdersScreen() {
  const { session, store } = useShop();
  const loader = useCallback(() => session ? store.orders() : Promise.resolve([] as Order[]), [session, store]);
  const { data, loading, error, refresh } = useRemote(loader);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const list = useRef<FlatList<Order>>(null);
  const filtered = useMemo(() => (data || []).filter(order => (stage === 'Tất cả' || orderLabel(order) === stage) && normalize(`${order._id} ${order.orderItems.map(item => item.name).join(' ')}`).includes(normalize(query))), [data, query, stage]);
  const result = paginate(filtered, page, 10);
  if (!session) return <View style={[ui.screen, ui.content]}><SignInPrompt /></View>;
  return <View style={ui.screen}><FlatList ref={list} data={result.items} keyExtractor={order => order._id} contentContainerStyle={ui.content} refreshing={loading && data !== null} onRefresh={() => { void refresh(); }}
    ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 16 }}><Text style={ui.title}>Đơn hàng của tôi</Text><Text style={ui.muted}>Theo dõi đơn đã đặt trên app và website</Text>
      <TextInput accessibilityLabel="Tìm đơn hàng" placeholder="Mã đơn hoặc tên sản phẩm" placeholderTextColor={colors.muted} value={query} onChangeText={value => { setQuery(value); setPage(1); }} style={ui.input} />
      <ChipRow>{['Tất cả', 'Chờ thanh toán', 'Chờ xác nhận', 'Đã xác nhận', 'Đang vận chuyển', 'Đã giao hàng', 'Đã hủy'].map(value => <Chip key={value} label={value} selected={stage === value} onPress={() => { setStage(value); setPage(1); }} />)}</ChipRow>
      {error && <ErrorCard message={error} onRetry={() => { void refresh(); }} />}
    </View>}
    ListEmptyComponent={loading ? <Loading /> : !error ? <Empty title="Chưa có đơn hàng" message="Đơn hàng phù hợp sẽ xuất hiện tại đây" /> : null}
    renderItem={({ item }) => <OrderSummary order={item} />}
    ListFooterComponent={<Pagination {...result} onChange={value => { setPage(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} />} /></View>;
}
