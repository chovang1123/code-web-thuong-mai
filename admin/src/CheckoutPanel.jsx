import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, MapPin, ShieldCheck, Truck } from "lucide-react";

const formatPrice = (price) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(price);

function CheckoutPanel({ cart, total, discount, email, onBack, onComplete }) {
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", city: "" });
  const [voucher, setVoucher] = useState("");
  const [message, setMessage] = useState("");

  const submitOrder = (event) => {
    event.preventDefault();
    const orders = JSON.parse(localStorage.getItem(`net_store_orders_${email}`) || "[]");
    orders.unshift({ id: `NET-${Date.now()}`, items: cart, total, status: "pending", createdAt: new Date().toISOString(), shippingAddress: form, paymentMethod: "Thanh toán khi nhận hàng" });
    localStorage.setItem(`net_store_orders_${email}`, JSON.stringify(orders));
    onComplete();
  };

  return <div className="checkout-page">
    <header className="checkout-header"><button onClick={onBack} aria-label="Quay lại"><ArrowLeft size={22} /></button><h1>Thanh toán</h1><span /></header>
    <form className="checkout-content" onSubmit={submitOrder}>
      <section className="checkout-card checkout-address"><div className="checkout-card-title"><h2><MapPin size={19} /> Địa chỉ nhận hàng</h2><button type="button">Chọn địa chỉ <ChevronRight size={17} /></button></div><div className="checkout-fields"><input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Họ và tên" /><input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Số điện thoại" /><input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Tỉnh/Thành phố, Quận/Huyện" /><textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Địa chỉ cụ thể" rows="2" /></div></section>
      <section className="checkout-card"><div className="checkout-card-title"><h2>Sản phẩm</h2><span>{cart.length} sản phẩm</span></div><div className="checkout-items">{cart.map((item) => <div className="checkout-item" key={item._id}><img src={item.images?.[0]} alt={item.name} /><div><strong>{item.name}</strong><small>{item.category} · x{item.quantity}</small></div><b>{formatPrice(item.price * item.quantity)}</b></div>)}</div></section>
      <section className="checkout-card checkout-row"><div><h2>Voucher của Shop</h2><p>Chọn hoặc nhập mã giảm giá</p></div><div className="checkout-voucher"><input value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="Nhập mã voucher" /><button type="button" onClick={() => setMessage(voucher ? `Mã ${voucher.toUpperCase()} sẽ được kiểm tra khi đặt hàng.` : "Nhập mã voucher trước khi áp dụng.")}>Áp dụng</button></div></section>
      {message && <p className="checkout-message">{message}</p>}
      <section className="checkout-card checkout-row"><div><h2><Truck size={19} /> Phương thức vận chuyển</h2><p>Giao hàng tiêu chuẩn</p></div><strong>Miễn phí</strong></section>
      <section className="checkout-card"><div className="checkout-card-title"><h2>Phương thức thanh toán</h2><span>Đã chọn</span></div><label className="payment-option"><span><span className="cash-icon">₫</span><span><b>Thanh toán khi nhận hàng</b><small>Thanh toán bằng tiền mặt khi nhận được hàng</small></span></span><input type="radio" checked readOnly /></label></section>
      <section className="checkout-card checkout-summary"><h2>Chi tiết thanh toán</h2><p><span>Tổng tiền hàng</span><b>{formatPrice(total + discount)}</b></p><p><span>Tổng tiền phí vận chuyển</span><b>Miễn phí</b></p>{discount > 0 && <p className="checkout-saving"><span>Ưu đãi sản phẩm</span><b>-{formatPrice(discount)}</b></p>}<p className="checkout-total"><span>Tổng thanh toán</span><strong>{formatPrice(total)}</strong></p></section>
    </form>
    <div className="checkout-bottom"><div><span>Tổng cộng</span><strong>{formatPrice(total)}</strong>{discount > 0 && <small>Tiết kiệm {formatPrice(discount)}</small>}</div><button onClick={() => document.querySelector(".checkout-content")?.requestSubmit()}><ShieldCheck size={17} /> Đặt hàng</button></div>
  </div>;
}

export default CheckoutPanel;
