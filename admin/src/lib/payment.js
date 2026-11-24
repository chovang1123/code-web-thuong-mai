export const channels = [
  ["VNBANK", "VNPay - Thẻ ATM nội địa / tài khoản ngân hàng"],
  ["INTCARD", "VNPay - Thẻ quốc tế"],
];
export const paymentLabels = { unpaid: "Chưa thanh toán", paid: "Đã thanh toán", failed: "Thanh toán thất bại", refunded: "Đã hoàn tiền" };
export const canRetry = order => order.paymentMethod === "vnpay" && order.orderStatus === "pending" &&
  ["unpaid", "failed"].includes(order.paymentStatus) && Date.parse(order.expiresAt) > Date.now();

export async function paymentRequest(path, token, options = {}) {
  const api = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const response = await fetch(api + path, { ...options, headers: {
    Authorization: "Bearer " + token, "Content-Type": "application/json",
  } });
  if (response.status === 401) throw new Error("Vui lòng đăng nhập vào tài khoản đã đặt đơn.");
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Không thể xử lý yêu cầu cho đơn này.");
  }
  return response.json();
}
export async function openPayment(orderId, token, bankCode) {
  if (bankCode !== undefined && !channels.some(([value]) => value === bankCode)) bankCode = "VNBANK";
  const { url } = await paymentRequest("/vnpay/create", token, { method: "POST", body: JSON.stringify({ orderId, bankCode }) });
  window.location.assign(url);
}
