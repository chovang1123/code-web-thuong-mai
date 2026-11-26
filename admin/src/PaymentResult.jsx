import { useEffect, useState } from "react";
import { channels, canRetry, openPayment, paymentRequest } from "./lib/payment";

export default function PaymentResult() {
  const params = new URLSearchParams(location.search);
  const id = params.get("orderId");
  const cancelled = params.get("cancelled") === "1";
  const returnedFailure = params.get("result") === "failed";
  const token = localStorage.getItem("net_store_token");
  const [order, setOrder] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [method, setMethod] = useState("cod");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || !token) return;
    const controller = new AbortController();
    let timer;
    // Truy vấn ngay, sau đó chờ IPN tối đa 5 lần nữa.
    async function read(attempt) {
      try {
        const data = await paymentRequest("/orders/" + encodeURIComponent(id) + "/status", token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setOrder(data);
        if (data.orderStatus === "pending" && data.paymentStatus === "unpaid" && attempt < 5) {
          timer = setTimeout(() => read(attempt + 1), 2500);
        } else setDone(true);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    }
    read(0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [id, token]);

  async function act(choice) {
    setBusy(true);
    setError("");
    try {
      if (choice === "cod") {
        await paymentRequest("/orders/" + id + "/payment-method", token, { method: "PATCH",
          body: JSON.stringify({ paymentMethod: "cod" }) });
        location.assign("/orders");
      } else await openPayment(id, token, choice);
    } catch (e) { setError(e.message); setBusy(false); }
  }

  let title = "Đang xử lý thanh toán";
  if (!id || !token) title = "Mở đơn hàng bằng tài khoản đã đặt đơn";
  else if (order?.paymentStatus === "paid") title = "Thanh toán thành công";
  else if (order?.paymentMethod === "cod") title = "Đã đổi sang thanh toán khi nhận hàng";
  else if (order?.orderStatus === "cancelled") title = "Đơn hàng đã hủy";
  else if (order && cancelled) title = "Bạn đã hủy thanh toán";
  else if (order?.paymentStatus === "failed" || (order && returnedFailure)) title = "Thanh toán thất bại";
  else if (order?.paymentStatus === "refunded") title = "Đã hoàn tiền";

  return <main className="checkout-content payment-result"><section className="checkout-card" aria-live="polite">
    <h1>{title}</h1>
    {title === "Đang xử lý thanh toán" && done && <p>Đang xử lý, vui lòng kiểm tra lại trong Đơn hàng của tôi.</p>}
    {!token && <p>Nếu đặt qua ứng dụng, mở Đơn hàng của tôi trong ứng dụng và kéo xuống để cập nhật kết quả.</p>}
    {error && <p role="alert">{error}</p>}
    {order && canRetry(order) && (done || cancelled) && <div>
      <button disabled={busy} onClick={() => act(order.paymentChannel)}>Thanh toán lại</button>
      <button aria-expanded={choosing} disabled={busy} onClick={() => setChoosing(!choosing)}>Đổi phương thức</button>
      {choosing && <div><label>Phương thức mới <select value={method} onChange={e => setMethod(e.target.value)}>
        <option value="cod">Thanh toán khi nhận hàng</option>
        {channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label><button disabled={busy} onClick={() => act(method)}>Xác nhận</button></div>}
    </div>}
    <a href="/orders">Xem đơn hàng</a>
  </section></main>;
}
