import { Plus, Star } from "lucide-react";
import ProductImage from "./ProductImage";
import { formatPrice, productDiscount, productRating, productSold } from "../lib/products";

export default function ProductCard({ product, onView, onAdd, onShop, compact = false }) {
  const discount = productDiscount(product);
  const rating = productRating(product);
  const sold = productSold(product);
  return <article className={`product-card catalog-card ${compact ? "compact-card" : ""}`}>
    <div className="product-image">
      <button type="button" className="product-image-link" onClick={() => onView(product)} aria-label={`Xem ${product.name}`}><ProductImage product={product} /></button>
      {onAdd && <button type="button" className="add-button" disabled={product.stock === 0} onClick={() => onAdd(product)} aria-label={`Thêm ${product.name} vào giỏ`}><Plus size={18} /><span>{product.stock === 0 ? "Hết hàng" : "Thêm giỏ"}</span></button>}
    </div>
    <div className="product-info">
      <span className="product-category-tag">{product.category}</span>
      <h3><button type="button" onClick={() => onView(product)}>{product.name}</button></h3>
      {!compact && <>
        {onShop ? <button type="button" className="product-seller-link" onClick={() => onShop(product)}>{product.sellerName || "Net Market"}</button> : <p className="product-shop-name">{product.sellerName || "Net Market"}</p>}
        <div className="rating-row"><span><Star size={12} aria-hidden="true" />{rating > 0 ? rating.toFixed(1) : "Chưa đánh giá"}</span><span>{sold > 0 ? `Đã bán ${sold.toLocaleString("vi-VN")}` : "Chưa có lượt bán"}</span></div>
      </>}
      <div className="price-row">{discount > 0 && <><span className="discount-badge">−{discount}%</span><del>{formatPrice(product.originalPrice)}</del></>}<strong>{formatPrice(product.price)}</strong></div>
    </div>
  </article>;
}
