import { ChevronDown } from "lucide-react";
import { storeCategories } from "../lib/storeConfig";

export default function CategoryChips({ products, category, onCategory, onFilters, activeCount }) {
  const categories = [...new Set([...storeCategories, ...products.map(product => product.category).filter(Boolean)])];
  return <div className="home-category-row"><nav className="category-chips" aria-label="Chọn danh mục">{["Tất cả", ...categories].map(item => <button type="button" key={item} className={category === item ? "is-selected" : ""} aria-pressed={category === item} onClick={() => onCategory(item)}>{item}</button>)}</nav><button type="button" className="advanced-filter-button" onClick={onFilters} aria-haspopup="dialog">Bộ lọc nâng cao{activeCount ? ` (${activeCount})` : ""}<ChevronDown size={14} /></button></div>;
}
