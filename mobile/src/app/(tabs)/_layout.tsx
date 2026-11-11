import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../components/ui';
import { useShop } from '../../state/shop';

export default function TabsLayout() {
  const { cart } = useShop();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <Tabs screenOptions={{
    tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    headerTintColor: colors.text, headerShadowVisible: false,
    tabBarStyle: { borderTopColor: colors.border }, tabBarLabelStyle: { fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Net Store', tabBarLabel: 'Sản phẩm', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarBadge: count || undefined, tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="orders" options={{ title: 'Đơn hàng của tôi', tabBarLabel: 'Đơn hàng', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} /> }} />
  </Tabs>;
}
