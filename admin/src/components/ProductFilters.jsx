import { X } from "lucide-react";
import { categoryTree, inCategory, filterFields } from "../lib/categories.js";

export default function ProductFilters({ products, catalog, category, onCategory, filters, onChange, onClose }) {
  const roots = categoryTree(products, catalog);
  const facets = filterFields(category);
  const scoped = products.filter(p => inCategory(p, category));
  const labels = { nam: "Nam", nu: "Nữ", unisex: "Unisex", ios: "iOS / iPadOS", android: "Android" };
  const set = (key, value) => onChange({ ...filters, [key]: value });
  return <aside className="product-filters" aria-label="Bộ lọc sản phẩm">
    <div className="filters-title"><h2>Bộ lọc</h2>{onClose && <button type="button" onClick={onClose} aria-label="Đóng bộ lọc"><X size={20} /></button>}</div>
    <fieldset><legend>Danh mục</legend><label className="filter-facet"><span className="sr-only">Danh mục</span><select aria-label="Danh mục" value={category} onChange={event => onCategory(event.target.value)}><option value="Tất cả">Tất cả sản phẩm ({products.length})</option>{roots.map(root => <optgroup key={root.slug} label={root.name}><option value={root.name}>Tất cả {root.name} ({root.productCount})</option>{root.children.map(child => <option key={child.slug} value={child.name}>{child.name} ({child.productCount})</option>)}</optgroup>)}</select></label></fieldset>
    {Object.entries({ gender: "Giới tính", brand: "Hãng", os: "Hệ điều hành" }).filter(([key]) => facets[key]).map(([key, label]) => <fieldset key={key}><legend>{label}</legend><label className="filter-facet"><span className="sr-only">{label}</span><select aria-label={label} value={filters[key] || ""} onChange={event => set(key, event.target.value)}><option value="">Tất cả</option>{[...new Set(scoped.map(p => p[key]).filter(Boolean))].sort().map(value => <option key={value} value={value}>{labels[value] || value}</option>)}</select></label></fieldset>)}
    <fieldset><legend>Khoảng giá</legend><div className="filter-price"><label><span className="sr-only">Giá từ</span><input type="number" min="0" inputMode="numeric" value={filters.minPrice} onChange={event => set("minPrice", event.target.value)} placeholder="Từ" /></label><span>–</span><label><span className="sr-only">Giá đến</span><input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => set("maxPrice", event.target.value)} placeholder="Đến" /></label></div>{filters.minPrice !== "" && filters.maxPrice !== "" && Number(filters.minPrice) > Number(filters.maxPrice) && <p className="filter-error" role="alert">Giá từ phải nhỏ hơn giá đến.</p>}</fieldset>
    <fieldset><legend>Đánh giá</legend>{[4, 3].map(value => <label className="filter-choice" key={value}><input type="checkbox" checked={filters.rating === value} onChange={() => set("rating", filters.rating === value ? 0 : value)} /><span>Từ {value} sao <span aria-hidden="true">★</span></span></label>)}</fieldset>
    <fieldset><legend>Ưu đãi</legend><label className="filter-choice"><input type="checkbox" checked={filters.freeShipping} onChange={event => set("freeShipping", event.target.checked)} /><span>Miễn phí vận chuyển</span></label><label className="filter-choice"><input type="checkbox" checked={filters.onSale} onChange={event => set("onSale", event.target.checked)} /><span>Đang giảm giá</span></label></fieldset>
  </aside>;
}
