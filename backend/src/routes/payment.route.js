import { randomBytes } from "node:crypto";
import { Router } from "express";
import { protectWebRoute } from "../middleware/web-auth.middleware.js";
import { Order } from "../models/order.model.js";
import { configured, bankChannel, notification, paymentUrl } from "../services/payment-gateways.js";
import { payable, settle } from "../services/payments.js";

export const paymentRoutes = Router();
export const vnpayRoutes = Router();
export const orderPaymentRoutes = Router();
const validId = id => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

paymentRoutes.get("/methods", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ cod: true, vnpay: configured("vnpay") });
});

async function start(req, res) {
  const id = req.params.id ?? req.body?.orderId;
  if (!validId(id)) return res.sendStatus(404);
  if (!configured("vnpay")) return res.status(503).json({ message: "VNPay chưa được cấu hình." });
  const order = await Order.findOne({ _id: id, user: req.user._id }).lean();
  if (!order) return res.sendStatus(404);
  const channel = req.body?.bankCode === undefined ? bankChannel(order.paymentChannel) || "VNBANK" : bankChannel(req.body.bankCode);
  const now = new Date();
  const ref = id + randomBytes(10).toString("hex");
  const updated = await Order.findOneAndUpdate({ _id: id, user: req.user._id, ...payable() },
    { $set: { vnpTxnRef: ref, paymentStatus: "unpaid", "paymentResult.status": "pending", ...(channel && { paymentChannel: channel }) },
      $unset: { "paymentResult.id": 1, ...(!channel && { paymentChannel: 1 }) } }, { new: true });
  if (!updated) return res.status(409).json({ message: "Đơn không còn chờ thanh toán hoặc đã hết hạn." });
  res.set("Cache-Control", "no-store").json({ url: paymentUrl(updated, req.ip, now) });
}
vnpayRoutes.post("/create", protectWebRoute, start);
paymentRoutes.post("/:id/start", protectWebRoute, start);

async function ipn(req, res) {
  const data = notification(req.query);
  const code = data ? await settle(data) : "97";
  const messages = { "00": "Confirm Success", "01": "Order not found", "02": "Order already confirmed", "04": "Invalid amount", "97": "Invalid signature" };
  res.set("Cache-Control", "no-store").json({ RspCode: code, Message: messages[code] });
}
vnpayRoutes.get("/ipn", ipn);
paymentRoutes.get("/vnpay/ipn", ipn);

async function browserReturn(req, res) {
  const data = notification(req.query);
  if (!data || typeof data.ref !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(data.ref)) return res.status(400).send("Chữ ký VNPay không hợp lệ.");
  const order = await Order.findOne({ vnpTxnRef: data.ref, totalPrice: data.amount, paymentMethod: "vnpay" }).select("_id");
  if (!order) return res.status(404).send("Lần thanh toán này không còn hiệu lực. Vui lòng kiểm tra Đơn hàng của tôi.");
  const page = new URL("/payment-result", process.env.CLIENT_URL || "http://localhost:5173");
  page.searchParams.set("orderId", order.id);
  if (data.cancelled) page.searchParams.set("cancelled", "1");
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
