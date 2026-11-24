import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ShieldCheck, Truck } from "lucide-react";

import CheckoutAddress from "./CheckoutAddress";

import { channels } from "./lib/payment";

const formatPrice = (price) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(price);

function CheckoutPanel({ authToken, cart, total, discount, onBack, onComplete, onSubmitOrder }) {
  const [shippingAddress, setShippingAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [channel, setChannel] = useState("VNBANK");
  const [voucher, setVoucher] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkoutReference = useRef(null);
  const [methods, setMethods] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const api = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    fetch(api + "/payments/methods", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (controller.signal.aborted) return;
        setMethods(data);
        setPaymentMethod(current => data?.[current] === false ? "cod" : current);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (submitting || !cart.length || !shippingAddress) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (paymentMethod !== "cod" && !checkoutReference.current) {
        checkoutReference.current = Array.from(crypto.getRandomValues(new Uint8Array(16)),
          byte => byte.toString(16).padStart(2, "0")).join("");
      }
      await onSubmitOrder(shippingAddress, paymentMethod, checkoutReference.current, paymentMethod === "vnpay" ? channel : undefined);
      if (paymentMethod === "cod") onComplete();
    } catch (error) {
      setMessage(error.message || "Không thể đặt hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="checkout-page">
    <header className="checkout-header"><button onClick={onBack} aria-label="Quay lại"><ArrowLeft size={22} /></button><h1>Thanh toán</h1><span /></header>
    <form className="checkout-content" onSubmit={submitOrder}>
      <CheckoutAddress authToken={authToken} onChange={setShippingAddress} disabled={submitting} />
      <section className="checkout-card"><div className="checkout-card-title"><h2>Sản phẩm</h2><span>{cart.length} sản phẩm</span></div><div className="checkout-items">{cart.map((item) => <div className="checkout-item" key={item._id}><img src={item.images?.[0]} alt={item.name} /><div><strong>{item.name}</strong><small>{item.category} · x{item.quantity}</small></div><b>{formatPrice(item.price * item.quantity)}</b></div>)}</div></section>
      <section className="checkout-card checkout-row"><div><h2>Voucher của Shop</h2><p>Chọn hoặc nhập mã giảm giá</p></div><div className="checkout-voucher"><input value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="Nhập mã voucher" /><button type="button" onClick={() => setMessage(voucher ? `Mã ${voucher.toUpperCase()} sẽ được kiểm tra khi đặt hàng.` : "Nhập mã voucher trước khi áp dụng.")}>Áp dụng</button></div></section>
      {message && <p className="checkout-message" role="alert">{message}</p>}
      <section className="checkout-card checkout-row"><div><h2><Truck size={19} /> Phương thức vận chuyển</h2><p>Giao hàng tiêu chuẩn</p></div><strong>Miễn phí</strong></section>
      <section className="checkout-card">
        <h2>Phương thức thanh toán</h2>
        {[["cod", "Thanh toán khi nhận hàng"], ...channels].map(([value, label]) =>
          <label className="payment-option" key={value}><b>{label}{methods?.[value === "cod" ? "cod" : "vnpay"] === false && " (chưa khả dụng)"}</b>
            <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === "cod" ? value === "cod" : value === channel}
              disabled={submitting || methods?.[value === "cod" ? "cod" : "vnpay"] === false} onChange={() => { setPaymentMethod(value === "cod" ? "cod" : "vnpay"); setChannel(value); setMessage(""); }} />
          </label>)}
      </section>
      <section className="checkout-card checkout-summary"><h2>Chi tiết thanh toán</h2><p><span>Tổng tiền hàng</span><b>{formatPrice(total + discount)}</b></p><p><span>Tổng tiền phí vận chuyển</span><b>Miễn phí</b></p>{discount > 0 && <p className="checkout-saving"><span>Ưu đãi sản phẩm</span><b>-{formatPrice(discount)}</b></p>}<p className="checkout-total"><span>Tổng thanh toán</span><strong>{formatPrice(total)}</strong></p></section>
    </form>
    <div className="checkout-bottom"><div><span>Tổng cộng</span><strong>{formatPrice(total)}</strong>{discount > 0 && <small>Tiết kiệm {formatPrice(discount)}</small>}</div><button disabled={submitting || !cart.length || !shippingAddress} onClick={() => document.querySelector(".checkout-content")?.requestSubmit()}><ShieldCheck size={17} /> {submitting ? "Đang đặt hàng..." : "Đặt hàng"}</button></div>
  </div>;
}

export default CheckoutPanel;
