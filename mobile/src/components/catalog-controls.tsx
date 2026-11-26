import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, ui, ProductImage } from './ui';
import { discount, normalize, paginate } from '../lib/catalog';
import { money } from '../lib/format';
import type { Product } from '../types';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
    style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: selected ? colors.green : colors.border, backgroundColor: selected ? colors.accentSoft : colors.white }}>
    <Text style={{ color: selected ? colors.green : colors.text, fontSize: 13, fontWeight: selected ? '600' : '400' }}>{label}</Text>
  </Pressable>;
}
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>{children}</ScrollView>;
}
export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  if (!total) return null;
  return <View style={[ui.between, { paddingVertical: 16 }]} accessibilityLabel="Phân trang">
    <Pressable accessibilityRole="button" accessibilityLabel="Trang trước" accessibilityState={{ disabled: page <= 1 }} disabled={page <= 1} onPress={() => onChange(page - 1)} style={{ padding: 12, opacity: page <= 1 ? 0.35 : 1 }}><Ionicons name="chevron-back-outline" size={20} color={colors.text} /></Pressable>
    <Text style={ui.muted} accessibilityLiveRegion="polite">Trang {page} / {pages} · {total} kết quả</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Trang sau" accessibilityState={{ disabled: page >= pages }} disabled={page >= pages} onPress={() => onChange(page + 1)} style={{ padding: 12, opacity: page >= pages ? 0.35 : 1 }}><Ionicons name="chevron-forward-outline" size={20} color={colors.text} /></Pressable>
  </View>;
}
export function Choice({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const selected = options.find(option => option.value === value);
  const results = paginate(options.filter(option => normalize(option.label).includes(normalize(query))), page, 10);
  return <View style={{ gap: 8 }}><Text style={ui.muted}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { setOpen(true); setQuery(''); setPage(1); }} style={[ui.input, ui.between]}><Text style={[ui.text, { flex: 1 }]} numberOfLines={1}>{selected?.label || 'Chọn'}</Text><Ionicons name="chevron-down-outline" size={18} color={colors.muted} /></Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><SafeAreaView style={[ui.screen, { padding: 16 }]}>
      <View style={ui.between}><Text style={ui.heading}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Đóng ${label}`} onPress={() => setOpen(false)} style={{ padding: 12 }}><Ionicons name="close-outline" size={24} color={colors.text} /></Pressable></View>
      <TextInput accessibilityLabel={`Tìm ${label}`} placeholder="Tìm kiếm" value={query} onChangeText={text => { setQuery(text); setPage(1); }} style={ui.input} />
      <FlatList data={results.items} keyExtractor={item => item.value} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: value === item.value }} onPress={() => { onChange(item.value); setOpen(false); }} style={[ui.between, { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border }]}><Text style={[ui.text, { flex: 1 }]}>{item.label}</Text>{value === item.value && <Ionicons name="checkmark-outline" size={20} color={colors.green} />}</Pressable>}
        ListEmptyComponent={<Text style={[ui.muted, { padding: 16 }]}>Không có lựa chọn phù hợp</Text>}
        ListFooterComponent={<Pagination {...results} onChange={setPage} />} />
    </SafeAreaView></Modal>
  </View>;
}
export function ProductTile({ product, width }: { product: Product; width: number }) {
  const off = discount(product);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${product.name}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product._id } })}
    style={({ pressed }) => [ui.card, { width, padding: 12, gap: 8, opacity: pressed ? 0.75 : 1 }]}>
    <View style={{ alignItems: 'center' }}><ProductImage uri={product.images?.[0]} size={Math.max(80, width - 32)} /></View>
    <Text style={ui.label} numberOfLines={1}>{product.category}</Text>
    <Text style={[ui.text, { minHeight: 44, lineHeight: 22, fontWeight: '500' }]} numberOfLines={2}>{product.name}</Text>
    <Text style={[ui.price, { fontSize: 17, color: colors.danger }]}>{money(product.price)}</Text>
    {off > 0 && <Text style={{ color: colors.danger, fontSize: 12 }}>Giảm {off}%</Text>}
    <Text style={ui.muted} numberOfLines={1}>{product.sellerName || (product.stock > 0 ? 'Còn hàng' : 'Hết hàng')}</Text>
  </Pressable>;
}
