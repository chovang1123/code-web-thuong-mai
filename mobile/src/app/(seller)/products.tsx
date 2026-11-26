import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';
import { Button, colors, Empty, ErrorCard, Loading, ProductImage, ui } from '../../components/ui';
import { Chip, ChipRow, Choice, Pagination } from '../../components/catalog-controls';
import { SellerProductForm } from '../../components/seller-product-form';
import { categoryDefinitions, inCategory, normalize, paginate } from '../../lib/catalog';
import { errorMessage } from '../../lib/api';
import { money } from '../../lib/format';
import { useSeller } from '../../lib/use-seller';
import type { Product } from '../../types';

export default function SellerProducts() {
  const { data, loading, error, refresh, store } = useSeller();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('all');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Product | null | undefined>();
  const [actionError, setActionError] = useState('');
  const [deleting, setDeleting] = useState('');
  const list = useRef<FlatList<Product>>(null);
  const filtered = useMemo(() => (data?.products || []).filter(product => normalize(`${product.name} ${product.brand || ''}`).includes(normalize(query)) && inCategory(product, category) && (stock === 'all' || (stock === 'low' ? product.stock <= 5 : product.stock === 0))), [data, query, category, stock]);
  const result = paginate(filtered, page, 10);
  const changePage = (value: number) => { setPage(value); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const remove = (product: Product) => Alert.alert('Xóa sản phẩm', `Xóa “${product.name}” khỏi gian hàng?`, [{ text: 'Giữ lại', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => { void (async () => {
    setDeleting(product._id); setActionError('');
    try { await store.deleteSellerProduct(product._id); await refresh(); }
    catch (failure) { setActionError(errorMessage(failure)); }
    finally { setDeleting(''); }
  })(); } }]);
  return <View style={ui.screen}><FlatList ref={list} data={result.items} keyExtractor={product => product._id} contentContainerStyle={ui.content}
    refreshing={loading && !!data} onRefresh={() => { void refresh(); }}
    ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 16 }}>
      <Text style={ui.label}>{data?.shop.name || 'Kênh người bán'}</Text><Text style={ui.title}>Sản phẩm của gian hàng</Text>
      <Button title="Thêm sản phẩm" onPress={() => { setActionError(''); setDialog(null); }} />
      <TextInput accessibilityLabel="Tìm sản phẩm của shop" value={query} onChangeText={value => { setQuery(value); setPage(1); }} placeholder="Tìm tên sản phẩm hoặc thương hiệu" placeholderTextColor={colors.muted} style={ui.input} />
      <Choice label="Lọc danh mục" value={category} options={[{ value: '', label: 'Tất cả danh mục' }, ...categoryDefinitions.map(node => ({ value: node.slug, label: node.name }))]} onChange={value => { setCategory(value); setPage(1); }} />
      <ChipRow>{[['all', 'Tất cả'], ['low', 'Sắp hết hàng'], ['out', 'Hết hàng']].map(([value, label]) => <Chip key={value} label={label} selected={stock === value} onPress={() => { setStock(value); setPage(1); }} />)}</ChipRow>
      <Text style={ui.muted}>{filtered.length} sản phẩm · 10 sản phẩm mỗi trang</Text>
      {!!(error || actionError) && <ErrorCard message={actionError || error} onRetry={() => { setActionError(''); void refresh(); }} />}
    </View>}
    ListEmptyComponent={loading && !data ? <Loading /> : <Empty title="Chưa có sản phẩm phù hợp" message="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới" />}
    renderItem={({ item }) => <View style={ui.card}>
      <View style={ui.row}><ProductImage uri={item.images[0]} size={64} /><View style={{ flex: 1, gap: 4 }}><Text style={ui.text} numberOfLines={2}>{item.name}</Text><Text style={ui.muted}>{item.category}</Text><Text style={[ui.price, { fontSize: 18 }]}>{money(item.price)}</Text></View></View>
      <View style={ui.between}><Text style={[ui.muted, { color: item.stock <= 5 ? colors.danger : colors.muted }]}>Tồn kho: {item.stock}</Text><View style={ui.row}><Button title="Chỉnh sửa" variant="secondary" disabled={!!deleting} onPress={() => setDialog(item)} /><Button title="Xóa" variant="danger" loading={deleting === item._id} disabled={!!deleting} onPress={() => remove(item)} /></View></View>
    </View>}
    ListFooterComponent={<Pagination {...result} onChange={changePage} />} />
    {dialog !== undefined && <SellerProductForm product={dialog} onClose={() => setDialog(undefined)} onSaved={refresh} />}
  </View>;
}
