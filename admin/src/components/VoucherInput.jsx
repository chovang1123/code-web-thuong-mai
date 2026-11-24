import { coupons } from "../lib/storeConfig";

export default function VoucherInput({ value, onChange, onApply, message, appliedCode, disabled = false, id = "cart-voucher" }) {
  return <section className="voucher-input">
    <label htmlFor={id}>Mã giảm giá</label><div className="voucher-input-row"><input id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} placeholder="Nhập mã" autoCapitalize="characters" /><button type="button" className="secondary-button" disabled={disabled} onClick={() => onApply(value)}>Áp dụng</button></div>
    <div className="voucher-chips">{Object.entries(coupons).map(([code, coupon]) => <button type="button" key={code} disabled={disabled} className={appliedCode === code ? "is-applied" : ""} aria-pressed={appliedCode === code} onClick={() => { onChange(code); onApply(code); }}>{code} · {coupon.label}</button>)}</div>
    <p className="voucher-help">Ưu đãi áp dụng khi thanh toán qua VNPay.</p>
    {message && <p className={appliedCode ? "coupon-success" : "coupon-error"} role="status">{message}</p>}
  </section>;
}
