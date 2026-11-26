import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { Button, Empty, ui } from '../components/ui';

export default function NotFoundScreen() {
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}><Empty title="Không tìm thấy màn hình" message="Quay lại danh sách sản phẩm để tiếp tục."><Button title="Về sản phẩm" onPress={() => router.replace('/(tabs)')} /></Empty></ScrollView>;
}
