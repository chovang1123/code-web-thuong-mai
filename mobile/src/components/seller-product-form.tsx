import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, colors, ErrorCard, Field, ProductImage, ui } from './ui';
import { Choice } from './catalog-controls';
import { categoryDefinitions, filterFields } from '../lib/catalog';
import { errorMessage } from '../lib/api';
import { useShop } from '../state/shop';
import type { LocalImage, Product, UploadedImage } from '../types';

export function SellerProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { store } = useShop();
  const [form, setForm] = useState({ name: product?.name || '', description: product?.description || '', category: product?.category || '', tags: (product?.tags || []).join(', '), brand: product?.brand || '', gender: product?.gender || '', os: product?.os || '', price: product ? String(product.price) : '', stock: product ? String(product.stock) : '' });
  const [image, setImage] = useState<LocalImage | null>(null);
  const uploaded = useRef<UploadedImage | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const set = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));
  const fields = filterFields(form.category);
  async function chooseImage() {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, selectionLimit: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = asset.fileName || `product.${asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/webp' ? 'webp' : 'jpg'}`;
      const type = asset.mimeType || (/\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type) || !/\.(jpe?g|png|webp)$/i.test(name)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP');
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Ảnh phải có dung lượng tối đa 5 MB');
      uploaded.current = undefined;
      setImage({ uri: asset.uri, name, type });
    } catch (failure) { setError(errorMessage(failure)); }
  }
  async function save() {
    if (busy) return;
    if (!form.name.trim() || !form.description.trim() || !form.category || !form.price.trim() || !form.stock.trim() || Number(form.price) < 0 || !Number.isFinite(Number(form.price)) || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) { setError('Nhập đầy đủ tên, mô tả, danh mục, giá và tồn kho hợp lệ'); return; }
    if (!image && !product?.images.length) { setError('Chọn ảnh sản phẩm từ điện thoại'); return; }
    const current = ++version.current;
    setBusy(true); setError('');
    try {
      if (image && !uploaded.current) uploaded.current = await store.uploadSellerImage(image);
      if (current !== version.current) return;
      await store.saveSellerProduct({ ...form, price: Number(form.price), stock: Number(form.stock), ...(uploaded.current ? { image: uploaded.current } : {}) }, product?._id);
      if (current !== version.current) return;
      await onSaved();
      if (current === version.current) onClose();
    } catch (failure) { if (current === version.current) setError(errorMessage(failure)); }
    finally { if (current === version.current) setBusy(false); }
  }
  const close = () => { version.current++; onClose(); };
  return <Modal visible animationType="slide" onRequestClose={close}><SafeAreaView style={ui.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[ui.between, { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.white }]}><Text style={ui.heading}>{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng biểu mẫu" onPress={close} style={{ padding: 12 }}><Ionicons name="close-outline" size={24} color={colors.text} /></Pressable></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
      <Field label="Tên sản phẩm" value={form.name} onChangeText={set('name')} maxLength={120} editable={!busy} />
      <Field label="Mô tả" multiline numberOfLines={3} value={form.description} onChangeText={set('description')} editable={!busy} style={{ minHeight: 96, textAlignVertical: 'top' }} />
      <Choice label="Danh mục chính" value={form.category} options={categoryDefinitions.map(category => ({ value: category.name, label: category.parentSlug ? `  ${category.name}` : category.name }))} onChange={value => setForm(current => ({ ...current, category: value, gender: '', os: '' }))} />
      <Field label="Tag" value={form.tags} onChangeText={set('tags')} placeholder="Ngăn cách bằng dấu phẩy" editable={!busy} />
      <Field label="Thương hiệu" value={form.brand} onChangeText={set('brand')} editable={!busy} />
      {fields.gender && <Choice label="Giới tính" value={form.gender} options={[{ value: '', label: 'Chưa xác định' }, { value: 'nam', label: 'Nam' }, { value: 'nu', label: 'Nữ' }, { value: 'unisex', label: 'Unisex' }]} onChange={set('gender')} />}
      {fields.os && <Choice label="Hệ điều hành" value={form.os} options={[{ value: '', label: 'Chưa xác định' }, { value: 'ios', label: 'iOS / iPadOS' }, { value: 'android', label: 'Android' }]} onChange={set('os')} />}
      <View style={ui.row}><View style={{ flex: 1 }}><Field label="Giá bán (đ)" keyboardType="numeric" value={form.price} onChangeText={set('price')} editable={!busy} /></View><View style={{ flex: 1 }}><Field label="Số lượng tồn" keyboardType="numeric" value={form.stock} onChangeText={set('stock')} editable={!busy} /></View></View>
      <View style={ui.card}><Text style={ui.heading}>Ảnh sản phẩm</Text>{(image?.uri || product?.images[0]) && <ProductImage uri={image?.uri || product?.images[0]} size={144} />}<Button title={image || product?.images.length ? 'Chọn ảnh khác' : 'Chọn ảnh từ điện thoại'} variant="secondary" disabled={busy} onPress={() => { void chooseImage(); }} /><Text style={ui.muted}>JPG, PNG hoặc WebP · tối đa 5 MB{product ? ' · Không chọn ảnh mới để giữ ảnh hiện tại' : ''}</Text></View>
      {error && <ErrorCard message={error} />}
      <Button title={product ? 'Lưu thay đổi' : 'Thêm sản phẩm'} loading={busy} onPress={() => { void save(); }} />
      <Button title="Hủy" variant="secondary" onPress={close} />
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView></Modal>;
}
