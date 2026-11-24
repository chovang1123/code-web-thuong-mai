import { useEffect, useRef } from "react";
import { ChevronDown, CircleHelp, Search, ShoppingBag, UserRound } from "lucide-react";
import ProductImage from "./ProductImage";
import { storeCategories } from "../lib/storeConfig";

export default function StoreHeader({ user, search, onSearch, searchFocused, onSearchFocus, suggestions, category, onCategory, cartCount, onCart, onProfile, onOrders, onLogout, onSale }) {
  const account = useRef(null);
  const header = useRef(null);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--header-offset", `${Math.ceil(header.current.getBoundingClientRect().height) + 16}px`);
    });
    observer.observe(header.current);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--header-offset"); };
  }, []);
  useEffect(() => {
    const close = event => {
      if (event.key === "Escape" || (event.type === "pointerdown" && !account.current?.contains(event.target))) {
        if (account.current) account.current.open = false;
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, []);
  const browse = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  const choose = action => { account.current.open = false; action(); };
  return <header ref={header} className="topbar store-header">
    <div className="store-header-main">
      <a className="brand" href="#top" aria-label="Net Store — Trang chủ"><img className="brand-logo" src="/net-store-logo.png" alt="" /><span>NET STORE</span></a>
      <form className="header-search" role="search" onSubmit={event => { event.preventDefault(); onSearchFocus(false); browse(); }}>
        <label className="sr-only" htmlFor="store-search">Tìm sản phẩm, thương hiệu, shop</label>
        <Search size={18} aria-hidden="true" />
        <input id="store-search" autoComplete="off" value={search} placeholder="Tìm sản phẩm, thương hiệu, shop..." onFocus={() => onSearchFocus(true)} onChange={event => { onSearch(event.target.value); onSearchFocus(true); }} onBlur={event => { if (!event.currentTarget.form?.contains(event.relatedTarget)) onSearchFocus(false); }} />
        <button type="submit" className="primary-button">Tìm</button>
        {searchFocused && search.trim() && <div className="search-suggestions" aria-label="Gợi ý tìm kiếm">
          {suggestions.length ? suggestions.map(product => <button type="button" key={product._id} onClick={() => { onSearch(product.name); onSearchFocus(false); browse(); }}><ProductImage product={product} /><span>{product.name}</span><small>{product.category}</small></button>) : <p>Không tìm thấy sản phẩm phù hợp.</p>}
        </div>}
      </form>
      <div className="store-header-actions">
        <a className="support-button" href="/?support=1" target="_blank" rel="noopener noreferrer" aria-label="Hỗ trợ"><CircleHelp size={18} /><span>Hỗ trợ</span></a>
        <details ref={account} className="account-menu">
          <summary aria-label={`Tài khoản ${user || "của bạn"}`}><UserRound size={18} /><span>{user || "Tài khoản"}</span><ChevronDown size={14} /></summary>
          <div className="account-dropdown"><button type="button" onClick={() => choose(onOrders)}>Đơn hàng</button><button type="button" onClick={() => choose(onProfile)}>Thông tin</button><button type="button" onClick={() => choose(onLogout)}>Đăng xuất</button></div>
        </details>
        <button type="button" className="header-cart" onClick={onCart} aria-label="Mở giỏ hàng"><ShoppingBag size={20} /><span className="cart-label">Giỏ hàng</span><span className="cart-count">{cartCount}</span></button>
      </div>
    </div>
    <nav className="store-category-nav" aria-label="Danh mục sản phẩm"><div className="store-category-links">
      {["Tất cả", ...storeCategories].map(item => <button type="button" key={item} aria-pressed={category === item} className={category === item ? "is-selected" : ""} onClick={() => { onCategory(item); browse(); }}>{item === "Tất cả" ? "Tất cả danh mục" : item}</button>)}
    </div><button type="button" className="sale-link" onClick={() => { onSale(); browse(); }}>Giảm giá hôm nay</button></nav>
  </header>;
}
