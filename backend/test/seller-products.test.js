import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import sellerRoutes from "../src/routes/seller.route.js";
import cloudinary, { parseCloudinaryUrl } from "../src/config/cloudinary.js";
import { ENV } from "../src/config/env.js";
import { Category } from "../src/models/category.model.js";
import { Product } from "../src/models/product.model.js";
import { User } from "../src/models/user.model.js";
import { createWebAuthToken } from "../src/utils/web-auth.js";

test("seller product API accepts local files and preserves existing images on edit", async t => {
  process.env.MONGO_URI ||= "seller-upload-test-secret";
  const seller = { _id: "seller-1", role: "seller", shopName: "Shop", shopLocation: "HCM" };
  let existing = { _id: "product-1", images: ["https://cdn.test/old.jpg", "https://cdn.test/second.jpg"] };
  let saved;
  let uploads = 0;
  let uploadFailure = null;
  let uploadOptions;
  const previousPreset = ENV.CLOUDINARY_UPLOAD_PRESET;
  const previousUnsigned = ENV.CLOUDINARY_UPLOAD_UNSIGNED;
  ENV.CLOUDINARY_UPLOAD_PRESET = "";
  ENV.CLOUDINARY_UPLOAD_UNSIGNED = false;
  t.after(() => { ENV.CLOUDINARY_UPLOAD_PRESET = previousPreset; ENV.CLOUDINARY_UPLOAD_UNSIGNED = previousUnsigned; });
  t.mock.method(cloudinary, "config", () => ({ cloud_name: "test-cloud", api_key: "test-key", api_secret: "test-secret" }));
  t.mock.method(User, "findById", async () => seller);
  t.mock.method(Category, "findOne", async () => ({ _id: "category-1" }));
  t.mock.method(Product, "create", async data => { saved = data; return { _id: "product-1", ...data }; });
  t.mock.method(Product, "findOne", async filter => {
    assert.equal(filter.sellerId, seller._id);
    return existing;
  });
  t.mock.method(Product, "findOneAndUpdate", async (filter, data) => {
    assert.equal(filter.sellerId, seller._id);
    saved = data;
    return { _id: "product-1", ...data };
  });
  t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => ({
    end(buffer) {
      uploads++;
      uploadOptions = options;
      assert.equal(options.resource_type, "image");
      assert.equal(options.folder, "products");
      assert.ok(Buffer.isBuffer(buffer));
      callback(uploadFailure, { secure_url: "https://res.cloudinary.com/test-cloud/image/upload/v1/products/uploaded.png", public_id: "products/uploaded", api_secret: "must-not-be-returned" });
    },
  }));
  t.mock.method(console, "error", () => {});
  const app = express();
  app.use(express.json());
  app.use("/seller", sellerRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/seller/products`;
  const headers = { Authorization: `Bearer ${createWebAuthToken(seller._id)}` };
  const fields = { name: "Sản phẩm thử", description: "Mô tả", category: "Nhà cửa", price: "250000", stock: "20" };
  const form = (file = new Blob(["image bytes"], { type: "image/png" }), filename = "photo.png") => {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    if (file) body.append("image", file, filename);
    return body;
  };
  const request = (body, method = "POST", auth = headers) => fetch(base + (method === "PUT" ? "/product-1" : ""), { method, headers: auth, body });
  const upload = (body, auth = headers) => fetch(base.replace(/\/products$/, "/uploads"), { method: "POST", headers: auth, body });
  const image = { url: "https://res.cloudinary.com/test-cloud/image/upload/v1/products/uploaded.png", publicId: "products/uploaded" };

  await t.test("creation uploads file bytes and stores the resulting URL", async () => {
    assert.equal((await request(form())).status, 201);
    assert.deepEqual(saved.images, [image.url]);
    assert.deepEqual(saved.imagePublicIds, [image.publicId]);
    assert.equal(saved.sellerId, seller._id);
    assert.equal(saved.price, 250000);
    assert.equal(saved.stock, 20);
    assert.equal(uploads, 1);
  });
  await t.test("editing without a replacement retains all original images", async () => {
    assert.equal((await request(form(null), "PUT")).status, 200);
    assert.deepEqual(saved.images, existing.images);
    assert.equal(uploads, 1);
    assert.equal((await request(form(), "PUT")).status, 200);
    assert.deepEqual(saved.images, [image.url]);
    assert.equal(uploads, 2);
  });
  await t.test("URLs alone cannot create a product", async () => {
    const response = await request(JSON.stringify({ ...fields, image: "https://external.test/photo.jpg" }), "POST", { ...headers, "Content-Type": "application/json" });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /chọn ảnh/);
  });
  await t.test("invalid, oversized and extra files return readable JSON errors", async () => {
    for (const body of [
      form(new Blob(["text"], { type: "text/plain" }), "photo.png"),
      form(new Blob(["image"], { type: "image/png" }), "photo.exe"),
      form(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" })),
      (() => { const body = form(); body.append("image", new Blob(["extra"], { type: "image/png" }), "extra.png"); return body; })(),
    ]) {
      const response = await request(body);
      assert.equal(response.status, 400);
      assert.ok((await response.json()).message);
    }
    assert.equal(uploads, 2);
  });
  await t.test("authentication and product ownership are checked before cloud upload", async () => {
    assert.equal((await request(form(), "POST", {})).status, 401);
    existing = null;
    assert.equal((await request(form(), "PUT")).status, 404);
    assert.equal(uploads, 2);
  });
  await t.test("upload failure returns an error and does not create a product", async () => {
    saved = null;
    uploadFailure = new Error("Upload unavailable");
    const response = await request(form());
    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /Không thể tải ảnh/);
    assert.equal(saved, null);
  });
  await t.test("permission and configuration errors explain why uploading is blocked without exposing secrets", async () => {
    for (const code of [401, 403, 404]) {
      uploadFailure = { http_code: code, message: "secret-provider-details" };
      const response = await request(form());
      assert.equal(response.status, 503);
      const { message } = await response.json();
      assert.match(message, code === 404 ? /cấu hình/ : /quyền tải lên/);
      assert.ok(!message.includes("secret-provider-details"));
      assert.equal(saved, null);
    }
  });
  await t.test("a pasted connection URL is rejected before contacting Cloudinary", async () => {
    cloudinary.config.mock.mockImplementation(() => ({ cloud_name: "CLOUDINARY_URL=cloudinary://key:secret@test-cloud", api_key: "key", api_secret: "secret" }));
    const previousUploads = uploads;
    const response = await request(form());
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /cấu hình/);
    assert.equal(uploads, previousUploads);
  });
  cloudinary.config.mock.mockImplementation(() => ({ cloud_name: "test-cloud", api_key: "test-key", api_secret: "test-secret" }));
  uploadFailure = null;
  await t.test("upload endpoint returns only url and publicId for all allowed image types", async () => {
    for (const [filename, type] of [["photo.jpg", "image/jpeg"], ["photo.jpeg", "image/jpeg"], ["photo.PNG", "image/png"], ["photo.webp", "image/webp"]]) {
      const response = await upload(form(new Blob(["image bytes"], { type }), filename));
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), image);
    }
    assert.equal(uploadOptions.upload_preset, undefined);
    assert.equal(uploadOptions.unsigned, undefined);
  });
  await t.test("upload endpoint requires authentication, one image, and a maximum of 5 MB", async () => {
    assert.equal((await upload(form(), {})).status, 401);
    for (const body of [form(null), form(new Blob(["text"], { type: "text/plain" }), "bad.txt"), form(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" })),
      (() => { const body = form(); body.append("image", new Blob(["extra"], { type: "image/png" }), "extra.png"); return body; })()]) {
      const response = await upload(body);
      assert.equal(response.status, 400);
      assert.ok((await response.json()).message);
    }
  });
  await t.test("upload preset is taken only from backend configuration", async () => {
    ENV.CLOUDINARY_UPLOAD_PRESET = "configured-preset";
    const body = form();
    body.append("upload_preset", "untrusted-override");
    body.append("folder", "wrong-folder");
    assert.equal((await upload(body)).status, 201);
    assert.equal(uploadOptions.upload_preset, "configured-preset");
    assert.equal(uploadOptions.folder, "products");
    ENV.CLOUDINARY_UPLOAD_PRESET = "";
  });
  await t.test("products accept backend upload references without uploading the same file again", async () => {
    const previousUploads = uploads;
    const response = await request(JSON.stringify({ ...fields, image }), "POST", { ...headers, "Content-Type": "application/json" });
    assert.equal(response.status, 201);
    assert.deepEqual(saved.images, [image.url]);
    assert.deepEqual(saved.imagePublicIds, [image.publicId]);
    assert.equal(uploads, previousUploads);
    for (const invalidImage of [{ ...image, url: "https://external.test/photo.png" }, { ...image, publicId: "products/other" }, { ...image, url: image.url.replace("test-cloud", "other-cloud") }]) {
      assert.equal((await request(JSON.stringify({ ...fields, image: invalidImage }), "POST", { ...headers, "Content-Type": "application/json" })).status, 400);
    }
  });
  await t.test("unsigned uploading requires an explicitly configured preset and never switches automatically", async () => {
    ENV.CLOUDINARY_UPLOAD_UNSIGNED = true;
    ENV.CLOUDINARY_UPLOAD_PRESET = "";
    const previousUploads = uploads;
    const invalidResponse = await upload(form());
    assert.equal(invalidResponse.status, 503);
    assert.match((await invalidResponse.json()).message, /preset/);
    assert.equal(uploads, previousUploads);
    ENV.CLOUDINARY_UPLOAD_PRESET = "configured-unsigned-preset";
    assert.equal((await upload(form())).status, 201);
    assert.equal(uploadOptions.unsigned, true);
    assert.equal(uploadOptions.upload_preset, "configured-unsigned-preset");
    assert.equal(uploadOptions.folder, "products");
    ENV.CLOUDINARY_UPLOAD_UNSIGNED = false;
    ENV.CLOUDINARY_UPLOAD_PRESET = "";
  });
  await t.test("forbidden upload requests return a safe JSON error from the upload endpoint", async () => {
    uploadFailure = { http_code: 403, message: "provider-secret-details" };
    const response = await upload(form());
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.deepEqual(Object.keys(data), ["message"]);
    assert.match(data.message, /quyền tải lên/);
    assert.ok(!data.message.includes("provider-secret-details"));
  });
});

test("Cloudinary credentials are parsed exclusively from a connection URL", () => {
  assert.deepEqual(parseCloudinaryUrl("cloudinary://example-key:example%3Asecret@test-cloud"), { cloud_name: "test-cloud", api_key: "example-key", api_secret: "example:secret" });
  for (const value of [undefined, "", "cloudinary://test-cloud", "https://example-key:example-secret@test-cloud", "CLOUDINARY_URL=cloudinary://example-key:example-secret@test-cloud"]) assert.equal(parseCloudinaryUrl(value), null);
});
