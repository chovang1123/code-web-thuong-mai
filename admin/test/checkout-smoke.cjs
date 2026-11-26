/* Smoke test for the built storefront. Uses the DOM runtime already installed by mobile's Jest suite. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [path.resolve(__dirname, "../../mobile")] }));
const { setTimeout: wait } = require("node:timers/promises");

async function until(predicate) {
  for (let i = 0; i < 200; i++) {
    const result = predicate();
    if (result) return result;
    await wait(10);
  }
  throw Error("Timed out waiting for storefront");
}

for (const couponCode of [null, "NET10", "WELCOME50", "FREESHIP"]) {
for (const method of ["cod", "VNBANK", "INTCARD"]) {
  for (const addressMode of couponCode && couponCode !== "NET10" ? ["saved"] : ["saved", "new", "temporary"]) {
  test("storefront checkout via " + method + " address " + addressMode + " coupon " + (couponCode || "none"), async t => {
    const dist = path.resolve(__dirname, "../dist");
    const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
    const dom = new JSDOM('<main id="root"></main>', { url: "https://shop.test", runScripts: "outside-only",
      virtualConsole: new VirtualConsole() });
    const w = dom.window;
    t.after(() => w.close());
    const d = w.document;
    for (const [key, value] of Object.entries({ user: "Test", email: "test@example.test", role: "customer", token: "token" })) {
      w.localStorage.setItem("net_store_" + key, value);
    }
    const price = couponCode === "WELCOME50" || couponCode === "FREESHIP" ? 100000 : 20000;
    const expectedTotal = couponCode === "NET10" ? 18000 : couponCode === "WELCOME50" ? 50000 : couponCode === "FREESHIP" ? 70000 : price;
    const product = { _id: "p1", price, category: "Test", name: "Test product", images: [], stock: 9 };
    const items = [{ product, quantity: 1 }];
    const submitted = [];
    let starts = 0;
    let saves = 0;
    let savedAddresses = addressMode === "new" ? [] : [
      { _id: "secondary", label: "Văn phòng", fullName: "Other", phoneNumber: "0901234567", streetAddress: "12 Office", city: "Quận 1", state: "TP.HCM" },
      { _id: "home", label: "Nhà riêng", fullName: "Home Customer", phoneNumber: "0912345678", streetAddress: "1 Home", city: "Quận 7", state: "TP.HCM", isDefault: true },
    ];
    w.fetch = async (url, options = {}) => {
      if (url.endsWith("/auth/addresses")) {
        assert.equal(options.headers.Authorization, "Bearer token");
        if (options.method === "POST") {
          saves++;
          savedAddresses = [{ ...JSON.parse(options.body), _id: "created" }];
          return Response.json({ address: savedAddresses[0] });
        }
        return Response.json({ addresses: savedAddresses });
      }
      if (url.endsWith("/payments/methods")) return Response.json({ cod: true, vnpay: true, vnpayMinAmount: 10000 });
      if (url.endsWith("/cart/web")) return Response.json({ cart: { items } });
      if (url.endsWith("/products")) return Response.json([product]);
      if (url.endsWith("/orders/web")) {
        submitted.push(JSON.parse(options.body));
        return Response.json({ order: { _id: "order1" } });
      }
      if (url.endsWith("/vnpay/create")) {
        assert.deepEqual(JSON.parse(options.body), { orderId: "order1", bankCode: method });
        starts++;
        return Response.json({ url: "https://gateway.example.test/pay" });
      }
      return Response.json({});
    };
    w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
    const element = selector => d.querySelector(selector);
    (await until(() => element('[aria-label="Mở giỏ hàng"]'))).click();
    await until(() => element(".cart-total"));
    if (couponCode) {
      [...d.querySelectorAll('.voucher-chips button')].find(button => button.textContent.startsWith(couponCode)).click();
      await until(() => element('.voucher-chips .is-applied'));
    }
    element(".checkout-button").click();
    await until(() => element(".checkout-content"));
    assert.equal(element('input[value="VNPAYQR"]'), null);
    if (addressMode === "saved") {
      await until(() => element(".checkout-saved-address"));
      assert.equal(d.querySelectorAll(".checkout-fields input").length, 0);
      assert.equal(element('select[aria-label="Địa chỉ đã lưu"]').value, "home");
      assert.ok(d.body.textContent.includes("Home Customer"));
    } else {
      if (addressMode === "temporary") {
        [...d.querySelectorAll("input[name=addressMode]")][1].click();
      }
      await until(() => element(".checkout-fields input"));
      for (const input of d.querySelectorAll(".checkout-fields input, .checkout-fields textarea")) {
        const prototype = input.tagName === "TEXTAREA" ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, input.type === "tel" ? "0912345678" : "123 Test");
        input.dispatchEvent(new w.Event("input", { bubbles: true }));
      }
      if (addressMode === "new") {
        [...d.querySelectorAll("button")].find(button => button.textContent === "Lưu địa chỉ mặc định").click();
        await until(() => element(".checkout-saved-address"));
        assert.equal(saves, 1);
        assert.equal(savedAddresses[0].isDefault, true);
        // Mở lại checkout phải lấy địa chỉ vừa lưu, không yêu cầu nhập lần nữa.
        element('.checkout-header button').click();
        await until(() => !element('.checkout-content'));
        (await until(() => element('.cart-page-overlay .checkout-button'))).click();
        await until(() => element('.checkout-saved-address'));
        assert.equal(d.querySelectorAll('.checkout-fields input').length, 0);

      }
    }
    await until(() => !element(".place-order-button").disabled);
    assert.match(element('.order-total').textContent, new RegExp(expectedTotal.toLocaleString('vi-VN').replaceAll('.', '\\.') + 'đ'));
    if (couponCode && method === "cod") {
      element('input[value="VNBANK"]').click();
      await wait(10);
      assert.match(element('.order-total').textContent, new RegExp(expectedTotal.toLocaleString('vi-VN').replaceAll('.', '\\.') + 'đ'));
    }
    element('input[value="' + method + '"]').click();
    await wait(10);
    element(".place-order-button").click();
    await until(() => method === "cod" ? element(".success") : starts);
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].paymentMethod, method === "cod" ? "cod" : "vnpay");
    assert.equal(submitted[0].shippingAddress.fullName, addressMode === "saved" ? "Home Customer" : "123 Test");
    assert.equal(submitted[0].expectedTotal, expectedTotal);
    assert.equal(submitted[0].couponCode, couponCode || undefined);
    assert.equal(d.querySelectorAll('.checkout-bottom').length, 0);
    assert.equal(starts, method === "cod" ? 0 : 1);
    if (addressMode === "temporary") { assert.equal(saves, 0); assert.equal(savedAddresses[1].fullName, "Home Customer"); }
  });
}

}

}

for (const scenario of ["delayed", "timeout", "cancelled", "failed"]) {
  test("payment-result " + scenario, async t => {
    const dist = path.resolve(__dirname, "../dist");
    const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
    const dom = new JSDOM('<main id="root"></main>', { url: "https://shop.test/payment-result?orderId=o1&vnp_ResponseCode=00" +
      (scenario === "cancelled" ? "&cancelled=1" : ""), runScripts: "outside-only", virtualConsole: new VirtualConsole() });
    const w = dom.window;
    t.after(() => w.close());
    w.localStorage.setItem("net_store_token", "customer");
    const nativeTimer = w.setTimeout.bind(w);
    w.setTimeout = (fn, ms, ...args) => nativeTimer(fn, ms === 2500 ? 15 : ms, ...args);
    let polls = 0;
    const actions = [];
    w.fetch = async (url, options) => {
      if (options.method === "PATCH" || options.method === "POST") {
        actions.push([url, options.method, JSON.parse(options.body)]);
        return Response.json({ url: "https://gateway.example.test/pay" });
      }
      assert.ok(url.endsWith("/orders/o1/status"));
      assert.equal(options.headers.Authorization, "Bearer customer");
      polls++;
      const paid = scenario === "delayed" && polls === 2;
      return Response.json({ orderStatus: paid ? "confirmed" : "pending",
        paymentStatus: paid ? "paid" : scenario === "failed" ? "failed" : "unpaid",
        paymentMethod: "vnpay", expiresAt: new Date(Date.now()+900000).toISOString() });
    };
    w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
    const expected = { delayed: "Thanh toán thành công", failed: "Thanh toán thất bại",
      cancelled: "Bạn đã hủy thanh toán", timeout: "kiểm tra lại trong Đơn hàng của tôi" }[scenario];
    await until(() => w.document.body.textContent.includes(expected));
    if (scenario === "timeout") assert.equal(polls, 6);
    if (scenario === "delayed") assert.equal(polls, 2);
    if (scenario === "failed") {
      [...w.document.querySelectorAll("button")].find(b => b.textContent === "Thanh toán lại").click();
      await until(() => actions.length);
      assert.ok(actions[0][0].endsWith("/vnpay/create"));
      assert.deepEqual(actions[0].slice(1), ["POST", { orderId: "o1" }]);
    }
    if (scenario === "cancelled") {
      const buttons = [...w.document.querySelectorAll("button")];
      assert.ok(buttons.some(b => b.textContent === "Thanh toán lại"));
      buttons.find(b => b.textContent === "Đổi phương thức").click();
      await until(() => w.document.querySelector("select"));
      assert.equal(w.document.querySelector("a").pathname, "/orders");
      [...w.document.querySelectorAll("button")].find(b => b.textContent === "Xác nhận").click();
      await until(() => actions.length);
      assert.ok(actions[0][0].endsWith("/orders/o1/payment-method"));
      assert.deepEqual(actions[0].slice(1), ["PATCH", { paymentMethod: "cod" }]);
    }
  });
}
