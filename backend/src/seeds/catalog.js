import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalProductFields } from "../../../shared/catalog-taxonomy.mjs";
import { categoryDefinitions, productFamilies } from "./taxonomy.js";

export const SEED_BATCH = "net-store-demo-v1";
const sourceProducts = JSON.parse(readFileSync(new URL("./source-products.json", import.meta.url), "utf8"));
const sourceById = new Map(sourceProducts.map(product => [product.id, product]));
const locations = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Huế", "Đồng Nai"];
const shops = ["Nét Select", "Mây Market", "An Nhiên Store", "Góc Nhà Mình", "Mộc Shop", "Sao Mai", "Urban Choice", "Daily Mart"];

function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = Math.imul(value ^ value >>> 15, 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}

export function buildCatalog({ now = new Date(), seed = 20261125 } = {}) {
  const random = randomGenerator(seed);
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const counts = productFamilies.map(() => 10);
  for (let remaining = 1000 - counts.reduce((a, b) => a + b, 0); remaining > 0; remaining--) {
    const available = counts.map((count, index) => count < 30 ? index : -1).filter(index => index >= 0);
    counts[available[integer(0, available.length - 1)]]++;
  }
  const products = productFamilies.flatMap((family, familyIndex) => Array.from({ length: counts[familyIndex] }, (_, index) => {
    const source = sourceById.get(family.sourceIds[index % family.sourceIds.length]);
    const edition = Math.floor(index / family.sourceIds.length);
    const shopIndex = edition % shops.length;
    // Sample offers and bundles of the pictured base item, without inventing specs.
    const units = 1 + Math.floor(edition / shops.length);
    const unitPrice = Math.max(15000, Math.round(source.price * 25000 / 1000) * 1000);
    const price = Math.round(unitPrice * units * (1 + integer(-12, 15) / 100) / 1000) * 1000;
    const discount = index % 3 === 0 ? integer(15, 40) : 0;
    const sold = integer(25, 12000);
    const totalReviews = integer(5, Math.max(5, Math.floor(sold * 0.65)));
    const seedKey = `${SEED_BATCH}:${family.slug}:${index + 1}`;
    const createdAt = new Date(now.getTime() - integer(0, 180) * 86400000 - integer(0, 86399) * 1000);
    return {
      _id: createHash("sha256").update(seedKey).digest("hex").slice(0, 24),
      seedKey, isDemo: true,
      name: `${source.title}${source.id === 191 ? " — Đồng hồ nữ" : ""}${units > 1 ? ` — bộ ${units} sản phẩm` : ""} · ${shops[shopIndex]}`,
      description: `${source.description}\n\n${family.name}. ${units > 1 ? `Bộ gồm ${units} sản phẩm cùng loại. ` : ""}Gian hàng: ${shops[shopIndex]}, ${locations[shopIndex]}. Dữ liệu mẫu phục vụ phát triển giao diện; số sao, đánh giá và lượt bán được mô phỏng.`,
      category: family.name, categories: family.categories,
      brand: source.brand || "Net Select", sellerName: shops[shopIndex], sellerLocation: locations[shopIndex],
      images: source.images.length ? source.images.slice(0, 3) : [source.thumbnail],
      price, ...(discount ? { originalPrice: Math.ceil(price / (1 - discount / 100) / 1000) * 1000 } : {}),
      stock: index % 23 === 0 ? 0 : integer(3, 300),
      averageRating: integer(32, 50) / 10, totalReviews, sold,
      salesLast7Days: integer(1, Math.max(1, Math.floor(sold * 0.18))),
      isPinned: familyIndex < 5 && index === 1,
      createdAt, updatedAt: createdAt,
    };
  }));
  return { categories: categoryDefinitions, products: products.map(p => ({ ...p, ...canonicalProductFields(p) })) };
}

export function summarizeCatalog({ categories, products }) {
  return {
    products: products.length, categories: categories.length,
    leafCategories: categories.filter(c => c.parentSlug).length,
    productsPerLeaf: Object.fromEntries(categories.filter(c => c.parentSlug || !categories.some(child => child.parentSlug === c.slug)).map(c => [c.name, products.filter(product => product.categorySlug === c.slug).length])),
    ratingRange: [Math.min(...products.map(product => product.averageRating)), Math.max(...products.map(product => product.averageRating))],
    soldRange: [Math.min(...products.map(product => product.sold)), Math.max(...products.map(product => product.sold))],
  };
}
