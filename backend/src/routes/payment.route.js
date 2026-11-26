import { randomBytes } from "node:crypto";
import { Router } from "express";
import { protectWebRoute } from "../middleware/web-auth.middleware.js";
import { Order } from "../models/order.model.js";
import { appPaymentReturn, mobilePaymentReturn, configured, bankChannel, minimumVnpayAmount, validVnpayAmount, notification, paymentUrl } from "../services/payment-gateways.js";
import { payable, settle } from "../services/payments.js";

export const paymentRoutes = Router();
export const vnpayRoutes = Router();
export const orderPaymentRoutes = Router();
const validId = id => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

paymentRoutes.get("/methods", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ cod: true, vnpay: configured("vnpay"), vnpayMinAmount: minimumVnpayAmount() });
});

async function start(req, res) {
  const id = req.params.id ?? req.body?.orderId;
  if (!validId(id)) return res.sendStatus(404);
  if (!configured("vnpay")) return res.status(503).json({ message: "VNPay chưa được cấu hình." });
  const order = await Order.findOne({ _id: id, user: req.user._id }).lean();
  if (!order) return res.sendStatus(404);
  if (!validVnpayAmount(order.totalPrice)) return res.status(400).json({ message: `Tổng thanh toán VNPay phải từ ${minimumVnpayAmount().toLocaleString("vi-VN")}đ đến 999.999.999đ.` });
  const appReturn = req.body?.appReturnUrl === undefined ? null : appPaymentReturn(req.body.appReturnUrl);
  if (req.body?.appReturnUrl !== undefined && !appReturn) return res.status(400).json({ message: "Đường dẫn trả về app không hợp lệ." });
  const gatewayEnv = { ...process.env, PORT: String(req.socket.localPort) };
  if (appReturn) gatewayEnv.VNPAY_RETURN_URL = mobilePaymentReturn(gatewayEnv);
  const channel = req.body?.bankCode === undefined ? bankChannel(order.paymentChannel) || "VNBANK" : bankChannel(req.body.bankCode);
  const now = new Date();
  const ref = id + randomBytes(10).toString("hex");
  const updated = await Order.findOneAndUpdate({ _id: id, user: req.user._id, ...payable() },
    { $set: { vnpTxnRef: ref, paymentStatus: "unpaid", "paymentResult.status": "pending", ...(appReturn && { paymentAppReturnUrl: appReturn }), ...(channel && { paymentChannel: channel }) },
      $unset: { "paymentResult.id": 1, ...(!appReturn && { paymentAppReturnUrl: 1 }), ...(!channel && { paymentChannel: 1 }) } }, { new: true });
  if (!updated) return res.status(409).json({ message: "Đơn không còn chờ thanh toán hoặc đã hết hạn." });
  res.set("Cache-Control", "no-store").json({ url: paymentUrl(updated, req.ip, now, gatewayEnv) });
}
vnpayRoutes.post("/create", protectWebRoute, start);
paymentRoutes.post("/:id/start", protectWebRoute, start);

async function ipn(req, res) {
  let code;
  try {
    const data = notification(req.query);
    code = data ? await settle(data) : "97";
  } catch { code = "99"; }
  const messages = { "00": "Confirm Success", "01": "Order not found", "02": "Order already confirmed", "04": "Invalid amount", "97": "Invalid signature", "99": "Unknown error" };
  res.set("Cache-Control", "no-store").json({ RspCode: code, Message: messages[code] });
}
vnpayRoutes.get("/ipn", ipn);
paymentRoutes.get("/vnpay/ipn", ipn);

async function browserReturn(req, res) {
  res.set("Cache-Control", "no-store");
  const data = notification(req.query);
  if (!data || typeof data.ref !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(data.ref)) return res.status(400).send("Chữ ký VNPay không hợp lệ.");
  const order = await Order.findOne({ vnpTxnRef: data.ref, paymentMethod: "vnpay" }).select("totalPrice paymentStatus orderStatus paymentAppReturnUrl").lean();
  if (!order) return res.status(404).send("Lần thanh toán này không còn hiệu lực. Vui lòng kiểm tra Đơn hàng của tôi.");
  if (data.amount !== order.totalPrice) return res.status(400).send("Số tiền VNPay không khớp với đơn hàng.");
  const appReturn = appPaymentReturn(order.paymentAppReturnUrl);
  const page = appReturn ? new URL(appReturn) : new URL("/payment-result", process.env.CLIENT_URL || "http://localhost:5173");
  page.searchParams.set("orderId", String(order._id));
  // Return chỉ hiển thị. IPN là nơi duy nhất chốt trạng thái trong database.
  const processed = ["paid", "refunded"].includes(order.paymentStatus);
  const result = processed ? order.paymentStatus : data.cancelled ? "cancelled" :
    !data.paid || order.paymentStatus === "failed" ? "failed" : "pending";
  page.searchParams.set("result", result);
  if (!processed && data.cancelled) page.searchParams.set("cancelled", "1");
  res.set("Cache-Control", "no-store").redirect(303, page.href);
}
vnpayRoutes.get("/return", browserReturn);
paymentRoutes.get("/return", browserReturn);

orderPaymentRoutes.get("/:id/status", protectWebRoute, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    .select("orderStatus paymentStatus paymentMethod paymentChannel expiresAt").lean();
  if (!order) return res.sendStatus(404);
  res.set("Cache-Control", "no-store").json(order);
});
orderPaymentRoutes.patch("/:id/payment-method", protectWebRoute, async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  if (req.body.paymentMethod !== "cod") return res.status(400).json({ message: "Phương thức không hợp lệ." });
  const order = await Order.findOneAndUpdate({ _id: req.params.id, user: req.user._id, ...payable() },
    { $set: { paymentMethod: "cod", orderStatus: "confirmed", paymentStatus: "unpaid", paymentResult: { status: "unpaid" } },
      $unset: { vnpTxnRef: 1, paymentChannel: 1, expiresAt: 1, paymentExpiresAt: 1 } }, { new: true });
  if (!order) return res.status(409).json({ message: "Không thể đổi phương thức cho đơn này." });
  res.json({ orderStatus: order.orderStatus, paymentStatus: order.paymentStatus });
});
