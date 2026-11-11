import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, Empty, ErrorCard, Loading, ProductImage, ui } from '../../components/ui';
import { money } from '../../lib/format';
import { useRemote } from '../../lib/use-remote';
import { api } from '../../state/shop';

export default function ProductsScreen() {
  const { data, loading, error, refresh } = useRemote(api.products);
  const [query, setQuery] = useState('');
  const products = useMemo(() => (data ?? []).filter((product) =>
    `${product.name} ${product.category} ${product.brand ?? ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')),
  ), [data, query]);
  return <View style={ui.screen}>
    <FlatList data={products} keyExtractor={(product) => product._id} numColumns={2}
      contentContainerStyle={ui.content} columnWrapperStyle={{ gap: 12 }}
      refreshing={loading && data !== null} onRefresh={() => { void refresh(); }}
      ListHeaderComponent={<View style={{ gap: 16, paddingBottom: 4 }}>
        <View style={[ui.card, { backgroundColor: colors.text, borderWidth: 0 }]}>
          <Text style={[ui.label, { color: '#A9C3FF' }]}>NET STORE · ANDROID</Text>
          <Text style={[ui.title, { color: colors.white }]}>Mua sắm trong tầm tay</Text>
          <Text style={{ color: '#CBD5E1', lineHeight: 21 }}>Khám phá sản phẩm từ các cửa hàng trên Net Store.</Text>
        </View>
        <TextInput accessibilityLabel="Tìm sản phẩm" placeholder="Tìm theo tên, danh mục, thương hiệu…" placeholderTextColor={colors.muted}
          value={query} onChangeText={setQuery} style={ui.input} returnKeyType="search" />
        <View style={ui.between}><Text style={ui.heading}>Sản phẩm</Text><Text style={ui.muted}>{products.length} sản phẩm</Text></View>
        {error ? <ErrorCard message={error} onRetry={() => { void refresh(); }} /> : null}
      </View>}
      ListEmptyComponent={loading ? <Loading /> : !error ? <Empty title={query ? 'Không có kết quả' : 'Chưa có sản phẩm'} message={query ? 'Thử từ khóa khác để tìm sản phẩm.' : 'Hãy thêm sản phẩm trên website rồi kéo xuống để tải lại.'} /> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${item.name}`}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item._id } })}
        style={({ pressed }) => [ui.card, { flex: 1, maxWidth: '50%', padding: 12, opacity: pressed ? 0.8 : 1 }]}>
        <View style={{ alignItems: 'center' }}><ProductImage uri={item.images?.[0]} size={120} /></View>
        <Text style={[ui.muted, { fontSize: 12 }]} numberOfLines={1}>{item.category}</Text>
        <Text style={[ui.text, { fontWeight: '700', minHeight: 46 }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[ui.price, { fontSize: 17 }]}>{money(item.price)}</Text>
        <Text style={[ui.muted, { color: item.stock > 0 ? colors.green : colors.danger }]}>{item.stock > 0 ? `Còn ${item.stock} sản phẩm` : 'Hết hàng'}</Text>
      </Pressable>} />
  </View>;
}
