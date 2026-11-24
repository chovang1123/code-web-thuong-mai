import { createHmac, timingSafeEqual } from "node:crypto";

export function configured(method, env = process.env) {
  if (!["sandbox", "production"].includes(env.PAYMENT_ENV || "sandbox")) return false;
  try {
    if (new URL(env.PAYMENT_PUBLIC_URL).protocol !== "https:") return false;
  } catch { return false; }
  if (method === "vnpay") return Boolean(env.VNP_TMN_CODE && env.VNP_HASH_SECRET);
  return false;
}

function digest(algorithm, secret, data) {
  return createHmac(algorithm, secret).update(data).digest("hex");
}

function matches(actual, expected) {
  return typeof actual === "string" && /^[\da-f]+$/i.test(actual) &&
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function vnQuery(fields) {
  const params = new URLSearchParams(fields);
  params.sort();
  return params.toString();
}

function vnTime(date) {
  return new Date(+date + 7 * 3600000).toISOString().slice(0, 19).replace(/\D/g, "");
}


export function bankChannel(code) {
  if (["VNBANK", "INTCARD"].includes(code)) return code;
  if (process.env.NODE_ENV !== "production" && code === "NCB") return code;
  return undefined;
}

export function paymentUrl(order, ip, now = new Date(), env = process.env) {
  const fields = {
    vnp_Version: "2.1.0", vnp_Command: "pay", vnp_TmnCode: env.VNP_TMN_CODE,
    vnp_Amount: String(order.totalPrice * 100), vnp_CurrCode: "VND", vnp_TxnRef: order.vnpTxnRef,
    vnp_OrderInfo: "Thanh toan don " + order.id, vnp_OrderType: "other", vnp_Locale: "vn",
    vnp_ReturnUrl: new URL("/api/vnpay/return", env.PAYMENT_PUBLIC_URL).href,
    vnp_IpAddr: ip.replace(/^::ffff:/, ""), vnp_CreateDate: vnTime(now),
    vnp_ExpireDate: vnTime(new Date(+now + 15 * 60000)),
  };
  if (bankChannel(order.paymentChannel)) fields.vnp_BankCode = order.paymentChannel;
  // Sắp xếp và ký toàn bộ tham số, kể cả kênh đã chọn.
  const raw = vnQuery(fields);
  if (env.NODE_ENV === "development") console.debug("VNPay signing data", raw);
  const gateway = env.PAYMENT_ENV === "production" ? "https://pay.vnpay.vn/vpcpay.html" :
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  return gateway + "?" + raw + "&vnp_SecureHash=" + digest("sha512", env.VNP_HASH_SECRET, raw);
}

export function notification(fields, env = process.env) {
  if (!configured("vnpay", env) || !fields) return null;
  const signed = { ...fields };
  delete signed.vnp_SecureHash;
  delete signed.vnp_SecureHashType;
  if (Object.values(signed).some(x => typeof x !== "string") || signed.vnp_TmnCode !== env.VNP_TMN_CODE ||
      !matches(fields.vnp_SecureHash, digest("sha512", env.VNP_HASH_SECRET, vnQuery(signed))) ||
      !/^\d+$/.test(signed.vnp_Amount) || !signed.vnp_ResponseCode) return null;
  return { ref: signed.vnp_TxnRef, amount: Number(signed.vnp_Amount) / 100,
    paid: signed.vnp_ResponseCode === "00" && signed.vnp_TransactionStatus === "00",
    cancelled: signed.vnp_ResponseCode === "24", transaction: signed.vnp_TransactionNo };
}
