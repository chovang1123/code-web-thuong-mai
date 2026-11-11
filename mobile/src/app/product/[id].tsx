import { useCallback, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, colors, ErrorCard, Loading, ProductImage, ui } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { money } from '../../lib/format';
import { useRemote } from '../../lib/use-remote';
import { api, useShop } from '../../state/shop';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loader = useCallback(() => api.product(id), [id]);
  const { data: product, loading, error, refresh } = useRemote(loader);
  const { session, cartBusy, store } = useShop();
  const [actionError, setActionError] = useState('');
  const [added, setAdded] = useState(false);
  const { width } = useWindowDimensions();

  async function add() {
    if (!session) { router.push('/login'); return; }
    if (!product) return;
    setActionError('');
    setAdded(false);
    try { await store.changeQuantity(product._id, 1); setAdded(true); }
    catch (failure) { setActionError(errorMessage(failure)); }
  }

  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
    {error ? <ErrorCard message={error} onRetry={() => { void refresh(); }} /> : null}
    {loading && !product ? <Loading /> : product && <>
      <View style={[ui.card, { alignItems: 'center' }]}><ProductImage uri={product.images?.[0]} size={Math.min(width - 80, 300)} /></View>
      <View style={ui.card}>
        <Text style={ui.label}>{product.category}</Text><Text style={ui.title}>{product.name}</Text>
        <Text style={ui.price}>{money(product.price)}</Text>
        <Text style={[ui.text, { color: product.stock ? colors.green : colors.danger }]}>{product.stock ? `Còn ${product.stock} sản phẩm` : 'Sản phẩm đã hết hàng'}</Text>
        {product.brand ? <Text style={ui.muted}>Thương hiệu: {product.brand}</Text> : null}
        {product.sellerName ? <Text style={ui.muted}>Cửa hàng: {product.sellerName}</Text> : null}
      </View>
      <View style={ui.card}><Text style={ui.heading}>Mô tả sản phẩm</Text><Text style={ui.text}>{product.description}</Text></View>
      {actionError ? <ErrorCard message={actionError} /> : null}
      {added ? <Text accessibilityLiveRegion="polite" style={[ui.text, { color: colors.green }]}>Đã thêm vào giỏ hàng.</Text> : null}
      <Button title={session ? 'Thêm vào giỏ hàng' : 'Đăng nhập để mua'} onPress={() => { void add(); }} disabled={!product.stock || cartBusy} />
      <Button title="Xem giỏ hàng" variant="secondary" onPress={() => router.push('/(tabs)/cart')} />
    </>}
  </ScrollView>;
}
