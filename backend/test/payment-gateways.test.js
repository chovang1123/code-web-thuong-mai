import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { appPaymentReturn, mobilePaymentReturn, callbackUrls, configured, notification, paymentUrl } from "../src/services/payment-gateways.js";

const env = { PAYMENT_ENV: "sandbox", VNP_TMN_CODE: "TESTSHOP", VNP_HASH_SECRET: "fixture-only-secret", PORT: "4317" };
const sign = raw => createHmac("sha512", env.VNP_HASH_SECRET).update(raw).digest("hex");

test("mobile callbacks bridge to the emulator or configured host and allow only app routes", () => {
  assert.equal(mobilePaymentReturn(env), 'http://10.0.2.2:4317/api/vnpay/return');
  assert.equal(mobilePaymentReturn({ ...env, VNPAY_MOBILE_RETURN_URL: 'http://192.168.1.8:4317/api/vnpay/return' }), 'http://192.168.1.8:4317/api/vnpay/return');
  assert.equal(mobilePaymentReturn({ ...env, VNPAY_IPN_URL: 'https://public.example.test/api/vnpay/ipn' }), 'https://public.example.test/api/vnpay/return');
  for (const value of ['netstore://payment-result', 'netstore:///payment-result', 'exp://127.0.0.1:8082/--/payment-result', 'exp://192.168.1.8:8082/--/payment-result']) assert.equal(appPaymentReturn(value, env), value);
  for (const value of ['https://other.example.test', 'javascript:alert(1)', 'netstore://other', 'netstore://payment-result?result=paid', 'exp://evil.example.test:8082/--/payment-result', 'exp://10.example.test:8082/--/payment-result', 'exp://127.0.0.1:8082/--/other']) assert.equal(appPaymentReturn(value, env), null);
  assert.equal(appPaymentReturn('exp://127.0.0.1:8082/--/payment-result', { ...env, NODE_ENV: 'production' }), null);
  assert.throws(() => mobilePaymentReturn({ ...env, NODE_ENV: 'production', VNPAY_MOBILE_RETURN_URL: 'http://192.168.1.8:4317/api/vnpay/return' }));
});

test("development browser returns use the backend port independently of public IPN", () => {
  assert.deepEqual(callbackUrls(env), { returnUrl: "http://localhost:4317/api/vnpay/return", ipnUrl: null });
  assert.equal(callbackUrls({ ...env, PORT: undefined }).returnUrl, "http://localhost:3000/api/vnpay/return");
  assert.equal(configured("vnpay", env), true);
  const override = { ...env, VNPAY_RETURN_URL: "http://localhost:5001/api/vnpay/return", VNPAY_IPN_URL: "https://ipn.example.test/api/vnpay/ipn", PAYMENT_PUBLIC_URL: "https://retired.example.test" };
  assert.deepEqual(callbackUrls(override), { returnUrl: override.VNPAY_RETURN_URL, ipnUrl: override.VNPAY_IPN_URL });
  assert.equal(configured("vnpay", { ...env, VNP_HASH_SECRET: "" }), false);
  assert.equal(configured("vnpay", { ...env, VNP_TMN_CODE: "" }), false);
});

test("production needs explicit HTTPS return and IPN overrides must be public HTTPS", () => {
  assert.equal(configured("vnpay", { ...env, NODE_ENV: "production" }), false);
  assert.equal(configured("vnpay", { ...env, PAYMENT_ENV: "production" }), false);
  assert.equal(configured("vnpay", { ...env, NODE_ENV: "production", VNPAY_RETURN_URL: "https://shop.example.test/api/vnpay/return" }), true);
  for (const value of ["http://ipn.example.test/api/vnpay/ipn", "https://localhost/api/vnpay/ipn", "https://127.0.0.1/api/vnpay/ipn", "invalid"]) {
    assert.equal(configured("vnpay", { ...env, VNPAY_IPN_URL: value }), false);
  }
  for (const value of ["http://untrusted.example.test/return", "https://user:pass@shop.example.test/return", "https://shop.example.test/return#fragment"]) {
    assert.equal(configured("vnpay", { ...env, VNPAY_RETURN_URL: value }), false);
  }
});

test("payment URL scales VND exactly and signs the sorted outgoing query", () => {
  const order = { id: "testOrder", vnpTxnRef: "testAttempt123", totalPrice: 171000, paymentChannel: "VNBANK" };
  const url = new URL(paymentUrl(order, "::ffff:127.0.0.1", new Date("2026-11-26T03:00:00Z"), env));
  assert.equal(url.origin, "https://sandbox.vnpayment.vn");
  assert.equal(url.searchParams.get("vnp_Amount"), "17100000");
  assert.equal(url.searchParams.get("vnp_ReturnUrl"), "http://localhost:4317/api/vnpay/return");
  assert.equal(url.searchParams.get("vnp_TxnRef"), order.vnpTxnRef);
  assert.equal(url.searchParams.get("vnp_IpAddr"), "127.0.0.1");
  assert.equal(url.searchParams.get("vnp_CreateDate"), "20261126100000");
  const raw = url.search.slice(1).split("&vnp_SecureHash=")[0];
  assert.equal(url.searchParams.get("vnp_SecureHash"), sign(raw));
  assert.deepEqual([...url.searchParams.keys()].filter(key => key !== "vnp_SecureHash"), [...url.searchParams.keys()].filter(key => key !== "vnp_SecureHash").sort());
  assert.throws(() => paymentUrl({ ...order, totalPrice: 6000 }, "127.0.0.1", new Date(), env), /hạn mức/);
});

test("callback hashing follows VNPay encoding, omits hash metadata, and needs both success codes", () => {
  const raw = "vnp_Amount=17100000&vnp_OrderInfo=Thanh+toan+don+!~'()*+%2B+%26+%C4%91&vnp_ResponseCode=00&vnp_TmnCode=TESTSHOP&vnp_TransactionNo=1234&vnp_TransactionStatus=00&vnp_TxnRef=attempt123";
  const query = Object.fromEntries(new URLSearchParams(raw));
  query.vnp_SecureHash = sign(raw);
  query.vnp_SecureHashType = "HmacSHA512";
  const result = notification(query, env);
  assert.equal(result.amount, 171000);
  assert.equal(result.paid, true);
  assert.equal(result.ref, "attempt123");
  assert.equal(notification({ ...query, vnp_Amount: "600000" }, env), null);
  assert.equal(notification({ ...query, vnp_SecureHash: "wrong" }, env), null);
  assert.equal(notification({ ...query, vnp_Amount: ["17100000", "600000"] }, env), null);
  for (const [response, status, paid, cancelled] of [["00", "02", false, false], ["07", "00", false, false], ["24", "02", false, true]]) {
    const changed = raw.replace("vnp_ResponseCode=00", `vnp_ResponseCode=${response}`).replace("vnp_TransactionStatus=00", `vnp_TransactionStatus=${status}`);
    const data = notification({ ...Object.fromEntries(new URLSearchParams(changed)), vnp_SecureHash: sign(changed) }, env);
    assert.equal(data.paid, paid);
    assert.equal(data.cancelled, cancelled);
  }
  // Return/IPN verification does not depend on a tunnel or on a return override.
  assert.equal(notification(query, { ...env, VNPAY_RETURN_URL: "invalid" }).paid, true);
});
