import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, colors, Empty, ErrorCard, Loading, ProductImage, ui } from '../../components/ui';
import { money } from '../../lib/format';
import { useSeller } from '../../lib/use-seller';

export default function SellerOverview() {
  const { data, loading, error, refresh } = useSeller();
  const max = Math.max(1, ...(data?.chart || []).map(month => month.revenue));
  const lowStock = (data?.products || []).filter(product => product.stock <= 5);
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => { void refresh(); }} tintColor={colors.green} />}>
    {error && <ErrorCard message={error} onRetry={() => { void refresh(); }} />}
    {!data && loading ? <Loading /> : data && <>
      <View style={{ gap: 4 }}><Text style={ui.label}>Tổng quan gian hàng</Text><Text style={ui.title}>{data.shop.name}</Text><Text style={ui.muted}>{data.shop.location}</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[['Doanh thu', money(data.stats.revenue)], ['Đơn hàng', String(data.stats.orders)], ['Sản phẩm', String(data.stats.products)], ['Sắp hết hàng', String(data.stats.lowStock)]].map(([label, value]) => <View key={label} style={[ui.card, { width: '48%', flexGrow: 1, gap: 8 }]}><Text style={ui.muted}>{label}</Text><Text style={[ui.price, { fontSize: label === 'Doanh thu' ? 19 : 28 }]} numberOfLines={1}>{value}</Text></View>)}
      </View>
      <View style={ui.card}><Text style={ui.heading}>Doanh thu 6 tháng</Text><View style={{ height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        {data.chart.map((month, index) => <View key={month.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}><View accessibilityLabel={`${month.label}: ${money(month.revenue)}`} style={{ width: '60%', minHeight: 4, height: Math.max(4, month.revenue / max * 112), backgroundColor: index === data.chart.length - 1 ? colors.green : colors.border, borderRadius: 2 }} /><Text style={[ui.muted, { fontSize: 11 }]} numberOfLines={1}>{month.label}</Text></View>)}
      </View><Text style={ui.muted}>Doanh thu tính theo đơn hợp lệ và trạng thái thanh toán hiện tại</Text></View>
      <View style={ui.card}><Text style={ui.heading}>Cần bổ sung hàng</Text>{!lowStock.length ? <Text style={ui.muted}>Kho hàng đang ổn định</Text> : lowStock.slice(0, 3).map(product => <View key={product._id} style={ui.row}><ProductImage uri={product.images[0]} size={48} /><View style={{ flex: 1 }}><Text style={ui.text} numberOfLines={1}>{product.name}</Text><Text style={ui.muted}>{product.category}</Text></View><Text style={ui.text}>{product.stock} còn</Text></View>)}<Button title="Quản lý sản phẩm" variant="secondary" onPress={() => router.push('/(seller)/products')} /></View>
      <View style={ui.card}><Text style={ui.heading}>Đơn hàng gần đây</Text>{data.orders.length ? data.orders.slice(0, 3).map(order => <View key={order._id} style={ui.between}><View style={{ flex: 1 }}><Text style={ui.text}>#{order._id.slice(-8).toUpperCase()}</Text><Text style={ui.muted} numberOfLines={1}>{order.orderItems[0]?.name}</Text></View><Text style={ui.text}>{money(order.sellerTotal || 0)}</Text></View>) : <Empty title="Chưa có đơn hàng" message="Đơn có sản phẩm của bạn sẽ xuất hiện tại đây" />}<Button title="Xem đơn hàng" variant="secondary" onPress={() => router.push('/(seller)/orders')} /></View>
    </>}
  </ScrollView>;
}
