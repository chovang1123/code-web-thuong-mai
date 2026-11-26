import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../components/ui';
import { useShop } from '../../state/shop';

export default function TabsLayout() {
  const { cart, session } = useShop();
  if (session?.user.role === 'seller') return <Redirect href="/(seller)" />;
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <Tabs screenOptions={{
    tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted,
    headerTintColor: colors.text, headerShadowVisible: false, headerStyle: { backgroundColor: colors.white }, headerTitleStyle: { fontWeight: '500' },
    tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white }, tabBarLabelStyle: { fontWeight: '500', fontSize: 11 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Net Store', tabBarLabel: 'Khám phá', tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" color={color} size={22} /> }} />
    <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarBadge: count || undefined, tabBarIcon: ({ color }) => <Ionicons name="bag-handle-outline" color={color} size={22} /> }} />
    <Tabs.Screen name="orders" options={{ title: 'Đơn hàng của tôi', tabBarLabel: 'Đơn hàng', tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" color={color} size={22} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" color={color} size={22} /> }} />
  </Tabs>;
}
