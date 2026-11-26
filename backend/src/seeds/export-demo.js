import dns from "node:dns";
import { writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { ENV } from "../config/env.js";
import { categoryDefinitions } from "../../../shared/catalog-taxonomy.mjs";

// Export the requested public demo catalog only, never users, orders or secrets.
const fields = ["_id", "seedKey", "isDemo", "name", "description", "category", "categoryId", "categorySlug", "categories", "tags", "brand", "gender", "os", "sellerName", "sellerLocation", "images", "price", "originalPrice", "stock", "averageRating", "totalReviews", "sold", "salesLast7Days", "isPinned", "createdAt", "updatedAt"];
try {
  if (ENV.MONGO_DNS_SERVERS) dns.setServers(ENV.MONGO_DNS_SERVERS.split(",").map(s => s.trim()).filter(Boolean));
  await mongoose.connect(ENV.DB_URL || process.env.MONGO_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const products = await db.collection("products").find({ isDemo: true, seedKey: /^net-store-demo-v1:/ }, { projection: Object.fromEntries(fields.map(key => [key, 1])) }).sort({ seedKey: 1 }).toArray();
  const categories = await db.collection("categories").find({ slug: { $in: categoryDefinitions.map(c => c.slug) }, isArchived: { $ne: true } }, { projection: { _id: 1, name: 1, slug: 1, parentSlug: 1, sortOrder: 1, isVisible: 1, isArchived: 1 } }).sort({ sortOrder: 1 }).toArray();
  if (products.length !== 1000 || categories.length !== 50) throw Error("Snapshot phải có đúng 1.000 sản phẩm mẫu và 50 danh mục chuẩn.");
  const destination = process.argv[2] || new URL("./demo-catalog.ejson", import.meta.url);
  await writeFile(destination, EJSON.stringify({ formatVersion: 1, exportedAt: new Date(), categories, products }, null, 2) + "\n");
  console.log(JSON.stringify({ products: products.length, categories: categories.length, file: "demo-catalog.ejson", readOnlyDatabase: true }));
} catch (error) {
  console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]")); process.exitCode = 1;
} finally { await mongoose.disconnect(); }
