import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

export function blocksFulfillment(order) {
  return order.paymentMethod === "vnpay" && order.paymentStatus !== "paid";
}

export const payable = () => ({
  paymentMethod: "vnpay", orderStatus: "pending", paymentStatus: { $in: ["unpaid", "failed"] },
  expiresAt: { $gt: new Date() },
});

export async function migrateOrderStates() {
  // Chỉ bổ sung trạng thái cho dữ liệu trước phiên bản này.
  const delivered = { $in: ["$status", ["completed", "delivered", "returning"]] };
  const paid = { $or: [{ $eq: ["$paymentResult.status", "paid"] },
    { $and: [delivered, { $eq: [{ $ifNull: ["$paymentMethod", "cod"] }, "cod"] }] }] };
  const online = { $eq: ["$paymentMethod", "vnpay"] };
  await Order.collection.updateMany({ orderStatus: { $exists: false } }, [{ $set: {
    orderStatus: { $switch: { branches: [
      { case: { $eq: ["$status", "cancelled"] }, then: "cancelled" },
      { case: delivered, then: "delivered" },
      { case: { $in: ["$status", ["shipping", "shipped", "delivering"]] }, then: "shipping" },
      { case: { $and: [online, { $not: [paid] }] }, then: "pending" },
    ], default: "confirmed" } },
    paymentStatus: { $switch: { branches: [
      { case: { $eq: ["$paymentResult.status", "refunded"] }, then: "refunded" },
      { case: paid, then: "paid" },
      { case: { $in: ["$paymentResult.status", ["expired", "failed"]] }, then: "failed" },
    ], default: "unpaid" } },
    expiresAt: { $cond: [online, { $min: [{ $ifNull: ["$paymentExpiresAt", { $add: ["$createdAt", 900000] }] }, { $add: ["$createdAt", 900000] }] }, "$$REMOVE"] },
    vnpTxnRef: { $cond: [online, { $toString: "$_id" }, "$$REMOVE"] },
  } }]);
}

export async function settle({ ref, amount, paid, transaction }) {
  if (typeof ref !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(ref)) return "01";
  const order = await Order.findOne({ vnpTxnRef: ref, paymentMethod: "vnpay" }).select("totalPrice").lean();
  if (!order) return "01";
  if (amount !== order.totalPrice) return "04";
  // Một lần IPN duy nhất được chốt. Retry thay TxnRef nên callback cũ không khớp.
  const paymentStatus = paid ? "paid" : "failed";
  const update = await Order.updateOne({ ...payable(), _id: order._id, vnpTxnRef: ref, paymentStatus: "unpaid" },
    { $set: { paymentStatus, orderStatus: paid ? "confirmed" : "pending", "paymentResult.status": paymentStatus,
      "paymentResult.id": transaction, ...(paid && { paidAt: new Date() }) } });
  return update.modifiedCount ? "00" : "02";
}

export async function expirePayments() {
  const filter = { paymentMethod: "vnpay", orderStatus: "pending", paymentStatus: { $in: ["unpaid", "failed"] },
    expiresAt: { $lte: new Date() } };
  const candidates = await Order.find(filter).select("_id").limit(100).lean();
  for (const { _id } of candidates) {
    await Order.db.transaction(async session => {
      const order = await Order.findOneAndUpdate({ _id, ...filter }, { $set: { orderStatus: "cancelled", status: "cancelled",
        paymentStatus: "failed", "paymentResult.status": "expired" } }, { session });
      if (!order) return;
      for (const item of order.orderItems) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
    });
  }
}
