import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, Empty, ErrorCard, Field, Loading, ui } from '../../components/ui';
import { Chip, ChipRow, Choice, Pagination, ProductTile } from '../../components/catalog-controls';
import { categoryTree, emptyFilters, filterCatalog, filterFields, homeShelves, paginate, resolveCategory, type CatalogFilters } from '../../lib/catalog';
import { useRemote } from '../../lib/use-remote';
import { api } from '../../state/shop';
import type { Product } from '../../types';

export default function ProductsScreen() {
  const { data, loading, error, refresh } = useRemote(api.products);
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [showFilters, setShowFilters] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [page, setPage] = useState(1);
  const list = useRef<FlatList<Product>>(null);
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - 44) / 2);
  const products = data ?? [];
  const tree = useMemo(() => categoryTree(data ?? []), [data]);
  const visible = useMemo(() => filterCatalog(data ?? [], filters), [data, filters]);
  const shelves = useMemo(() => homeShelves(data ?? []), [data]);
  const selected = resolveCategory(filters.category);
  const root = tree.find(node => node.slug === (selected?.parentSlug || selected?.slug));
  const facets = filterFields(filters.category);
  const listing = browse || Object.entries(filters).some(([key, value]) => key !== 'sort' && value !== '' && value !== false);
  const result = paginate(visible, page);
  const change = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setFilters(current => key === 'category' ? { ...current, category: String(value), collection: '', brand: '', gender: '', os: '' } : { ...current, [key]: value });
    setPage(1);
  };
  const selectCategory = (category: string) => { change('category', category); setBrowse(Boolean(category)); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const header = <View style={{ gap: 16, marginBottom: 16 }}>
    <View style={ui.between}><View style={{ flex: 1, gap: 4 }}><Text style={ui.label}>Net Store</Text><Text style={ui.title}>{selected?.name || (listing ? 'Tìm sản phẩm' : 'Chọn món hợp ý')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Bộ lọc" onPress={() => { setShowFilters(!showFilters); setBrowse(true); }} style={{ padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}><Ionicons name="options-outline" size={20} color={colors.text} /></Pressable></View>
    <View style={[ui.input, ui.row]}><Ionicons name="search-outline" size={18} color={colors.muted} /><TextInput accessibilityLabel="Tìm sản phẩm" placeholder="Tên sản phẩm, thương hiệu hoặc shop" placeholderTextColor={colors.muted} value={filters.query} onChangeText={value => change('query', value)} style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }} returnKeyType="search" />{filters.query !== '' && <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => change('query', '')}><Ionicons name="close-outline" size={20} color={colors.muted} /></Pressable>}</View>
    <ChipRow><Chip label="Tất cả" selected={!filters.category} onPress={() => { setFilters({ ...emptyFilters }); setBrowse(false); setPage(1); }} />{tree.map(category => <Chip key={category.slug} label={category.name} selected={root?.slug === category.slug} onPress={() => selectCategory(category.slug)} />)}</ChipRow>
    {root && root.children.length > 0 && <ChipRow><Chip label={`Tất cả ${root.name}`} selected={filters.category === root.slug} onPress={() => selectCategory(root.slug)} />{root.children.map(category => <Chip key={category.slug} label={category.name} selected={filters.category === category.slug} onPress={() => selectCategory(category.slug)} />)}</ChipRow>}
    {showFilters && <View style={ui.card}>
      <View style={ui.row}><View style={{ flex: 1 }}><Field label="Giá từ" keyboardType="numeric" value={filters.min} onChangeText={value => change('min', value)} placeholder="0" /></View><View style={{ flex: 1 }}><Field label="Giá đến" keyboardType="numeric" value={filters.max} onChangeText={value => change('max', value)} placeholder="Không giới hạn" /></View></View>
      <Choice label="Sắp xếp" value={filters.sort} options={[{ value: 'newest', label: 'Mới nhất' }, { value: 'price-asc', label: 'Giá tăng dần' }, { value: 'price-desc', label: 'Giá giảm dần' }, { value: 'popular', label: 'Bán chạy' }]} onChange={value => change('sort', value)} />
      {facets.brand && <Choice label="Thương hiệu" value={filters.brand} options={[{ value: '', label: 'Tất cả thương hiệu' }, ...[...new Set(products.map(product => product.brand).filter((brand): brand is string => Boolean(brand)))].map(brand => ({ value: brand, label: brand }))]} onChange={value => change('brand', value)} />}
      {facets.gender && <Choice label="Giới tính" value={filters.gender} options={[{ value: '', label: 'Tất cả' }, { value: 'nam', label: 'Nam' }, { value: 'nu', label: 'Nữ' }, { value: 'unisex', label: 'Unisex' }]} onChange={value => change('gender', value)} />}
      {facets.os && <Choice label="Hệ điều hành" value={filters.os} options={[{ value: '', label: 'Tất cả' }, { value: 'ios', label: 'iOS / iPadOS' }, { value: 'android', label: 'Android' }]} onChange={value => change('os', value)} />}
      <View style={ui.between}><Chip label="Chỉ còn hàng" selected={filters.stock} onPress={() => change('stock', !filters.stock)} /><Pressable accessibilityRole="button" onPress={() => { setFilters({ ...emptyFilters }); setPage(1); }}><Text style={[ui.text, { color: colors.green }]}>Xóa bộ lọc</Text></Pressable></View>
    </View>}
    {error && <ErrorCard message={error} onRetry={() => { void refresh(); }} />}
    {listing && <Text style={ui.muted}>{visible.length} sản phẩm · 12 sản phẩm mỗi trang</Text>}
  </View>;
  const empty = loading && !data ? <Loading /> : !error ? <Empty title={listing ? 'Không có kết quả' : 'Chưa có sản phẩm'} message={listing ? 'Thử từ khóa hoặc danh mục khác' : 'Quay lại sau để xem các sản phẩm mới'} /> : null;
  const home = !products.length ? empty : <>
      <View style={[ui.between, { paddingBottom: 8 }]}><Text style={ui.muted}>{products.length} sản phẩm từ các gian hàng</Text><Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả sản phẩm" onPress={() => { setBrowse(true); setPage(1); }}><Text style={{ color: colors.green, fontSize: 13, fontWeight: '500' }}>Xem tất cả</Text></Pressable></View>
      {shelves.map(shelf => <View key={shelf.id} style={{ gap: 12, marginBottom: 16 }}>
        <View style={ui.between}><Text style={[ui.heading, { flex: 1 }]}>{shelf.title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Xem tất cả ${shelf.title}`} onPress={() => { setBrowse(true); setFilters({ ...emptyFilters, category: shelf.category || '', collection: ['weekly', 'discounts'].includes(shelf.id) ? shelf.id : '' }); setPage(1); list.current?.scrollToOffset({ offset: 0, animated: false }); }} style={{ paddingVertical: 8 }}><Text style={{ color: colors.green, fontSize: 13 }}>Xem tất cả</Text></Pressable></View>
        <FlatList horizontal data={shelf.products} keyExtractor={product => product._id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} renderItem={({ item }) => <ProductTile product={item} width={Math.min(tileWidth, 180)} />} />
      </View>)}
    </>;
  return <View style={ui.screen}><FlatList ref={list} data={listing ? result.items : []} keyExtractor={product => product._id} numColumns={2} contentContainerStyle={ui.content} columnWrapperStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled"
    refreshing={loading && data !== null} onRefresh={() => { void refresh(); }} ListHeaderComponent={<View>{header}{!listing && home}</View>} ListEmptyComponent={listing ? empty : null}
    renderItem={({ item }) => <ProductTile product={item} width={tileWidth} />}
    ListFooterComponent={listing ? <Pagination {...result} onChange={value => { setPage(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} /> : null} /></View>;
}
