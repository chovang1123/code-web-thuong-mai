import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as wait } from "node:timers/promises";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [path.resolve(import.meta.dirname, "../../mobile")] }));
async function until(predicate) {
  for (let index = 0; index < 200; index++) {
    const value = predicate();
    if (value) return value;
    await wait(10);
  }
  throw new Error("Timed out waiting for seller UI");
}

async function setup(t, dashboardError = false) {
  const dom = new JSDOM('<div id="root"></div>', { url: "https://shop.test", runScripts: "outside-only", virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document;
  for (const [key, value] of Object.entries({ user: "Seller", email: "seller@test.local", role: "seller", token: "fixture" })) w.localStorage.setItem("net_store_" + key, value);
  const product = { _id: "product-1", name: "Sản phẩm", description: "Mô tả", category: "Nhà cửa", price: 250000, stock: 20, images: ["https://cdn.test/old.png"] };
  let failSave = true;
  let deferNextSave = false;
  let pendingSave;
  let failProductOnce = false;
  const uploadedImage = { url: "https://res.cloudinary.com/test-cloud/image/upload/v1/products/uploaded.png", publicId: "products/uploaded" };
  const requests = [], revoked = [];
  w.URL.createObjectURL = () => "blob:preview";
  w.URL.revokeObjectURL = url => revoked.push(url);
  w.fetch = async (url, options = {}) => {
    if (url.endsWith("/seller/dashboard")) {
      if (dashboardError) throw new TypeError("Failed to fetch");
      return Response.json({ shop: { name: "Shop", location: "HCM" }, stats: {}, products: [product], chart: [], orders: [] });
    }
    if (url.includes("/seller/products") || url.endsWith("/seller/uploads")) {
      requests.push({ ...options, url });
      if (deferNextSave) {
        deferNextSave = false;
        return new Promise((resolve, reject) => { pendingSave = { resolve, reject }; });
      }
      if (failSave) throw new TypeError("Failed to fetch");
      if (url.endsWith("/seller/uploads")) return Response.json(uploadedImage);
      if (failProductOnce) {
        failProductOnce = false;
        return Response.json({ message: "Không thể lưu sản phẩm lúc này." }, { status: 500 });
      }
      return Response.json({ product });
    }
    return Response.json([]);
  };
  const dist = path.resolve(import.meta.dirname, "../dist");
  const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
  w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
  await until(() => d.querySelector(".seller-page-heading"));
  const open = async () => {
    d.querySelector(".seller-page-heading .seller-primary-button").click();
    return until(() => d.querySelector(".seller-product-modal"));
  };
  const selectFile = (file = new w.File(["image"], "local.png", { type: "image/png" })) => {
    const input = d.querySelector('input[type="file"]');
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  const fill = async () => {
    const form = d.querySelector(".seller-product-modal");
    for (const [selector, value] of [['input[placeholder="Tên sản phẩm"]', "Sản phẩm mới"], ["textarea", "Mô tả mới"], ['input[placeholder="250000"]', "250000"], ['input[placeholder="20"]', "20"]]) {
      const input = form.querySelector(selector);
      const prototype = input.tagName === "TEXTAREA" ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
      await wait(0);
    }
    form.querySelector("select").value = "Nhà cửa";
    form.querySelector("select").dispatchEvent(new w.Event("change", { bubbles: true }));
    selectFile();
    await until(() => d.querySelector(".seller-image-preview"));
  };
  const submit = () => d.querySelector(".seller-product-modal").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  return { w, d, open, fill, selectFile, submit, requests, revoked, succeed: () => { failSave = false; }, defer: () => { deferNextSave = true; }, pending: () => pendingSave, failProduct: () => { failProductOnce = true; }, uploadedImage };
}

test("local image upload, retry and reopening do not retain product errors", async t => {
  const ui = await setup(t);
  const { d, open, fill, submit, requests } = ui;
  await open();
  assert.equal(d.querySelector('input[type="url"]'), null);
  await fill();
  submit();
  await until(() => d.querySelector(".seller-product-modal [role=alert]"));
  assert.match(d.querySelector("[role=alert]").textContent, /Failed to fetch/);
  assert.equal(d.querySelector(".seller-content [role=alert]"), null);
  assert.equal(requests[0].headers.Authorization, "Bearer fixture");
  assert.equal(requests[0].headers["Content-Type"], undefined);
  assert.equal(requests[0].body.get("image").name, "local.png");
  assert.ok(requests[0].url.endsWith("/seller/uploads"));
  d.querySelector('[aria-label="Đóng lỗi sản phẩm"]').click();
  await until(() => !d.querySelector("[role=alert]"));
  submit();
  await until(() => d.querySelector("[role=alert]"));
  for (const close of [
    () => d.querySelector('[aria-label="Đóng"]').click(),
    () => d.querySelector(".seller-secondary-button").click(),
    () => d.querySelector(".seller-modal-backdrop").dispatchEvent(new ui.w.MouseEvent("mousedown", { bubbles: true })),
  ]) {
    close();
    await until(() => !d.querySelector(".seller-product-modal"));
    await open();
    assert.equal(d.querySelector("[role=alert]"), null);
    assert.equal(d.querySelector(".seller-image-preview"), null);
    await fill();
    submit();
    await until(() => d.querySelector("[role=alert]"));
  }
  ui.succeed();
  submit();
  await until(() => !d.querySelector(".seller-product-modal"));
  assert.equal(d.querySelector("[role=alert]"), null);
  assert.match(d.querySelector('[role="status"]').textContent, /Đã thêm sản phẩm mới/);
  assert.equal(requests.at(-1).headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(requests.at(-1).body).name, "Sản phẩm mới");
  assert.deepEqual(JSON.parse(requests.at(-1).body).image, ui.uploadedImage);
  assert.ok(ui.revoked.includes("blob:preview"));
  d.querySelectorAll(".seller-nav button")[1].click();
  await until(() => d.querySelector(".seller-row-actions button"));
  d.querySelector(".seller-row-actions button").click();
  await until(() => d.querySelector(".seller-product-modal"));
  assert.equal(d.querySelector('input[type="file"]').required, false);
  assert.equal(d.querySelector(".seller-image-preview").src, "https://cdn.test/old.png");
  submit();
  await until(() => !d.querySelector(".seller-product-modal"));
  assert.equal(requests.at(-1).method, "PUT");
  assert.equal(JSON.parse(requests.at(-1).body).image, undefined);
});

test("image validation and dashboard errors stay within their own context", async t => {
  const ui = await setup(t, true);
  const { d, w, open, selectFile } = ui;
  await until(() => d.querySelector(".seller-content [role=alert]"));
  await open();
  assert.equal(d.querySelector(".seller-product-modal [role=alert]"), null);
  selectFile(new w.File(["text"], "bad.txt", { type: "text/plain" }));
  await until(() => d.querySelector(".seller-product-modal [role=alert]"));
  assert.match(d.querySelector(".seller-product-modal [role=alert]").textContent, /JPG, PNG/);
  selectFile(new w.File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }));
  await until(() => d.querySelector(".seller-product-modal [role=alert]").textContent.includes("5 MB"));
  selectFile();
  await until(() => !d.querySelector(".seller-product-modal [role=alert]"));
  d.querySelector('[aria-label="Đóng"]').click();
  await until(() => !d.querySelector(".seller-product-modal"));
  d.querySelector('[aria-label="Đóng thông báo lỗi"]').click();
  await until(() => !d.querySelector("[role=alert]"));
  await open();
  assert.equal(d.querySelector("[role=alert]"), null);
});

test("late responses from a closed product form cannot affect the next form", async t => {
  const ui = await setup(t);
  for (const outcome of ["failure", "success"]) {
    await ui.open();
    await ui.fill();
    ui.defer();
    ui.submit();
    await until(() => ui.d.querySelector('button[type="submit"]').disabled);
    ui.d.querySelector('[aria-label="Đóng"]').click();
    await until(() => !ui.d.querySelector(".seller-product-modal"));
    assert.equal(ui.requests.at(-1).signal.aborted, true);
    await ui.open();
    if (outcome === "failure") ui.pending().reject(new TypeError("Failed to fetch"));
    else ui.pending().resolve(Response.json({ product: {} }));
    await wait(30);
    assert.ok(ui.d.querySelector(".seller-product-modal"));
    assert.equal(ui.d.querySelector("[role=alert]"), null);
    assert.equal(ui.d.querySelector('button[type="submit"]').disabled, false);
    ui.d.querySelector('[aria-label="Đóng"]').click();
    await until(() => !ui.d.querySelector(".seller-product-modal"));
  }
});

test("retrying a product save reuses its uploaded image and keeps the preview valid", async t => {
  const ui = await setup(t);
  ui.succeed();
  ui.failProduct();
  await ui.open();
  await ui.fill();
  ui.submit();
  await until(() => ui.d.querySelector("[role=alert]"));
  assert.match(ui.d.querySelector("[role=alert]").textContent, /Không thể lưu sản phẩm/);
  assert.equal(ui.revoked.length, 0);
  assert.equal(ui.requests.filter(request => request.url.endsWith("/seller/uploads")).length, 1);
  ui.submit();
  await until(() => !ui.d.querySelector(".seller-product-modal"));
  assert.equal(ui.requests.filter(request => request.url.endsWith("/seller/uploads")).length, 1);
  assert.equal(ui.requests.filter(request => request.url.endsWith("/seller/products")).length, 2);
  assert.deepEqual(JSON.parse(ui.requests.at(-1).body).image, ui.uploadedImage);
  assert.ok(ui.requests.every(request => !request.url.startsWith("https://api.cloudinary.com")));
});
