import { createHmac, timingSafeEqual } from "node:crypto";

const privateHost = hostname => {
  const parts = hostname.split('.');
  if (parts.length !== 4 || !parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || first === 192 && second === 168 || first === 172 && second >= 16 && second <= 31;
};

export function configured(method, env = process.env) {
  if (!["sandbox", "production"].includes(env.PAYMENT_ENV || "sandbox")) return false;
  try {
    callbackUrls(env);
  } catch { return false; }
  if (method === "vnpay") return Boolean(env.VNP_TMN_CODE && env.VNP_HASH_SECRET);
  return false;
}

export function callbackUrls(env = process.env) {
  const production = env.NODE_ENV === "production" || env.PAYMENT_ENV === "production";
  const port = env.PORT || "3000";
  const returnUrl = env.VNPAY_RETURN_URL?.trim() || (!production ? `http://localhost:${port}/api/vnpay/return` : "");
  const ipnUrl = env.VNPAY_IPN_URL?.trim() || null;
  const validate = (value, publicOnly) => {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.hostname.endsWith(".localhost") || privateHost(url.hostname);
    if (url.username || url.password || url.hash ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && local && !production && !publicOnly)) ||
        (publicOnly && local)) throw new Error("URL callback VNPay không hợp lệ.");
    return url.href;
  };
  return { returnUrl: validate(returnUrl, false), ipnUrl: ipnUrl ? validate(ipnUrl, true) : null };
}

export const minimumVnpayAmount = (env = process.env) => env.PAYMENT_ENV === "production" ? 5000 : 10000;
export const validVnpayAmount = (amount, env = process.env) => Number.isSafeInteger(amount) && amount >= minimumVnpayAmount(env) && amount <= 999999999;

export function appPaymentReturn(value, env = process.env) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol === "netstore:" && ((url.hostname === "payment-result" && !url.pathname) || (!url.hostname && url.pathname === "/payment-result"))) return url.href;
    const development = env.NODE_ENV !== "production" && env.PAYMENT_ENV !== "production";
    const localHost = ["localhost", "127.0.0.1"].includes(url.hostname) || privateHost(url.hostname);
    return development && url.protocol === "exp:" && localHost && /^\d+$/.test(url.port) && url.pathname === "/--/payment-result" ? url.href : null;
  } catch { return null; }
}

export function mobilePaymentReturn(env = process.env) {
  const production = env.NODE_ENV === "production" || env.PAYMENT_ENV === "production";
  const value = env.VNPAY_MOBILE_RETURN_URL?.trim() || (env.VNPAY_IPN_URL ? new URL("/api/vnpay/return", env.VNPAY_IPN_URL).href :
    production ? callbackUrls(env).returnUrl : `http://10.0.2.2:${env.PORT || "3000"}/api/vnpay/return`);
  const url = new URL(value);
  if (url.username || url.password || url.hash || (url.protocol !== "https:" && (production || url.protocol !== "http:"))) throw new Error("URL trả về mobile không hợp lệ.");
  return url.href;
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
  const encode = value => encodeURIComponent(value).replace(/%20/g, "+");
  return Object.keys(fields).sort().map(key => `${encode(key)}=${encode(fields[key])}`).join("&");
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
  if (!configured("vnpay", env)) throw new Error("VNPay chưa được cấu hình.");
  if (!validVnpayAmount(order.totalPrice, env)) throw new Error("Số tiền VNPay nằm ngoài hạn mức.");
  const fields = {
    vnp_Version: "2.1.0", vnp_Command: "pay", vnp_TmnCode: env.VNP_TMN_CODE,
    vnp_Amount: String(order.totalPrice * 100), vnp_CurrCode: "VND", vnp_TxnRef: order.vnpTxnRef,
    vnp_OrderInfo: "Thanh toan don " + order.id, vnp_OrderType: "other", vnp_Locale: "vn",
    vnp_ReturnUrl: callbackUrls(env).returnUrl,
    vnp_IpAddr: ip.replace(/^::ffff:/, ""), vnp_CreateDate: vnTime(now),
    vnp_ExpireDate: vnTime(new Date(+now + 15 * 60000)),
  };
  if (bankChannel(order.paymentChannel)) fields.vnp_BankCode = order.paymentChannel;
  // Sắp xếp và ký toàn bộ tham số, kể cả kênh đã chọn.
  const raw = vnQuery(fields);
  const gateway = env.PAYMENT_ENV === "production" ? "https://pay.vnpay.vn/vpcpay.html" :
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  return gateway + "?" + raw + "&vnp_SecureHash=" + digest("sha512", env.VNP_HASH_SECRET, raw);
}

export function notification(fields, env = process.env) {
  if (!env.VNP_TMN_CODE || !env.VNP_HASH_SECRET || !fields) return null;
  const signed = { ...fields };
  delete signed.vnp_SecureHash;
  delete signed.vnp_SecureHashType;
  if (Object.values(signed).some(x => typeof x !== "string") || signed.vnp_TmnCode !== env.VNP_TMN_CODE ||
      !matches(fields.vnp_SecureHash, digest("sha512", env.VNP_HASH_SECRET, vnQuery(signed))) ||
      !/^\d+$/.test(signed.vnp_Amount) || !Number.isSafeInteger(Number(signed.vnp_Amount)) || !signed.vnp_ResponseCode) return null;
  return { ref: signed.vnp_TxnRef, amount: Number(signed.vnp_Amount) / 100,
    paid: signed.vnp_ResponseCode === "00" && signed.vnp_TransactionStatus === "00",
    cancelled: signed.vnp_ResponseCode === "24", transaction: signed.vnp_TransactionNo };
}
