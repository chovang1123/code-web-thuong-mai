import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { once } from "node:events";
import express from "express";
import mongoose from "mongoose";
import { paymentRoutes, vnpayRoutes, orderPaymentRoutes } from "../src/routes/payment.route.js";
import authRoutes from "../src/routes/auth.route.js";
import { webOrderRoutes } from "../src/routes/order.route.js";
import { advanceOrderStatuses } from "../src/controllers/order.controller.js";
import { updateSellerOrderStatus } from "../src/controllers/seller.controller.js";
import { getDashboardStats } from "../src/controllers/admin.controller.js";
import { expirePayments, migrateOrderStates } from "../src/services/payments.js";
import { createWebAuthToken } from "../src/utils/web-auth.js";
import { User } from "../src/models/user.model.js";
import { Product } from "../src/models/product.model.js";
import { Cart } from "../src/models/cart.model.js";
import { Order } from "../src/models/order.model.js";

const hmac = (alg, secret, input) => createHmac(alg, secret).update(input).digest("hex");
test("checkout, IPN và tồn kho trên replica set tạm", async t => {
  Object.assign(process.env, { PAYMENT_ENV: "sandbox", VNPAY_RETURN_URL: "", VNPAY_IPN_URL: "https://ipn.example.test/api/vnpay/ipn", VNP_TMN_CODE: "TESTSHOP",
    VNP_HASH_SECRET: "test-vnp",
    MONGO_URI: "test-signing-key" });
  const tmp = await mkdtemp(path.join(os.tmpdir(), "shop-pay-test-"));
  const portProbe = net.createServer().listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const address = "127.0.0.1:" + port;
  const db = spawn(process.env.MONGOD_BIN || "mongod", ["--dbpath", tmp, "--port", String(port),
    "--bind_ip", "127.0.0.1", "--replSet", "test", "--oplogSize", "128"], { windowsHide: true, stdio: "ignore" });
  const stopped = once(db, "exit");
  stopped.catch(() => {});
  t.after(async () => {
    await mongoose.disconnect();
    db.kill();
    await stopped.catch(() => {});
    await rm(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  const client = new mongoose.mongo.MongoClient("mongodb://" + address, { directConnection: true, serverSelectionTimeoutMS: 20000 });
  await client.connect();
  try { await client.db("admin").command({ replSetInitiate: { _id: "test", members: [{ _id: 0, host: address }] } }); }
  finally { await client.close(); }
  await mongoose.connect("mongodb://" + address + "/checkout_test?replicaSet=test");
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  const user = await User.create({ name: "Test", email: "test@example.test", clerkId: "test" });
  const other = await User.create({ name: "Other", email: "other@example.test" });
  const product = await Product.create({ name: "Test", description: "test", sellerId: other.id, category: "test", stock: 10, price: 20000 });
  const cart = await Cart.create({ user: user.id, clerkId: user.clerkId });
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/orders", webOrderRoutes);
  app.use("/vnpay", vnpayRoutes);
  app.use("/orders", orderPaymentRoutes);
  app.use("/payments", paymentRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  const request = globalThis.fetch;
  const shippingAddress = { fullName: "Test", city: "HCM", streetAddress: "12 ABC", phoneNumber: "0901234567" };
  const post = (url, body, actor = user) => request(base + url, { method: "POST",
    headers: { Authorization: "Bearer " + createWebAuthToken(actor.id), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const stock = async () => (await Product.findById(product.id)).stock;
  async function checkout(options) {
    await Cart.updateOne({ _id: cart.id }, { items: [{ product: product.id, quantity: 1 }] });
    return post("/orders", { shippingAddress, ...options });
  }
  function signedParams(ref, opts = {}, tamper = false) {
    const params = new URLSearchParams({ vnp_TmnCode: "TESTSHOP", vnp_TxnRef: ref, vnp_TransactionNo: "1234",
      vnp_Amount: "1800000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", ...opts });
    params.sort();
    params.set("vnp_SecureHash", hmac("sha512", "test-vnp", params.toString()));
    if (tamper) params.set("vnp_Amount", "1");
    return params;
  }
  function vnCallback(ref, opts, tamper) {
    return request(base + "/vnpay/ipn?" + signedParams(ref, opts, tamper)).then(r => r.json());
  }
  await t.test("COD cũ và kiểm tra cấu hình trước khi giữ hàng", async () => {
    const cod = await (await checkout({})).json();
    assert.equal(cod.order.paymentResult.status, "unpaid");
    assert.equal(await stock(), 9);
    assert.equal(cod.order.orderStatus, "confirmed");
    assert.equal(cod.order.paymentStatus, "unpaid");
    assert.equal((await checkout({ paymentMethod: "vnpay", expectedTotal: 50 })).status, 400);
    assert.equal(await stock(), 9);
    assert.equal((await Cart.findById(cart.id)).items.length, 1);
  });
  await t.test("VNPay: quyền truy cập, số tiền, chữ ký, callback lặp và trạng thái giao hàng", async () => {
    const options = { paymentMethod: "vnpay", couponCode: "NET10", expectedTotal: 18000, checkoutReference: "a".repeat(32) };
    const { order } = await (await checkout(options)).json();
    const ref = order._id;
    const replay = await (await post("/orders", { shippingAddress, ...options })).json();
    assert.equal(replay.order._id, ref);
    assert.equal((await post("/payments/" + ref + "/start", {}, other)).status, 404);
    const begin = async bankCode => new URL((await (await post("/vnpay/create", { orderId: ref, bankCode })).json()).url);
    const noChannel = await begin("VNPAYQR");
    assert.equal(noChannel.searchParams.has("vnp_BankCode"), false);
    await Order.updateOne({ _id: ref }, { paymentChannel: "VNPAYQR" });
    assert.equal((await begin()).searchParams.get("vnp_BankCode"), "VNBANK");
    for (const channel of ["VNBANK", "INTCARD"]) assert.equal((await begin(channel)).searchParams.get("vnp_BankCode"), channel);
    const first = await begin("VNBANK");
    const firstRef = first.searchParams.get("vnp_TxnRef");
    assert.equal((await vnCallback(firstRef, { vnp_ResponseCode: "24" })).RspCode, "00");
    assert.equal((await Order.findById(ref)).paymentStatus, "failed");
    const url = await begin("VNBANK");
    const latest = url.searchParams.get("vnp_TxnRef");
    assert.equal(url.searchParams.get("vnp_ReturnUrl"), `http://localhost:${server.address().port}/api/vnpay/return`);
    assert.equal(url.searchParams.has("vnp_IpnUrl"), false);
    assert.match(latest, /^[a-zA-Z0-9]+$/);
    assert.notEqual(latest, firstRef);
    assert.equal((await vnCallback(firstRef)).RspCode, "01");
    assert.equal(url.searchParams.get("vnp_BankCode"), "VNBANK");
    const params = new URL(url).searchParams;
    assert.equal(params.get("vnp_Amount"), "1800000");
    const signature = params.get("vnp_SecureHash");
    params.delete("vnp_SecureHash");
    assert.equal(signature, hmac("sha512", "test-vnp", params.toString()));
    assert.equal((await vnCallback(latest, {}, true)).RspCode, "97");
    assert.equal((await vnCallback(latest, { vnp_Amount: "1" })).RspCode, "04");
    assert.equal((await request(base + "/vnpay/return?vnp_TxnRef=" + latest)).status, 400);
    assert.equal((await request(base + "/vnpay/return?" + signedParams("missing"))).status, 404);
    const wrongAmount = await request(base + "/vnpay/return?" + signedParams(latest, { vnp_Amount: "17100000" }));
    assert.equal(wrongAmount.status, 400);
    assert.match(await wrongAmount.text(), /Số tiền/);
    for (const callback of [{}, { vnp_ResponseCode: "00", vnp_TransactionStatus: "02" }, { vnp_ResponseCode: "07", vnp_TransactionStatus: "00" }]) {
      const response = await request(base + "/vnpay/return?" + signedParams(latest, callback), { redirect: "manual" });
      assert.equal(response.status, 303);
      assert.equal(new URL(response.headers.get("location")).searchParams.get("result"), Object.keys(callback).length ? "failed" : "pending");
      assert.equal((await Order.findById(ref)).paymentStatus, "unpaid");
    }
    const returned = await request(base + "/vnpay/return?" + signedParams(latest, { vnp_ResponseCode: "24" }), { redirect: "manual" });
    assert.equal(returned.status, 303);
    assert.equal(new URL(returned.headers.get("location")).searchParams.get("orderId"), ref);
    assert.equal(new URL(returned.headers.get("location")).searchParams.get("cancelled"), "1");
    const statusUrl = base + "/orders/" + ref + "/status";
    assert.equal((await request(statusUrl)).status, 401);
    assert.equal((await request(statusUrl, { headers: { Authorization: "Bearer " + createWebAuthToken(other.id) } })).status, 404);
    assert.equal((await Order.findById(ref)).paymentResult.status, "pending");
    const sellerUpdate = status => updateSellerOrderStatus({ user: other, params: { orderId: ref }, body: { status } },
      { status(code) { this.code = code; return this; }, json() {} });
    await sellerUpdate("shipped");
    assert.equal((await Order.findById(ref)).orderItems[0].sellerStatus, "pending");
    let stats;
    await getDashboardStats({}, { status() { return this; }, json(data) { stats = data; } });
    assert.equal(stats.totalRevenue, 20000);
    await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(ref) }, { $set: { createdAt: new Date(0) } });
    await advanceOrderStatuses();
    assert.equal((await Order.findById(ref)).status, "pending");
    const codes = await Promise.all([vnCallback(latest), vnCallback(latest)]);
    assert.deepEqual(codes.map(x => x.RspCode).sort(), ["00", "02"]);
    assert.equal((await Order.findById(ref)).paymentResult.status, "paid");
    const paidAt = (await Order.findById(ref)).paidAt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const returned = await request(base + "/vnpay/return?" + signedParams(latest), { redirect: "manual" });
      assert.equal(new URL(returned.headers.get("location")).searchParams.get("result"), "paid");
    }
    assert.equal((await vnCallback(latest, { vnp_ResponseCode: "24" })).RspCode, "02");
    assert.equal(+(await Order.findById(ref)).paidAt, +paidAt);
    assert.equal((await Order.findById(ref)).paymentStatus, "paid");
    await sellerUpdate("shipped");
    await sellerUpdate("delivered");
    assert.equal((await Order.findById(ref)).status, "delivered");
    assert.equal((await post("/payments/" + ref + "/start", {})).status, 409);
    assert.equal(await stock(), 8);
  });
  await t.test("đổi sang COD, hết hạn và hoàn kho một lần", async () => {
    const initial = await stock();
    const create = async () => (await (await checkout({ paymentMethod: "vnpay" })).json()).order;
    const order = await create();
    const auth = { Authorization: "Bearer " + createWebAuthToken(user.id), "Content-Type": "application/json" };
    const change = await request(base + "/orders/" + order._id + "/payment-method", { method: "PATCH",
      headers: auth, body: JSON.stringify({ paymentMethod: "cod" }) });
    assert.deepEqual(await change.json(), { orderStatus: "confirmed", paymentStatus: "unpaid" });
    assert.equal((await post("/vnpay/create", { orderId: order._id })).status, 409);
    const expired = await create();
    await Order.updateOne({ _id: expired._id }, { expiresAt: new Date(0) });
    await Promise.all([expirePayments(), expirePayments()]);
    assert.equal((await Order.findById(expired._id)).orderStatus, "cancelled");
    assert.equal(await stock(), initial - 1);
    assert.equal((await post("/vnpay/create", { orderId: expired._id })).status, 409);
    await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(order._id) }, { $set: { createdAt: new Date(0) } });
    await advanceOrderStatuses();
    const delivered = await Order.findById(order._id);
    assert.equal(delivered.orderStatus, "delivered");
    assert.equal(delivered.paymentStatus, "paid");
    await Order.collection.updateOne({ _id: delivered._id }, { $unset: { orderStatus: 1, paymentStatus: 1 } });
    await migrateOrderStates();
    await migrateOrderStates();
    assert.equal((await Order.findById(order._id)).paymentStatus, "paid");
  });
  await t.test("địa chỉ mặc định theo tài khoản và địa chỉ từng đơn", async () => {
    const saved = { label: "Nhà riêng", fullName: "Home", phoneNumber: "0901234567", city: "Quận 1", state: "TP.HCM", streetAddress: "12 Home", isDefault: true };
    assert.equal((await request(base + "/auth/addresses")).status, 401);
    const response = await post("/auth/addresses", { ...saved, email: other.email });
    assert.equal(response.status, 201);
    const address = (await response.json()).address;
    assert.equal((await User.findById(other.id)).addresses.length, 0);
    const auth = actor => ({ Authorization: "Bearer " + createWebAuthToken(actor.id), "Content-Type": "application/json" });
    const mine = await request(base + "/auth/addresses?email=" + other.email, { headers: auth(user) });
    assert.equal((await mine.json()).addresses[0]._id, address._id);
    const foreign = await request(base + "/auth/addresses/" + address._id, { method: "PUT", headers: auth(other), body: JSON.stringify(saved) });
    assert.equal(foreign.status, 404);
    const placed = await (await checkout({ shippingAddress: address })).json();
    assert.equal(placed.order.shippingAddress.state, saved.state);
    const custom = { ...saved, fullName: "Office", streetAddress: "34 Temporary", city: "Quận 3" };
    const temporary = await (await checkout({ shippingAddress: custom })).json();
    assert.equal(temporary.order.shippingAddress.streetAddress, custom.streetAddress);
    assert.equal((await User.findById(user.id)).addresses[0].streetAddress, saved.streetAddress);
    await request(base + "/auth/addresses/" + address._id, { method: "PUT", headers: auth(user), body: JSON.stringify({ ...saved, streetAddress: "New Home" }) });
    assert.equal((await Order.findById(placed.order._id)).shippingAddress.streetAddress, saved.streetAddress);
  });

  await t.test("voucher cho COD/VNPay, số tiền lưu và hoàn kho khi không hợp lệ", async () => {
    const original = await Product.findById(product.id);
    const originalSession = Order.startSession;
    await Product.updateOne({ _id: product.id }, { price: 1425000, stock: 100 });
    try {
      for (const standalone of [false, true]) {
        if (standalone) Order.startSession = async () => ({ withTransaction: async () => { throw Object.assign(new Error("Transactions not supported"), { code: 20 }); }, endSession: async () => {} });
        for (const paymentMethod of standalone ? ["cod"] : ["cod", "vnpay"]) {
          for (const [couponCode, totalPrice, discountAmount] of [[undefined, 1425000, 0], ["NET10", 1282500, 142500], ["WELCOME50", 1375000, 50000], ["FREESHIP", 1395000, 30000]]) {
            const response = await checkout({ paymentMethod, couponCode, expectedTotal: totalPrice });
            assert.equal(response.status, 201);
            const { order } = await response.json();
            const saved = await Order.findById(order._id);
            assert.equal(saved.totalPrice, totalPrice);
            assert.equal(saved.subtotal, 1425000);
            assert.equal(saved.discountAmount, discountAmount);
            assert.equal(saved.couponCode, couponCode);
            assert.equal(saved.paymentMethod, paymentMethod);
          }
          for (const invalid of [{ couponCode: "NET10", expectedTotal: 1 }, { couponCode: "INVALID" }, { couponCode: { value: 100 } }]) {
            const beforeStock = await stock(), beforeOrders = await Order.countDocuments();
            assert.equal((await checkout({ paymentMethod, ...invalid })).status, 400);
            assert.equal(await stock(), beforeStock);
            assert.equal(await Order.countDocuments(), beforeOrders);
            assert.equal((await Cart.findById(cart.id)).items.length, 1);
          }
        }
        await Product.updateOne({ _id: product.id }, { price: 4000 });
        const free = await checkout({ couponCode: "WELCOME50", expectedTotal: 0 });
        assert.equal(free.status, 201);
        assert.equal((await free.json()).order.totalPrice, 0);
        await Product.updateOne({ _id: product.id }, { price: 1425000 });
        Order.startSession = originalSession;
      }
      const discounted = await (await checkout({ paymentMethod: "vnpay", couponCode: "NET10", expectedTotal: 1282500 })).json();
      const changed = await request(base + "/orders/" + discounted.order._id + "/payment-method", { method: "PATCH", headers: { Authorization: "Bearer " + createWebAuthToken(user.id), "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: "cod" }) });
      assert.equal(changed.status, 200);
      const converted = await Order.findById(discounted.order._id);
      assert.equal(converted.totalPrice, 1282500); assert.equal(converted.discountAmount, 142500); assert.equal(converted.couponCode, "NET10");
    } finally {
      Order.startSession = originalSession;
      await Product.updateOne({ _id: product.id }, { price: original.price, stock: original.stock });
    }
  });
  await t.test("Android returns to the stored app route; only IPN confirms payment", async () => {
    const { order } = await (await checkout({ paymentMethod: 'vnpay' })).json();
    assert.equal((await post('/vnpay/create', { orderId: order._id, appReturnUrl: 'https://untrusted.example.test' })).status, 400);
    const appReturnUrl = 'exp://127.0.0.1:8082/--/payment-result';
    const begin = await post('/vnpay/create', { orderId: order._id, appReturnUrl });
    assert.equal(begin.status, 200);
    const url = new URL((await begin.json()).url);
    assert.equal(url.searchParams.get('vnp_ReturnUrl'), 'https://ipn.example.test/api/vnpay/return');
    const ref = url.searchParams.get('vnp_TxnRef');
    const query = signedParams(ref, { vnp_Amount: String(order.totalPrice * 100) });
    const returned = await request(base + '/vnpay/return?' + query, { redirect: 'manual' });
    const target = new URL(returned.headers.get('location'));
    assert.equal(returned.status, 303);
    assert.equal(target.protocol, 'exp:');
    assert.equal(target.pathname, '/--/payment-result');
    assert.equal(target.searchParams.get('orderId'), order._id);
    assert.equal(target.searchParams.get('result'), 'pending');
    assert.equal((await Order.findById(order._id)).paymentStatus, 'unpaid');
    const cancelled = await request(base + '/vnpay/return?' + signedParams(ref, { vnp_Amount: String(order.totalPrice * 100), vnp_ResponseCode: '24' }), { redirect: 'manual' });
    assert.equal(new URL(cancelled.headers.get('location')).searchParams.get('result'), 'cancelled');
    assert.equal((await request(base + '/vnpay/return?' + signedParams(ref, { vnp_Amount: String(order.totalPrice * 100) }, true), { redirect: 'manual' })).status, 400);
    assert.equal((await vnCallback(ref, { vnp_Amount: String(order.totalPrice * 100) })).RspCode, '00');
    const status = await request(base + '/orders/' + order._id + '/status', { headers: { Authorization: 'Bearer ' + createWebAuthToken(user.id) } });
    assert.equal((await status.json()).paymentStatus, 'paid');
    assert.equal((await vnCallback(ref, { vnp_Amount: String(order.totalPrice * 100) })).RspCode, '02');
  });
});
