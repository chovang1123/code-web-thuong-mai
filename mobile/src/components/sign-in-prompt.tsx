import { router } from 'expo-router';
import { Button, Empty } from './ui';
import { useShop } from '../state/shop';

export function SignInPrompt() {
  const { sessionMessage } = useShop();
  return <Empty title="Đăng nhập để tiếp tục" message={sessionMessage || 'Dùng tài khoản khách mua hàng đã đăng ký trên website Net Store.'}>
    <Button title="Đăng nhập" onPress={() => router.push('/login')} />
  </Empty>;
}
