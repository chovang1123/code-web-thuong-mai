import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';

export const colors = {
  background: '#FAF6F0', white: '#FFFFFF', text: '#1F2937', muted: '#606874',
  primary: '#C2410C', light: '#F4EFE8', border: '#E8E1D6', danger: '#B42318', green: '#0F766E',
  accentSoft: '#E6F4F1', primarySoft: '#FFEDD5', errorSoft: '#FFF2F0',
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 8, gap: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '500', color: colors.text },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '500', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 24 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  price: { fontSize: 22, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.green },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, fontSize: 15, minHeight: 48 },
  divider: { height: 1, backgroundColor: colors.border },
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
        minHeight: 48, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 12,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        borderWidth: 1, borderColor: variant === 'primary' ? colors.primary : colors.border,
        backgroundColor: variant === 'primary' ? colors.primary : variant === 'danger' ? colors.errorSoft : colors.white,
        opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1,
      }]}>
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? colors.white : colors.primary} />}
      <Text style={{ fontSize: 14, fontWeight: '500', color: variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.text }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}>
    <Text style={[ui.text, { fontWeight: '600' }]}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[ui.input, props.style]} />
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
  return <View accessibilityLiveRegion="polite" style={[ui.card, { backgroundColor: colors.errorSoft }]}>
    <Text style={[ui.text, { color: colors.danger }]}>{message}</Text>
    {onRetry && <Button title="Thử lại" variant="secondary" onPress={onRetry} />}
  </View>;
}

export function Empty({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return <View style={[ui.card, { paddingVertical: 32 }]}><Text style={ui.heading}>{title}</Text><Text style={ui.muted}>{message}</Text>{children}</View>;
}

export function ProductImage({ uri, size = 80 }: { uri?: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || failedUri === uri) return <View style={{ width: size, height: size, borderRadius: 4, backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center' }}><Text style={ui.muted}>Chưa có ảnh</Text></View>;
  return <Image source={{ uri }} accessibilityLabel="Ảnh sản phẩm" resizeMode="contain" onError={() => setFailedUri(uri)}
    style={{ width: size, height: size, borderRadius: 4, backgroundColor: colors.white }} />;
}
