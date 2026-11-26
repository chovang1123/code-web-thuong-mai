import { useMemo, useRef, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { colors, Empty, ErrorCard, Loading, ui } from '../../components/ui';
import { Chip, ChipRow, Pagination } from '../../components/catalog-controls';
import { OrderSummary, orderLabel } from '../../components/order-summary';
import { normalize, paginate } from '../../lib/catalog';
import { errorMessage } from '../../lib/api';
import { useSeller } from '../../lib/use-seller';
import type { Order } from '../../types';

export default function SellerOrders() {
  const { data, loading, error, refresh, store } = useSeller();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const list = useRef<FlatList<Order>>(null);
  const filtered = useMemo(() => (data?.orders || []).filter(order => (stage === 'Tất cả' || orderLabel(order, true) === stage) && normalize(`${order._id} ${order.shippingAddress?.fullName || ''} ${order.orderItems.map(item => item.name).join(' ')}`).includes(normalize(query))), [data, query, stage]);
  const result = paginate(filtered, page, 10);
  async function advance(order: Order, status: 'shipped' | 'delivered') {
    setBusy(order._id); setActionError('');
    try { await store.updateSellerOrder(order._id, status); await refresh(); }
    catch (failure) { setActionError(errorMessage(failure)); }
    finally { setBusy(''); }
  }
  return <View style={ui.screen}><FlatList ref={list} data={result.items} keyExtractor={order => order._id} contentContainerStyle={ui.content} refreshing={loading && !!data} onRefresh={() => { void refresh(); }}
    ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 16 }}><Text style={ui.label}>{data?.shop.name || 'Kênh người bán'}</Text><Text style={ui.title}>Đơn hàng của gian hàng</Text>
      <TextInput accessibilityLabel="Tìm đơn hàng của shop" placeholder="Mã đơn, sản phẩm hoặc người nhận" placeholderTextColor={colors.muted} style={ui.input} value={query} onChangeText={value => { setQuery(value); setPage(1); }} />
      <ChipRow>{['Tất cả', 'Chờ thanh toán', 'Chờ xử lý', 'Đang giao', 'Đã giao', 'Đã hủy'].map(value => <Chip key={value} label={value} selected={stage === value} onPress={() => { setStage(value); setPage(1); }} />)}</ChipRow>
      <Text style={ui.muted}>{filtered.length} đơn hàng · 10 đơn mỗi trang</Text>{!!(error || actionError) && <ErrorCard message={actionError || error} onRetry={() => { setActionError(''); void refresh(); }} />}
    </View>}
    ListEmptyComponent={loading && !data ? <Loading /> : <Empty title="Không có đơn phù hợp" message="Thử thay đổi từ khóa hoặc trạng thái" />}
    renderItem={({ item }) => <OrderSummary order={item} seller busy={busy === item._id} onAdvance={status => { if (!busy) void advance(item, status); }} />}
    ListFooterComponent={<Pagination {...result} onChange={value => { setPage(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} />} /></View>;
}
