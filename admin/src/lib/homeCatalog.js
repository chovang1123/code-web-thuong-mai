import { productDiscount, productRating } from "./products.js";

export const weeklySales = product => Math.max(0, Number(product.salesLast7Days) || 0);
const recentFirst = (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);

export function buildHomeShelves(products, { category = "Tất cả", search = "" } = {}) {
  const shelves = [];
  const add = (kind, title, subtitle, items) => { if (items.length >= 3) shelves.push({ kind, title, subtitle, products: items.slice(0, 12) }); };
  if (search.trim()) return products.length ? [{ kind: "search", title: "Kết quả tìm kiếm", subtitle: `${products.length} sản phẩm phù hợp`, products: products.slice(0, 12), minItems: 1 }] : [];
  add("weekly", "Bán chạy tuần này", "Cập nhật theo lượt mua 7 ngày qua", products.filter(product => weeklySales(product) > 0).sort((a, b) => weeklySales(b) - weeklySales(a)));
  add("discounts", "Đang giảm giá", "Giảm từ 15% trở lên", products.filter(product => productDiscount(product) >= 15).sort((a, b) => productDiscount(b) - productDiscount(a)));
  if (category === "Tất cả") {
    for (const name of new Set(products.map(product => product.category).filter(Boolean))) {
      add(`category-${name}`, name, "Khám phá các sản phẩm trong danh mục", products.filter(product => product.category === name).sort(recentFirst));
    }
  }
  if (!shelves.length) add("discover", category === "Tất cả" ? "Khám phá sản phẩm" : `Lựa chọn ${category.toLocaleLowerCase("vi-VN")}`, "Những sản phẩm hiện có trong cửa hàng", [...products].sort(recentFirst));
  return shelves;
}

export function featuredProducts(products) {
  return [...products].filter(product => product.stock !== 0).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || productDiscount(b) - productDiscount(a) || productRating(b) - productRating(a) || recentFirst(a, b)).slice(0, 5);
}
