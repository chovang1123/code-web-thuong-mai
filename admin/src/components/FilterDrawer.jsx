import Dialog from "./Dialog";
import ProductFilters from "./ProductFilters";

export default function FilterDrawer({ products, catalog, category, onCategory, filters, onChange, onClose, resultCount }) {
  return <Dialog className="filters-dialog" label="Bộ lọc nâng cao" onClose={onClose}><ProductFilters products={products} catalog={catalog} category={category} onCategory={onCategory} filters={filters} onChange={onChange} onClose={onClose} /><button type="button" className="primary-button filter-show-results" onClick={onClose}>Xem {resultCount} sản phẩm</button></Dialog>;
}
