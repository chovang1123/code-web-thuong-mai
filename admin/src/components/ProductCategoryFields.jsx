import { categoryDefinitions, resolveCategory, filterFields } from "../lib/categories.js";

// Shared controls keep admin and seller writes on the same taxonomy.
export default function ProductCategoryFields({ form, onChange }) {
  const selected = resolveCategory(form.category);
  const fields = filterFields(selected?.slug);
  const set = (key, value) => onChange({ ...form, [key]: value });
  return <>
    <label>Danh mục chính<select required value={selected?.name || ""} onChange={event => onChange({ ...form, category: event.target.value, gender: "", os: "" })}><option value="">Chọn danh mục</option>{categoryDefinitions.filter(c => !c.parentSlug).map(root => <optgroup key={root.slug} label={root.name}><option value={root.name}>{root.name}{categoryDefinitions.some(c => c.parentSlug === root.slug) ? " — Chưa phân loại chi tiết" : ""}</option>{categoryDefinitions.filter(c => c.parentSlug === root.slug).map(child => <option key={child.slug} value={child.name}>{child.name}</option>)}</optgroup>)}</select></label>
    <label>Tag<input value={form.tags || ""} onChange={event => set("tags", event.target.value)} placeholder="Ngăn cách bằng dấu phẩy" /></label>
    <label>Thương hiệu<input value={form.brand || ""} onChange={event => set("brand", event.target.value)} placeholder="Để trống nếu chưa xác định" /></label>
    {fields.gender && <label>Giới tính<select value={form.gender || ""} onChange={event => set("gender", event.target.value)}><option value="">Chưa xác định</option><option value="nam">Nam</option><option value="nu">Nữ</option><option value="unisex">Unisex</option></select></label>}
    {fields.os && <label>Hệ điều hành<select value={form.os || ""} onChange={event => set("os", event.target.value)}><option value="">Chưa xác định</option><option value="ios">iOS / iPadOS</option><option value="android">Android</option></select></label>}
  </>;
}
