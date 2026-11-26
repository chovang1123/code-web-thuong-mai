// Canonical two-level taxonomy, shared by the API, migration, seed and web UI.
export const slugify = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const groups = [
  ["Công nghệ", "cong-nghe", ["Điện thoại", "Máy tính bảng", "Laptop", "Tai nghe & loa", "Đồng hồ thông minh", "Sạc & pin dự phòng", "Ốp & phụ kiện điện thoại", "Phụ kiện quay chụp"]],
  ["Thời trang", "thoi-trang", ["Áo nam", "Giày thể thao nam", "Váy & đầm", "Bộ đồ nữ", "Giày cao gót", "Dép nữ"]],
  ["Phụ kiện", "phu-kien", ["Đồng hồ", "Kính mát", "Túi xách & ba lô", "Trang sức"]],
  ["Làm đẹp", "lam-dep", ["Trang điểm mắt", "Trang điểm mặt", "Son môi", "Chăm sóc móng", "Nước hoa", "Chăm sóc cơ thể"]],
  ["Nhà cửa & Nội thất", "nha-cua-noi-that", ["Giường & bàn đầu giường", "Sofa", "Ghế văn phòng", "Tủ phòng tắm", "Đèn bàn", "Cây & chậu", "Khung ảnh & đồ trang trí", "Giấy & vệ sinh nhà cửa"]],
  ["Nhà bếp", "nha-bep", ["Nồi & chảo", "Dụng cụ nấu ăn", "Ly & cốc", "Đĩa & khay", "Hộp & kệ bếp", "Đồ điện nhà bếp"]],
  ["Thể thao", "the-thao", ["Bóng thể thao", "Dụng cụ thể thao"]],
  ["Thú cưng", "thu-cung", []],
  ["Thực phẩm & đồ uống", "thuc-pham-do-uong", []],
  ["Văn phòng phẩm", "van-phong-pham", []],
];
export const categoryDefinitions = groups.flatMap(([name, slug, children], index) => [
  { name, slug, parentSlug: null, sortOrder: index * 100, isVisible: true, isArchived: false },
  ...children.map((name, child) => ({ name, slug: name === "Trang điểm mặt" ? "trang-diem-khuon-mat" : slugify(name), parentSlug: slug, sortOrder: index * 100 + child + 1, isVisible: true, isArchived: false })),
]);
export const categoryBySlug = new Map(categoryDefinitions.map(c => [c.slug, c]));
const oldNames = {
  "Mascara": "Trang điểm mắt", "Phấn mắt": "Trang điểm mắt", "Phấn phủ": "Trang điểm mặt",
  "Nước hoa unisex": "Nước hoa", "Nước hoa nữ": "Nước hoa",
  "Giường ngủ": "Giường & bàn đầu giường", "Bàn đầu giường": "Giường & bàn đầu giường",
  "Khung ảnh": "Khung ảnh & đồ trang trí", "Đồ trang trí": "Khung ảnh & đồ trang trí",
  "Nội thất": "Nhà cửa & Nội thất", "Nhà cửa": "Nhà cửa & Nội thất", "Cây & chậu trang trí": "Cây & chậu",
  "Tai nghe": "Tai nghe & loa", "Loa thông minh": "Tai nghe & loa",
  "Điện thoại iPhone": "Điện thoại", "Điện thoại Android": "Điện thoại",
  "Ốp điện thoại": "Ốp & phụ kiện điện thoại", "Đồng hồ nam": "Đồng hồ", "Đồng hồ nữ": "Đồng hồ",
  "Túi xách nữ": "Túi xách & ba lô", "Ba lô": "Túi xách & ba lô", "Bông tai": "Trang sức",
  "Thức ăn thú cưng": "Thú cưng", "Cà phê": "Thực phẩm & đồ uống", "Điện gia dụng": "Đồ điện nhà bếp",
};
export const categoryAliases = Object.fromEntries(Object.entries(oldNames).flatMap(([old, target]) => [[old, categoryDefinitions.find(c => c.name === target).slug], [slugify(old), categoryDefinitions.find(c => c.name === target).slug]]));
Object.assign(categoryAliases, { iphone: "dien-thoai", "sac-pin": "sac-pin-du-phong", "balo": "tui-xach-ba-lo", "giay-ve-sinh": "giay-ve-sinh-nha-cua", "hop-ke-bep": "hop-ke-bep", "thuc-pham": "thuc-pham-do-uong", "legacy-041ed9be3864": "van-phong-pham" });
export function resolveCategory(value) {
  const raw = String(value || "").trim();
  const named = categoryDefinitions.find(c => c.name === raw);
  if (named) return named;
  return categoryBySlug.get(categoryAliases[raw] || categoryAliases[slugify(raw)] || slugify(raw));
}
export function categoryPath(value) {
  const c = resolveCategory(value);
  return c ? [...(c.parentSlug ? [categoryBySlug.get(c.parentSlug)] : []), c] : [];
}
export function filterFields(value) {
  const slug = resolveCategory(value)?.slug;
  return { gender: ["nuoc-hoa", "dong-ho", "tui-xach-ba-lo", "trang-suc"].includes(slug), brand: ["dien-thoai", "tai-nghe-loa", "laptop", "may-tinh-bang"].includes(slug), os: ["dien-thoai", "may-tinh-bang"].includes(slug) };
}
export function inferAttributes(product) {
  const name = String(product.name || "");
  const old = product.category || "";
  const c = resolveCategory(product.categorySlug || old);
  let brand = product.brand && product.brand !== "Net Select" ? product.brand : "";
  if (!brand) {
    const known = [[/\b(iphone|ipad|apple|airpods|macbook|homepod|magsafe)\b/i,"Apple"], [/\bsamsung\b/i,"Samsung"], [/\basus\b/i,"Asus"], [/\blenovo\b/i,"Lenovo"], [/\bdell\b/i,"Dell"], [/\bhuawei\b/i,"Huawei"], [/\boppo\b/i,"Oppo"], [/\brealme\b/i,"Realme"], [/\bvivo\b/i,"Vivo"], [/\bbeats\b/i,"Beats"], [/\bamazon\b/i,"Amazon"]];
    brand = known.find(([pattern]) => pattern.test(name))?.[1] || "";
  }
  let gender = product.gender || "";
  if (!gender && filterFields(c?.slug).gender) {
    if (/unisex/i.test(old + " " + name)) gender = "unisex";
    else if (/(?:^|\s)nữ(?:\s|$)|\bwomen\b|\bwoman\b/i.test(name) || ["Nước hoa nữ", "Đồng hồ nữ", "Túi xách nữ"].includes(old)) gender = "nu";
    else if (/\bmen\b|\bman\b/i.test(name) || old === "Đồng hồ nam") gender = "nam";
  }
  let os = product.os || "";
  if (!os && filterFields(c?.slug).os) {
    if (/iphone|ipad/i.test(name) || old === "Điện thoại iPhone") os = "ios";
    else if (old === "Điện thoại Android" || /samsung galaxy (tab|s\d)|android/i.test(name)) os = "android";
  }
  return { brand, gender, os };
}
export function canonicalProductFields(product) {
  const c = resolveCategory(product.categorySlug || product.category);
  if (!c) { const error = new Error(`Danh mục chưa có mapping: ${product.category || product.categorySlug}`); error.status = 400; throw error; }
  const path = categoryPath(c.slug);
  const oldPrimary = product.category;
  const tags = [...new Set([...(product.tags || []), ...(product.categories || []).filter(name => name !== oldPrimary && !path.some(node => node.slug === resolveCategory(name)?.slug)).map(name => slugify(name))])];
  return { category: c.name, categorySlug: c.slug, categories: [c.name], tags, ...inferAttributes(product) };
}
