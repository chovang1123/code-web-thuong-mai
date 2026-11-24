import { X } from "lucide-react";
import { storeCategories } from "../lib/storeConfig";

export default function ProductFilters({ products, category, onCategory, filters, onChange, onClose }) {
  const categories = [...new Set([...storeCategories, ...products.map(product => product.category).filter(Boolean)])];
  const set = (key, value) => onChange({ ...filters, [key]: value });
  return <aside className="product-filters" aria-label="Bộ lọc sản phẩm">
    <div className="filters-title"><h2>Bộ lọc</h2>{onClose && <button type="button" onClick={onClose} aria-label="Đóng bộ lọc"><X size={20} /></button>}</div>
    <fieldset><legend>Danh mục</legend>{["Tất cả", ...categories].map(item => <label className="filter-choice" key={item}><input type="checkbox" checked={category === item} onChange={() => onCategory(category === item ? "Tất cả" : item)} /><span>{item === "Tất cả" ? "Tất cả sản phẩm" : item}</span><small>({item === "Tất cả" ? products.length : products.filter(product => product.category === item).length})</small></label>)}</fieldset>
    <fieldset><legend>Khoảng giá</legend><div className="filter-price"><label><span className="sr-only">Giá từ</span><input type="number" min="0" inputMode="numeric" value={filters.minPrice} onChange={event => set("minPrice", event.target.value)} placeholder="Từ" /></label><span>–</span><label><span className="sr-only">Giá đến</span><input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={event => set("maxPrice", event.target.value)} placeholder="Đến" /></label></div>{filters.minPrice !== "" && filters.maxPrice !== "" && Number(filters.minPrice) > Number(filters.maxPrice) && <p className="filter-error" role="alert">Giá từ phải nhỏ hơn giá đến.</p>}</fieldset>
    <fieldset><legend>Đánh giá</legend>{[4, 3].map(value => <label className="filter-choice" key={value}><input type="checkbox" checked={filters.rating === value} onChange={() => set("rating", filters.rating === value ? 0 : value)} /><span>Từ {value} sao <span aria-hidden="true">★</span></span></label>)}</fieldset>
    <fieldset><legend>Ưu đãi</legend><label className="filter-choice"><input type="checkbox" checked={filters.freeShipping} onChange={event => set("freeShipping", event.target.checked)} /><span>Miễn phí vận chuyển</span></label><label className="filter-choice"><input type="checkbox" checked={filters.onSale} onChange={event => set("onSale", event.target.checked)} /><span>Đang giảm giá</span></label></fieldset>
  </aside>;
}
