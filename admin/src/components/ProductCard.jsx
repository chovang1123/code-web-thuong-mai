import { Star } from "lucide-react";
import ProductImage from "./ProductImage";
import { formatPrice, formatSales, isNewProduct, productDiscount, productRating, productSold } from "../lib/products";

export default function ProductCard({ product, onView, onAdd, onShop, compact = false }) {
  const discount = productDiscount(product);
  const rating = productRating(product);
  const sold = productSold(product);
  const isNew = isNewProduct(product);
  return <article className={`product-card catalog-card home-product-card ${compact ? "compact-card" : ""}`}>
    <div className="product-image">
      <button type="button" className="product-image-link" onClick={() => onView(product)} aria-label={`Xem ${product.name}`}><ProductImage product={product} /></button>
      {onAdd && <button type="button" className="add-button" disabled={product.stock === 0} onClick={() => onAdd(product)} aria-label={`Thêm ${product.name} vào giỏ`}>{product.stock === 0 ? "Hết hàng" : "Thêm giỏ"}</button>}
    </div>
    <div className="product-info">
      <h3><button type="button" title={product.name} onClick={() => onView(product)}>{product.name}</button></h3>
      {product.sellerName && (onShop ? <button type="button" className="product-seller-link" onClick={() => onShop(product)}>{product.sellerName}</button> : <p className="product-shop-name">{product.sellerName}</p>)}
      <div className="product-stats">{isNew ? <span className="new-product-badge">Mới</span> : <>{rating > 0 && <span className="rating-badge"><Star size={12} aria-hidden="true" />{rating.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</span>}{rating > 0 && sold > 0 && <span aria-hidden="true">·</span>}{sold > 0 && <span>Đã bán {formatSales(sold)}</span>}{rating === 0 && product.totalReviews > 0 && <span>{product.totalReviews} đánh giá</span>}</>}</div>
      <div className={`steam-price ${discount > 0 ? "has-discount" : ""}`}>{discount > 0 && <span className="discount-badge">−{discount}%</span>}<div>{discount > 0 && <del>{formatPrice(product.originalPrice)}</del>}<strong>{formatPrice(product.price)}</strong></div></div>
    </div>
  </article>;
}
