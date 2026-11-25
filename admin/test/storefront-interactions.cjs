const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: wait } = require("node:timers/promises");
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [path.resolve(__dirname, "../../mobile")] }));

async function until(predicate) {
  for (let index = 0; index < 200; index++) { const value = predicate(); if (value) return value; await wait(10); }
  throw Error("Timed out waiting for UI");
}
const products = [
  { _id: "a", name: "Sổ kế hoạch", category: "Văn phòng phẩm", price: 100000, originalPrice: 150000, averageRating: 4.5, sold: 20, stock: 10, images: [] },
  { _id: "b", name: "Kem dưỡng", category: "Làm đẹp", price: 200000, averageRating: 4, sold: 10, stock: 10, images: [] },
  { _id: "c", name: "Serum dưỡng da", category: "Làm đẹp", price: 240000, originalPrice: 300000, averageRating: 4.8, sold: 40, stock: 10, images: [] },
  { _id: "d", name: "Mặt nạ dưỡng da", category: "Làm đẹp", price: 210000, stock: 10, images: [] },
  { _id: "e", name: "Bút viết", category: "Văn phòng phẩm", price: 20000, stock: 10, images: [] },
  { _id: "f", name: "Giấy ghi chú", category: "Văn phòng phẩm", price: 30000, stock: 10, images: [] },
  { _id: "g", name: "Toner dịu nhẹ", category: "Làm đẹp", price: 220000, stock: 10, images: [] },
];

test("category filters every shelf; viewed history and cart operations keep working", async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://shop.test", runScripts: "outside-only", virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const [key, value] of Object.entries({ user: "Khách thử nghiệm", email: "ui@example.test", role: "customer", token: "fixture" })) w.localStorage.setItem("net_store_" + key, value);
  let items = [];
  w.fetch = async (url, options = {}) => {
    if (url.endsWith("/products")) return Response.json(products);
    if (url.endsWith("/cart/web")) {
      if (options.method === "PUT") items = JSON.parse(options.body).items.map(item => ({ product: products.find(product => product._id === item.productId), quantity: item.quantity }));
      return Response.json({ cart: { items } });
    }
    return Response.json([]);
  };
  const dist = path.resolve(__dirname, "../dist");
  const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
  w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
  await until(() => d.querySelectorAll(".shelf-track .product-card").length === 7);
  d.querySelector(".category-menu").open = true;
  [...d.querySelectorAll(".category-dropdown button")].find(button => button.textContent === "Làm đẹp").click();
  await until(() => d.querySelectorAll(".shelf-track .product-card").length === 4);
  assert.equal(d.querySelectorAll(".category-dropdown [aria-pressed=true]").length, 1);
  assert.equal(d.querySelectorAll(".category-chips [aria-pressed=true]").length, 1);
  assert.match(d.querySelector(".filter-chip").textContent, /Làm đẹp/);
  d.querySelector(".filter-chip").click();
  await until(() => d.querySelectorAll(".shelf-track .product-card").length === 7);
  d.querySelector('.shelf-track [aria-label="Xem Kem dưỡng"]').click();
  await until(() => d.querySelector(".product-detail"));
  assert.equal(JSON.parse(w.localStorage.getItem("net_store_recently_viewed"))[0]._id, "b");
  assert.match(d.querySelector('[data-kind="recommendations"] .shelf-heading p').textContent, /Vì bạn đã xem Kem dưỡng/);
  assert.equal(d.querySelectorAll('[data-kind="recommendations"] .product-card').length, 3);
  d.querySelector('[aria-label="Đóng chi tiết sản phẩm"]').click();
  await until(() => !d.querySelector(".product-detail"));
  d.querySelector('.shelf-track [aria-label="Thêm Kem dưỡng vào giỏ"]').click();
  await until(() => d.querySelector(".cart-count").textContent === "1");
  d.querySelector('[aria-label="Mở giỏ hàng"]').click();
  await until(() => d.querySelector(".cart-drawer"));
  d.querySelector('[aria-label="Tăng số lượng Kem dưỡng"]').click();
  await until(() => d.querySelector(".cart-count").textContent === "2");
  assert.match(d.querySelector(".cart-summary").textContent, /400.000đ/);
  assert.equal(d.querySelectorAll(".cart-summary .cart-total").length, 1);
  d.querySelector(".view-cart-button").click();
  await until(() => d.querySelector(".cart-page-overlay"));
  assert.equal(d.querySelector(".cart-drawer"), null);
  d.querySelector('[aria-label="Xóa Kem dưỡng khỏi giỏ"]').click();
  await until(() => d.querySelector(".empty-cart"));
  assert.equal(d.querySelector(".cart-count").textContent, "0");
});
