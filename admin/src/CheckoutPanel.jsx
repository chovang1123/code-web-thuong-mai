import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import CheckoutAddress from "./CheckoutAddress";
import ProductImage from "./components/ProductImage";
import VoucherInput from "./components/VoucherInput";
import { channels } from "./lib/payment";
import { formatPrice } from "./lib/products";
import { checkoutTotals } from "./lib/cartPricing";
import { estimatedDelivery, isValidAddress } from "./lib/checkout";

export default function CheckoutPanel({ authToken, authEmail, cart, coupon, couponCode, couponInput, onCouponInput, onApplyCoupon, couponMessage, onBack, onComplete, onSubmitOrder }) {
  const [shippingAddress, setShippingAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [channel, setChannel] = useState("VNBANK");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkoutReference = useRef(null);
  const submitLock = useRef(false);
  const [methods, setMethods] = useState(null);
  const noteKey = `net_store_checkout_note_${authEmail || "guest"}`;
  const [note, setNote] = useState(() => { try { return localStorage.getItem(noteKey) || ""; } catch { return ""; } });
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totals = checkoutTotals(subtotal, coupon, paymentMethod);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const onlineAmountValid = paymentMethod !== "vnpay" || (totals.total >= 5000 && totals.total <= 999999999 && Number.isSafeInteger(totals.total));

  useEffect(() => {
    const controller = new AbortController();
    const api = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    fetch(api + "/payments/methods", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted) setMethods(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const submitOrder = async event => {
    event.preventDefault();
    if (submitLock.current || !cart.length || !isValidAddress(shippingAddress) || !onlineAmountValid || methods?.[paymentMethod] === false || (paymentMethod === "vnpay" && methods?.vnpay !== true)) return;
    submitLock.current = true;
    setSubmitting(true);
    setMessage("");
    try {
      if (paymentMethod !== "cod" && !checkoutReference.current) checkoutReference.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
      await onSubmitOrder(shippingAddress, paymentMethod, checkoutReference.current, paymentMethod === "vnpay" ? channel : undefined);
      try { localStorage.removeItem(noteKey); } catch { /* Optional local draft. */ }
      if (paymentMethod === "cod") onComplete();
    } catch (error) { setMessage(error.message || "Không thể đặt hàng."); }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  return <div className="checkout-page net-checkout">
    <header className="checkout-header"><div className="checkout-brand"><button type="button" onClick={onBack} aria-label="Quay lại"><ArrowLeft size={20} /></button><a className="brand" href="#shop" onClick={event => { event.preventDefault(); onBack(); }}><img src="/net-store-logo.png" alt="" className="brand-logo" /><span>NET STORE</span></a></div><nav className="checkout-steps" aria-label="Tiến trình đặt hàng"><button type="button" onClick={onBack}>Giỏ hàng</button><span aria-hidden="true">›</span><strong aria-current="step">Thanh toán</strong><span aria-hidden="true">›</span><span>Hoàn tất</span></nav><span className="checkout-secure"><LockKeyhole size={14} />Thanh toán bảo mật</span></header>
    <h1 className="sr-only">Thanh toán</h1>
    <form className="checkout-content checkout-layout" onSubmit={submitOrder}>
      <div className="checkout-main">
        <CheckoutAddress authToken={authToken} onChange={setShippingAddress} disabled={submitting} />
        <section className="checkout-card"><h2>Sản phẩm</h2><div className="checkout-items">{cart.map(item => <article className="checkout-item" key={item._id}><ProductImage product={item} /><div><strong>{item.name}</strong><small>{item.sellerName || "Net Market"} · Số lượng: {item.quantity}</small></div><span className="checkout-line-price">{formatPrice(item.price * item.quantity)}</span></article>)}</div><label className="checkout-note" htmlFor="shop-note">Ghi chú cho shop <span>(lưu tạm trên thiết bị)</span><textarea id="shop-note" rows="2" maxLength="500" value={note} disabled={submitting} onChange={event => { setNote(event.target.value); try { localStorage.setItem(noteKey, event.target.value); } catch { /* Optional local draft. */ } }} placeholder="Ghi chú cho shop (không bắt buộc)" /></label></section>
        <section className="checkout-card"><h2>Vận chuyển</h2><div className="delivery-option"><Truck size={20} aria-hidden="true" /><div><strong>Giao tiêu chuẩn</strong><p>Nhận hàng dự kiến {estimatedDelivery()}</p></div><span>{totals.shipping === 0 ? "Miễn phí" : "Theo phí bên phải"}</span></div></section>
        <section className="checkout-card"><fieldset className="payment-methods"><legend>Phương thức thanh toán</legend>{[["cod", "Thanh toán khi nhận hàng"], ...channels].map(([value]) => {
          const cod = value === "cod";
          const unavailable = cod ? methods?.cod === false : methods?.vnpay !== true;
          return <label className={`payment-option ${unavailable ? "is-unavailable" : ""}`} key={value}><input type="radio" name="paymentMethod" value={value} checked={paymentMethod === "cod" ? cod : value === channel} disabled={submitting || unavailable} onChange={() => { setPaymentMethod(cod ? "cod" : "vnpay"); setChannel(value); setMessage(""); }} /><span className="payment-badge">{cod ? "COD" : value === "VNBANK" ? "VNPay · ATM" : "VNPay · Visa"}</span><span>{cod ? "Thanh toán khi nhận hàng" : value === "VNBANK" ? "Thẻ ATM nội địa / tài khoản ngân hàng" : "Thẻ quốc tế Visa / Mastercard"}{unavailable && <small>{methods ? "Hiện chưa khả dụng" : "Đang kiểm tra kết nối"}</small>}</span></label>;
        })}</fieldset>{!onlineAmountValid && <p role="alert" className="checkout-message">VNPay hỗ trợ tổng thanh toán từ 5.000đ đến 999.999.999đ. Bạn có thể chọn COD.</p>}</section>
      </div>
      <aside className="checkout-card checkout-summary order-summary" aria-label="Tóm tắt đơn hàng"><h2>Đơn hàng</h2><details className="checkout-voucher-picker"><summary>Chọn hoặc nhập voucher{couponCode ? ` · ${couponCode}` : ""}</summary><VoucherInput id="checkout-voucher" value={couponInput} onChange={onCouponInput} onApply={onApplyCoupon} message={couponMessage} appliedCode={couponCode} disabled={submitting} /></details><dl className="order-amounts"><div><dt>Tiền hàng ({count})</dt><dd>{formatPrice(totals.subtotal)}</dd></div><div><dt>Phí vận chuyển</dt><dd>{formatPrice(totals.shipping)}</dd></div><div><dt>Voucher</dt><dd>{totals.discount > 0 ? `−${formatPrice(totals.discount)}` : "Chưa áp dụng"}</dd></div><div className="order-total"><dt>Tổng thanh toán</dt><dd>{formatPrice(totals.total)}</dd></div></dl>{coupon && paymentMethod === "cod" && <p className="voucher-help">Chọn VNPay để sử dụng ưu đãi {couponCode}.</p>}{message && <p className="checkout-message" role="alert">{message}</p>}<button type="submit" className="primary-button place-order-button" disabled={submitting || !cart.length || !shippingAddress || !onlineAmountValid || methods?.[paymentMethod] === false || (paymentMethod === "vnpay" && methods?.vnpay !== true)}>{submitting ? "Đang đặt hàng..." : "Đặt hàng"}</button><p className="checkout-trust"><ShieldCheck size={15} aria-hidden="true" />Thông tin được bảo mật</p><p className="checkout-trust">Kiểm tra kỹ địa chỉ trước khi đặt hàng.</p></aside>
    </form>
  </div>;
}
