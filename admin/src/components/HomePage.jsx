import { useMemo, useState } from "react";
import { X } from "lucide-react";
import CategoryChips from "./CategoryChips";
import FilterDrawer from "./FilterDrawer";
import ProductShelf from "./ProductShelf";
import FeaturedHero from "./FeaturedHero";
import HomeLoadState from "./HomeLoadState";
import { defaultFilters, filterProducts } from "../lib/productFilters";
import { formatPrice } from "../lib/products";
import { buildHomeShelves, featuredProducts } from "../lib/homeCatalog";
import { getRecommendations } from "../lib/recommendations";
import CategoryBreadcrumb from "./CategoryBreadcrumb";
import { filterFields } from "../lib/categories.js";

export default function HomePage({ products, catalog, history = [], cart = [], category, onCategory, search, onSearch, onView, onAdd, onBuy, onShop, loading = false, error = "", onRetry }) {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(() => filterProducts(products, { category, search, filters }), [products, category, search, filters]);
  const shelves = useMemo(() => {
    const base = buildHomeShelves(visible, { category, search });
    if (search.trim() || category !== "Tất cả") return base;
    const ids = new Set(visible.map(product => product._id));
    const recommended = getRecommendations(history, products, { cart, limit: products.length }).filter(product => ids.has(product._id)).slice(0, 12);
    const anchor = products.find(product => product._id === history[0]?._id);
    if (recommended.length < 3 || !anchor) return base;
    const position = base.findIndex(shelf => !["weekly", "discounts"].includes(shelf.kind));
    const index = position < 0 ? base.length : position;
    return [...base.slice(0, index), { kind: "recommendations", title: "Gợi ý cho bạn", subtitle: `Vì bạn đã xem ${anchor.name}`, products: recommended }, ...base.slice(index)];
  }, [visible, category, search, products, history, cart]);
  const featured = useMemo(() => featuredProducts(visible), [visible]);
  const clear = () => { setFilters({ ...defaultFilters }); onCategory("Tất cả"); onSearch(""); };
  const chips = [];
  if (search.trim()) chips.push({ label: `Tìm: ${search}`, remove: () => onSearch("") });
  if (filters.minPrice !== "" || filters.maxPrice !== "") chips.push({ label: `${formatPrice(filters.minPrice)} – ${filters.maxPrice === "" ? "Không giới hạn" : formatPrice(filters.maxPrice)}`, remove: () => setFilters({ ...filters, minPrice: "", maxPrice: "" }) });
  if (filters.rating) chips.push({ label: `Từ ${filters.rating} sao`, remove: () => setFilters({ ...filters, rating: 0 }) });
  if (filters.freeShipping) chips.push({ label: "Miễn phí vận chuyển", remove: () => setFilters({ ...filters, freeShipping: false }) });
  if (filters.onSale) chips.push({ label: "Đang giảm giá", remove: () => setFilters({ ...filters, onSale: false }) });
  const facets = filterFields(category);
  const labels = { nam: "Nam", nu: "Nữ", unisex: "Unisex", ios: "iOS / iPadOS", android: "Android" };
  for (const key of Object.keys(facets)) if (facets[key] && filters[key]) chips.push({ label: labels[filters[key]] || filters[key], remove: () => setFilters({ ...filters, [key]: "" }) });
  const hasFilters = category !== "Tất cả" || chips.length > 0;
  return <div className="home-page" id="shop">
    <h1 className="sr-only">{category === "Tất cả" ? "Trang chủ Net Store" : category}</h1>
    <CategoryChips products={products} catalog={catalog} category={category} onCategory={onCategory} onFilters={() => setFiltersOpen(true)} activeCount={chips.length} />
    <CategoryBreadcrumb category={category} onCategory={onCategory} />
    <div className="home-filter-status"><div className="filter-chips">{chips.map(chip => <button type="button" className="filter-chip" key={chip.label} onClick={chip.remove} aria-label={`Bỏ lọc ${chip.label}`}>{chip.label}<X size={14} /></button>)}{chips.length > 0 && <button type="button" className="clear-filters" onClick={clear}>Xóa tất cả</button>}</div>{chips.length > 0 && <span className="result-count" aria-live="polite">{visible.length} sản phẩm</span>}</div>
    {loading || error ? <HomeLoadState loading={loading} error={error} onRetry={onRetry} /> : <>
      <FeaturedHero products={featured} onView={onView} onBuy={onBuy} />
      {shelves.map(shelf => <ProductShelf key={`${shelf.kind}-${category}-${search}-${JSON.stringify(filters)}`} {...shelf} onView={onView} onAdd={onAdd} onShop={onShop} />)}
      {!visible.length && <div className="home-empty"><h2>{hasFilters ? "Không có sản phẩm phù hợp" : "Cửa hàng chưa có sản phẩm"}</h2><p>{hasFilters ? "Thử thay đổi danh mục hoặc khoảng giá." : "Bạn có thể quay lại sau để xem các sản phẩm mới."}</p>{hasFilters && <button type="button" className="secondary-button" onClick={clear}>Xóa bộ lọc</button>}</div>}
    </>}
    {filtersOpen && <FilterDrawer products={products} catalog={catalog} category={category} onCategory={onCategory} filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} resultCount={visible.length} />}
  </div>;
}
