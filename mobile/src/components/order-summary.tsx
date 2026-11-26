import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, colors, ui } from './ui';
import { Pagination } from './catalog-controls';
import { OrderPayment } from './order-payment';
import { paginate } from '../lib/catalog';
import { dateTime, money, orderStatuses } from '../lib/format';
import type { Order } from '../types';
import { deliveryAddressText } from '../lib/addresses';

export function orderLabel(order: Order, seller = false) {
  if (order.orderStatus === 'cancelled' || order.status === 'cancelled') return 'Đã hủy';
  if (order.paymentMethod === 'vnpay' && order.paymentStatus !== 'paid') return 'Chờ thanh toán';
  if (seller) return ({ pending: 'Chờ xử lý', shipped: 'Đang giao', delivered: 'Đã giao' })[order.orderItems[0]?.sellerStatus || 'pending'] || 'Chờ xử lý';
  return order.orderStatus === 'confirmed' ? 'Đã xác nhận' : orderStatuses[order.orderStatus || order.status] || order.status;
}
export function OrderSummary({ order, seller = false, onAdvance, busy = false }: { order: Order; seller?: boolean; onAdvance?: (status: 'shipped' | 'delivered') => void; busy?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const items = paginate(order.orderItems, page, 5);
  const canShip = order.orderStatus !== 'cancelled' && order.status !== 'cancelled' && (order.paymentMethod !== 'vnpay' || order.paymentStatus === 'paid');
  const stage = order.orderItems[0]?.sellerStatus || 'pending';
  return <View style={ui.card}>
    <View style={ui.between}><Text style={[ui.text, { fontWeight: '500' }]}>#{order._id.slice(-8).toUpperCase()}</Text><Text style={[ui.label, { flexShrink: 1 }]}>{orderLabel(order, seller)}</Text></View>
    <Text style={ui.muted}>{dateTime(order.createdAt)}</Text>
    {order.orderItems.slice(0, 2).map((item, index) => <Text key={item._id || index} style={ui.text} numberOfLines={1}>{item.name} × {item.quantity}</Text>)}
    {order.orderItems.length > 2 && <Text style={ui.muted}>Và {order.orderItems.length - 2} sản phẩm khác</Text>}
    {!seller && <OrderPayment order={order} />}
    <View style={ui.between}><Text style={ui.muted}>{seller ? 'Tổng phần của shop' : 'Tổng thanh toán'}</Text><Text style={[ui.price, { fontSize: 20 }]}>{money(seller ? order.sellerTotal || 0 : order.totalPrice)}</Text></View>
    <Button title={expanded ? 'Thu gọn' : 'Xem chi tiết'} variant="secondary" onPress={() => setExpanded(!expanded)} />
    {expanded && <View style={{ gap: 12 }}>
      <Text selectable style={ui.muted}>Mã đơn: {order._id}</Text>
      <Text style={ui.heading}>Giao đến</Text><Text style={ui.text}>{order.shippingAddress?.fullName} · {order.shippingAddress?.phoneNumber}</Text><Text style={ui.text}>{deliveryAddressText(order.shippingAddress)}</Text>
      {items.items.map((item, index) => <View style={ui.between} key={item._id || index}><Text style={[ui.text, { flex: 1 }]}>{item.name} × {item.quantity}</Text><Text style={ui.muted}>{money(item.price * item.quantity)}</Text></View>)}
      {items.pages > 1 && <Pagination {...items} onChange={setPage} />}
    </View>}
    {seller && !canShip && order.orderStatus !== 'cancelled' && <Text style={[ui.muted, { color: colors.muted }]}>Chờ xác nhận thanh toán trước khi gửi hàng</Text>}
    {seller && canShip && stage !== 'delivered' && onAdvance && <Button title={stage === 'pending' ? 'Xác nhận gửi hàng' : 'Xác nhận đã giao'} loading={busy} onPress={() => onAdvance(stage === 'pending' ? 'shipped' : 'delivered')} />}
  </View>;
}
