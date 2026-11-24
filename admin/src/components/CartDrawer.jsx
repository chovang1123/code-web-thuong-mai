import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import Dialog from "./Dialog";
import ProductImage from "./ProductImage";
import VoucherInput from "./VoucherInput";
import { complementaryProducts } from "../lib/recommendations";
import { formatPrice } from "../lib/products";
import { couponDiscount, shippingQuote } from "../lib/cartPricing";

function CartContents({ cart, products, onQuantity, onRemove, onAdd, onView, onCheckout, onClose, onViewCart, coupon, couponCode, couponInput, onCouponInput, onApplyCoupon, couponMessage, syncMessage, fullPage = false }) {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const shipping = shippingQuote(subtotal);
  const discount = couponDiscount(subtotal, coupon);
  const related = complementaryProducts(products, cart, 2);
  return <div className={`cart-content ${fullPage ? "full-cart-content" : ""}`}>
    <div className="panel-header"><div><p className="eyebrow">GIỎ HÀNG CỦA BẠN</p><h2>{count} sản phẩm</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label={fullPage ? "Quay lại cửa hàng" : "Đóng giỏ hàng"}>{fullPage ? <ArrowLeft /> : <X />}</button></div>
    {syncMessage && <p role="alert" className="coupon-error">Chưa đồng bộ được giỏ hàng: {syncMessage}</p>}
    {cart.length ? <>
      <div className="shipping-progress"><p>{shipping.remaining > 0 ? <>Mua thêm <strong>{formatPrice(shipping.remaining)}</strong> để được miễn phí vận chuyển</> : "Đơn hàng của bạn được miễn phí vận chuyển"}</p><progress value={shipping.progress} max="100" aria-label="Tiến trình miễn phí vận chuyển" /></div>
      <div className="cart-items">{cart.map(item => <article className="cart-item" key={item._id}><ProductImage product={item} /><div className="cart-item-details"><div className="cart-item-heading"><h3><button type="button" onClick={() => onView(item)}>{item.name}</button></h3><button type="button" className="secondary-button cart-remove" onClick={() => onRemove(item._id)} aria-label={`Xóa ${item.name} khỏi giỏ`}>Xóa</button></div><p className="cart-item-shop">{item.sellerName || "Net Market"}</p><div className="cart-item-bottom"><div className="quantity" aria-label={`Số lượng ${item.name}`}><button type="button" disabled={item.quantity <= 1} onClick={() => onQuantity(item._id, -1)} aria-label={`Giảm số lượng ${item.name}`}><Minus size={14} /></button><output aria-label={`Số lượng ${item.name}`}>{item.quantity}</output><button type="button" disabled={Number.isFinite(item.stock) && item.quantity >= item.stock} onClick={() => onQuantity(item._id, 1)} aria-label={`Tăng số lượng ${item.name}`}><Plus size={14} /></button></div><strong>{formatPrice(item.price * item.quantity)}</strong></div></div></article>)}</div>
      <VoucherInput value={couponInput} onChange={onCouponInput} onApply={onApplyCoupon} message={couponMessage} appliedCode={couponCode} />
      {related.length > 0 && <section className="cart-complements"><h3>Mua kèm thường được chọn</h3>{related.map(product => <div className="cart-complement" key={product._id}><ProductImage product={product} /><div><button type="button" onClick={() => onView(product)}>{product.name}</button><strong>{formatPrice(product.price)}</strong></div><button type="button" className="secondary-button" onClick={() => onAdd(product)} aria-label={`Thêm ${product.name} vào giỏ`}>+ Thêm</button></div>)}</section>}
      <div className="cart-summary">{(shipping.fee > 0 || discount > 0) && <div className="cart-total"><span>Tạm tính</span><span>{formatPrice(subtotal)}</span></div>}{shipping.fee > 0 && <div className="cart-total"><span>Phí vận chuyển</span><span>{formatPrice(shipping.fee)}</span></div>}{discount > 0 && <div className="cart-total"><span>Voucher VNPay</span><span>−{formatPrice(discount)}</span></div>}<div className="cart-total final-row"><span>Tổng cộng</span><strong>{formatPrice(subtotal + shipping.fee - discount)}</strong></div>{discount > 0 && <p className="voucher-help">Tổng sau ưu đãi VNPay. Thanh toán COD: {formatPrice(subtotal + shipping.fee)}.</p>}</div>
      <div className="cart-cta"><button type="button" className="checkout-button primary-button" onClick={onCheckout}>Thanh toán <ArrowRight size={18} /></button>{!fullPage && <button type="button" className="secondary-button view-cart-button" onClick={onViewCart}>Xem giỏ hàng</button>}</div>
    </> : <div className="empty-cart"><ShoppingBag size={42} /><p>Giỏ hàng đang trống.</p><button type="button" className="primary-button" onClick={onClose}>Tiếp tục mua sắm</button></div>}
  </div>;
}

export default function CartDrawer(props) {
  return <Dialog label="Giỏ hàng của bạn" className="cart-panel cart-drawer" onClose={props.onClose}><CartContents {...props} /></Dialog>;
}

export function CartPage(props) {
  return <Dialog label="Xem giỏ hàng" className="cart-page-overlay cart-page-dialog" onClose={props.onClose}><header className="cart-page-header"><a className="brand" href="#shop" onClick={event => { event.preventDefault(); props.onClose(); }}><img src="/net-store-logo.png" alt="" className="brand-logo" /><span>NET STORE</span></a><nav className="checkout-steps" aria-label="Tiến trình đặt hàng"><strong aria-current="step">Giỏ hàng</strong><span aria-hidden="true">›</span><span>Thanh toán</span><span aria-hidden="true">›</span><span>Hoàn tất</span></nav></header><main className="cart-page-main"><CartContents {...props} fullPage /></main></Dialog>;
}
