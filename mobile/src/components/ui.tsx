import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';

export const colors = {
  background: '#F4F6FA', white: '#FFFFFF', text: '#17243C', muted: '#64748B',
  primary: '#2563EB', light: '#EAF0FF', border: '#DCE3ED', danger: '#B42318', green: '#087F5B',
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.white, padding: 18, borderRadius: 18, gap: 12, borderWidth: 1, borderColor: '#E9EDF3' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 23 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  price: { fontSize: 21, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontSize: 16 },
});

export function Button({ title, onPress, disabled = false, loading = false, variant = 'primary', accessibilityLabel }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger'; accessibilityLabel?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: 48, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: variant === 'primary' ? colors.primary : variant === 'danger' ? '#FEECEB' : colors.light,
        opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
      }]}>
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? colors.white : colors.primary} />}
      <Text style={{ fontSize: 15, fontWeight: '700', color: variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}>
    <Text style={[ui.text, { fontWeight: '600' }]}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#94A3B8" {...props} style={[ui.input, props.style]} />
  </View>;
}

export function FormScreen({ children }: { children: ReactNode }) {
  return <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}</ScrollView>
  </KeyboardAvoidingView>;
}

export function Loading({ text = 'Đang tải dữ liệu…' }: { text?: string }) {
  return <View style={{ padding: 32, alignItems: 'center', gap: 12 }}><ActivityIndicator color={colors.primary} /><Text style={ui.muted}>{text}</Text></View>;
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View accessibilityLiveRegion="polite" style={[ui.card, { backgroundColor: '#FFF2F0', borderColor: '#F7CECA' }]}>
    <Text style={[ui.text, { color: colors.danger }]}>{message}</Text>
    {onRetry && <Button title="Thử lại" variant="secondary" onPress={onRetry} />}
  </View>;
}

export function Empty({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return <View style={[ui.card, { paddingVertical: 30 }]}><Text style={ui.heading}>{title}</Text><Text style={ui.muted}>{message}</Text>{children}</View>;
}

export function ProductImage({ uri, size = 80 }: { uri?: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || failedUri === uri) return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center' }}><Text style={ui.muted}>Chưa có ảnh</Text></View>;
  return <Image source={{ uri }} accessibilityLabel="Ảnh sản phẩm" resizeMode="contain" onError={() => setFailedUri(uri)}
    style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#F8FAFC' }} />;
}
