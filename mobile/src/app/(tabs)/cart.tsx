import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SignInPrompt } from '../../components/sign-in-prompt';
import { Button, Empty, ErrorCard, Loading, ProductImage, ui } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { cartTotal, money } from '../../lib/format';
import { useShop } from '../../state/shop';

export default function CartScreen() {
  const { session, cart, cartBusy, cartLoaded, cartError, store } = useShop();
  const [actionError, setActionError] = useState('');
  useFocusEffect(useCallback(() => {
    setActionError('');
    if (session?.token) void store.refreshCart().catch(() => {});
  }, [store, session?.token]));

  async function change(id: string, delta: number | 'remove') {
    setActionError('');
    try { await store.changeQuantity(id, delta); }
    catch (failure) { setActionError(errorMessage(failure)); }
  }

  if (!session) return <ScrollView style={ui.screen} contentContainerStyle={ui.content}><SignInPrompt /></ScrollView>;

  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}
    refreshControl={<RefreshControl refreshing={cartBusy} onRefresh={() => { void store.refreshCart().catch(() => {}); }} />}>
    <Text style={ui.title}>Giỏ hàng của bạn</Text>
    <Text style={ui.muted}>Giỏ hàng dùng chung với website. Kéo xuống để lấy dữ liệu mới nhất.</Text>
    {cartError || actionError ? <ErrorCard message={actionError || cartError} onRetry={() => { setActionError(''); void store.refreshCart().catch(() => {}); }} /> : null}
    {!cartLoaded && cartBusy ? <Loading /> : null}
    {cartLoaded && !cart.length ? <Empty title="Giỏ hàng đang trống" message="Chọn sản phẩm bạn muốn mua để bắt đầu."><Button title="Khám phá sản phẩm" onPress={() => router.push('/(tabs)')} /></Empty> : null}
    {cart.map((item, index) => item.product ? <View key={item.product._id} style={ui.card}>
      <View style={ui.row}><ProductImage uri={item.product.images?.[0]} size={70} />
        <View style={{ flex: 1, gap: 5 }}><Text style={ui.heading}>{item.product.name}</Text><Text style={ui.price}>{money(item.product.price)}</Text></View>
      </View>
      <View style={ui.between}>
        <View style={ui.row}>
          <Button title="−" accessibilityLabel={`Giảm số lượng ${item.product.name}`} variant="secondary" disabled={cartBusy || item.quantity <= 1} onPress={() => { void change(item.product!._id, -1); }} />
          <Text accessibilityLabel={`Số lượng ${item.product.name}: ${item.quantity}`} style={ui.heading}>{item.quantity}</Text>
          <Button title="+" accessibilityLabel={`Tăng số lượng ${item.product.name}`} variant="secondary" disabled={cartBusy || item.quantity >= item.product.stock} onPress={() => { void change(item.product!._id, 1); }} />
        </View>
        <Button title="Xóa" accessibilityLabel={`Xóa ${item.product.name}`} variant="danger" disabled={cartBusy} onPress={() => { void change(item.product!._id, 'remove'); }} />
      </View>
      {item.quantity > item.product.stock ? <Text style={ui.muted}>Tồn kho đã thay đổi. Vui lòng giảm số lượng trước khi đặt hàng.</Text> : null}
    </View> : <ErrorCard key={`unavailable-${index}`} message="Sản phẩm đã bị xóa khỏi cửa hàng. Vui lòng xử lý sản phẩm này trong giỏ hàng trên website rồi tải lại." />)}
    {cart.length > 0 ? <View style={ui.card}>
      <View style={ui.between}><Text style={ui.text}>Tạm tính</Text><Text style={ui.price}>{money(cartTotal(cart))}</Text></View>
      <Text style={ui.muted}>Giá và tồn kho sẽ được máy chủ kiểm tra khi xác nhận đơn.</Text>
      <Button title="Tiến hành đặt hàng" disabled={cartBusy || !cartLoaded || cart.some((item) => !item.product || item.quantity > item.product.stock)} onPress={() => router.push('/checkout')} />
    </View> : null}
  </ScrollView>;
}
