import { useMemo, useState } from "react";
import { X } from "lucide-react";
import CategoryChips from "./CategoryChips";
import FilterDrawer from "./FilterDrawer";
import ProductShelf from "./ProductShelf";
import FeaturedHero from "./FeaturedHero";
import { defaultFilters, filterProducts } from "../lib/productFilters";
import { formatPrice } from "../lib/products";
import { buildHomeShelves, featuredProducts } from "../lib/homeCatalog";

export default function HomePage({ products, category, onCategory, search, onSearch, onView, onAdd, onBuy, onShop }) {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => filterProducts(products, { category, search, filters }), [products, category, search, filters]);
  const shelves = useMemo(() => buildHomeShelves(visible, { category, search }), [visible, category, search]);
  const featured = useMemo(() => featuredProducts(visible), [visible]);
  const clear = () => { setFilters({ ...defaultFilters }); onCategory("Tất cả"); onSearch(""); };
  const chips = [];
  if (category !== "Tất cả") chips.push({ label: category, remove: () => onCategory("Tất cả") });
  if (search.trim()) chips.push({ label: `Tìm: ${search}`, remove: () => onSearch("") });
  if (filters.minPrice !== "" || filters.maxPrice !== "") chips.push({ label: `${formatPrice(filters.minPrice)} – ${filters.maxPrice === "" ? "Không giới hạn" : formatPrice(filters.maxPrice)}`, remove: () => setFilters({ ...filters, minPrice: "", maxPrice: "" }) });
  if (filters.rating) chips.push({ label: `Từ ${filters.rating} sao`, remove: () => setFilters({ ...filters, rating: 0 }) });
  if (filters.freeShipping) chips.push({ label: "Miễn phí vận chuyển", remove: () => setFilters({ ...filters, freeShipping: false }) });
  if (filters.onSale) chips.push({ label: "Đang giảm giá", remove: () => setFilters({ ...filters, onSale: false }) });
  return <div className="home-page" id="shop">
    <h1 className="sr-only">Trang chủ Net Store</h1>
    <CategoryChips products={products} category={category} onCategory={onCategory} onFilters={() => setFiltersOpen(true)} activeCount={chips.length} />
    <div className="home-filter-status"><div className="filter-chips">{chips.map(chip => <button type="button" className="filter-chip" key={chip.label} onClick={chip.remove} aria-label={`Bỏ lọc ${chip.label}`}>{chip.label}<X size={14} /></button>)}{chips.length > 0 && <button type="button" className="clear-filters" onClick={clear}>Xóa tất cả</button>}</div>{chips.length > 0 && <span className="result-count" aria-live="polite">{visible.length} sản phẩm</span>}</div>
    <FeaturedHero products={featured} onView={onView} onBuy={onBuy} />
    {shelves.map(shelf => <ProductShelf key={shelf.kind} {...shelf} onView={onView} onAdd={onAdd} onShop={onShop} />)}
    {!visible.length && <div className="home-empty"><h2>Không có sản phẩm phù hợp</h2><p>Thử thay đổi danh mục hoặc khoảng giá.</p>{chips.length > 0 && <button type="button" className="secondary-button" onClick={clear}>Xóa bộ lọc</button>}</div>}
    {filtersOpen && <FilterDrawer products={products} category={category} onCategory={onCategory} filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} resultCount={visible.length} />}
  </div>;
}
