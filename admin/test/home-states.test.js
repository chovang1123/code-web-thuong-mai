import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
const require = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [path.resolve(directory, "../../mobile")] }));
async function until(predicate) { for (let index = 0; index < 200; index++) { if (predicate()) return; await wait(10); } throw Error("UI state timed out"); }
function boot(t, productRequest, role = "customer") {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://home.test", runScripts: "outside-only", virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window;
  for (const [key, value] of Object.entries({ user: "Test", email: "test@example.test", role, token: "test" })) w.localStorage.setItem("net_store_" + key, value);
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const intervals = [];
  const originalInterval = w.setInterval.bind(w);
  w.setInterval = (callback, delay) => { intervals.push(delay); return originalInterval(callback, delay); };
  const calls = [];
  w.fetch = (url, options = {}) => { calls.push({ url, method: options.method || "GET" }); return url.endsWith("/products") ? productRequest() : Promise.resolve(Response.json({ cart: { items: [] } })); };
  const dist = path.resolve(directory, "../dist");
  const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
  w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
  return { w, d: w.document, intervals, calls };
}
const products = Array.from({ length: 6 }, (_, index) => ({ _id: String(index), name: `Sản phẩm API ${index}`, category: "Nhà cửa", price: 100000, images: [], stock: 10 }));
test("loading never renders demo products; real response removes skeleton; reduced motion disables rotation", async t => {
  let resolve;
  const response = new Promise(done => { resolve = done; });
  const { d, intervals } = boot(t, () => response);
  await until(() => d.querySelector(".home-loading"));
  assert.equal(d.querySelectorAll(".product-card").length, 0);
  resolve(Response.json(products));
  await until(() => d.querySelectorAll(".shelf-track .product-card").length === 6);
  assert.equal(d.querySelector(".home-loading"), null);
  assert.ok(!intervals.includes(6000));
  assert.equal(d.querySelector(".product-category-tag"), null);
  assert.match(d.querySelector(".product-stats").textContent, /Mới/);
  d.querySelectorAll(".featured-option")[1].click();
  await until(() => d.querySelector(".featured-copy h3").textContent === products[1].name);
});
test("empty DB remains empty and never exposes generated products", async t => {
  const { d } = boot(t, () => Promise.resolve(Response.json([])));
  await until(() => d.querySelector(".home-empty"));
  assert.match(d.querySelector(".home-empty").textContent, /Cửa hàng chưa có sản phẩm/);
  assert.equal(d.querySelectorAll(".product-card").length, 0);
});
test("opening admin with an empty database performs no automatic seed or product write", async t => {
  const { d, calls } = boot(t, () => Promise.resolve(Response.json([])), "admin");
  await until(() => d.body.textContent.includes("Kho hàng hiện chưa có sản phẩm"));
  assert.ok(calls.some(call => call.url.endsWith("/web-admin/products")));
  assert.ok(calls.every(call => call.method === "GET"));
  assert.ok(!calls.some(call => call.url.includes("/seed")));
});
test("failed API shows retry inside content sections and recovers without demo fallback", async t => {
  let count = 0;
  const { d } = boot(t, () => Promise.resolve(++count === 1 ? Response.json({}, { status: 503 }) : Response.json(products)));
  await until(() => d.querySelectorAll(".home-load-error").length === 2);
  assert.equal(d.querySelectorAll(".product-card").length, 0);
  d.querySelector(".home-load-error button").click();
  await until(() => d.querySelectorAll(".shelf-track .product-card").length === 6);
  assert.equal(d.querySelector(".home-load-error"), null);
});
