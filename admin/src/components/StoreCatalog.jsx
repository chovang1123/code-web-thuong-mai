import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import Dialog from "./Dialog";
import { defaultFilters, filterProducts } from "../lib/productFilters";
import { formatPrice } from "../lib/products";

export default function StoreCatalog({ products, category, onCategory, search, onSearch, tab, onTab, onView, onAdd, onShop }) {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [sort, setSort] = useState("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => filterProducts(products, { category, search, filters, tab, sort }), [products, category, search, filters, tab, sort]);
  const clear = () => { setFilters({ ...defaultFilters }); onCategory("Tất cả"); onSearch(""); onTab("featured"); setSort("relevant"); };
  const chips = [];
  if (category !== "Tất cả") chips.push({ label: category, remove: () => onCategory("Tất cả") });
  if (search.trim()) chips.push({ label: `Tìm: ${search}`, remove: () => onSearch("") });
  if (filters.minPrice !== "" || filters.maxPrice !== "") chips.push({ label: `${formatPrice(filters.minPrice)} – ${filters.maxPrice === "" ? "Không giới hạn" : formatPrice(filters.maxPrice)}`, remove: () => setFilters({ ...filters, minPrice: "", maxPrice: "" }) });
  if (filters.rating) chips.push({ label: `Từ ${filters.rating} sao`, remove: () => setFilters({ ...filters, rating: 0 }) });
  if (filters.freeShipping) chips.push({ label: "Miễn phí vận chuyển", remove: () => setFilters({ ...filters, freeShipping: false }) });
  if (filters.onSale || tab === "sale") chips.push({ label: "Đang giảm giá", remove: () => { setFilters({ ...filters, onSale: false }); if (tab === "sale") onTab("featured"); } });
  const filterProps = { products, category, onCategory, filters, onChange: setFilters };
  return <section className="shop-section catalog-section" id="shop" aria-label="Cửa hàng">
    <h1 className="sr-only">Cửa hàng Net Store</h1>
    <div className="desktop-filters"><ProductFilters {...filterProps} /></div>
    <div className="catalog-results">
      <div className="catalog-toolbar"><div className="catalog-tabs" role="group" aria-label="Nhóm sản phẩm">{[["featured", "Nổi bật"], ["bestselling", "Bán chạy"], ["new", "Mới"], ["sale", "Đang giảm"]].map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} className={tab === value ? "is-selected" : ""} onClick={() => onTab(value)}>{label}</button>)}</div><button type="button" className="mobile-filter-trigger secondary-button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} />Bộ lọc{chips.length ? ` (${chips.length})` : ""}</button></div>
      <div className="catalog-meta"><div className="filter-chips">{chips.map(chip => <button type="button" className="filter-chip" key={chip.label} onClick={chip.remove} aria-label={`Bỏ lọc ${chip.label}`}>{chip.label}<X size={14} /></button>)}{chips.length > 0 && <button type="button" className="clear-filters" onClick={clear}>Xóa tất cả</button>}</div><div className="catalog-sort"><span className="result-count" aria-live="polite">{visible.length} sản phẩm</span><label><span className="sr-only">Sắp xếp sản phẩm</span><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sắp xếp sản phẩm"><option value="relevant">Phù hợp nhất</option><option value="price-asc">Giá: thấp đến cao</option><option value="price-desc">Giá: cao đến thấp</option><option value="rating">Đánh giá cao nhất</option><option value="bestselling">Bán chạy nhất</option><option value="newest">Mới nhất</option></select></label></div></div>
      {visible.length ? <div className="product-grid catalog-grid">{visible.map(product => <ProductCard key={product._id} product={product} onView={onView} onAdd={onAdd} onShop={onShop} />)}</div> : <div className="no-results"><h2>Chưa tìm thấy sản phẩm phù hợp</h2><p>Thử điều chỉnh khoảng giá hoặc bỏ bớt bộ lọc.</p><button type="button" className="secondary-button" onClick={clear}>Xóa tất cả bộ lọc</button></div>}
    </div>
    {filtersOpen && <Dialog onClose={() => setFiltersOpen(false)} className="filters-dialog" label="Bộ lọc sản phẩm"><ProductFilters {...filterProps} onClose={() => setFiltersOpen(false)} /><button type="button" className="primary-button filter-show-results" onClick={() => setFiltersOpen(false)}>Xem {visible.length} sản phẩm</button></Dialog>}
  </section>;
}
