import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShop } from '../../state/shop';
import { colors } from '../../components/ui';

export default function SellerLayout() {
  const { session } = useShop();
  if (session?.user.role !== 'seller') return <Redirect href="/login" />;
  const tabs = [
    { name: 'index', title: 'Tổng quan', icon: 'grid-outline' as const },
    { name: 'products', title: 'Sản phẩm', icon: 'cube-outline' as const },
    { name: 'orders', title: 'Đơn hàng', icon: 'receipt-outline' as const },
    { name: 'store', title: 'Gian hàng', icon: 'storefront-outline' as const },
  ];
  return <Tabs screenOptions={{ headerTitle: 'Net Seller', headerTitleStyle: { fontWeight: '500' }, headerStyle: { backgroundColor: colors.white }, headerTintColor: colors.text, headerShadowVisible: false,
    tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' } }}>
    {tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={22} color={color} /> }} />)}
  </Tabs>;
}
