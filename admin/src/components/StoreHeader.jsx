import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import ProductImage from "./ProductImage";

export default function StoreHeader({ user, products = [], search, onSearch, searchFocused, onSearchFocus, suggestions, category, onCategory, cartCount, onCart, onProfile, onOrders, onLogout }) {
  const account = useRef(null);
  const categoriesMenu = useRef(null);
  const searchInput = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))];

  useEffect(() => {
    const close = event => {
      for (const ref of [account, categoriesMenu]) {
        if (event.key === "Escape" || (event.type === "pointerdown" && !ref.current?.contains(event.target))) {
          if (ref.current) ref.current.open = false;
        }
      }
      if (event.key === "Escape") { setSearchOpen(false); onSearchFocus(false); }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, [onSearchFocus]);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);
  const browse = () => document.getElementById("shop")?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const choose = action => { account.current.open = false; action(); };

  return <header className="topbar store-header home-header">
    <div className="store-header-main">
      <a className="brand" href="#top" aria-label="Net Store — Trang chủ"><img className="brand-logo" src="/net-store-logo.png" alt="" /><span>NET STORE</span></a>
      <details className="category-menu" ref={categoriesMenu}>
        <summary><Menu size={16} /><span>Danh mục</span></summary>
        <nav className="category-dropdown" aria-label="Danh mục sản phẩm"><button type="button" aria-pressed={category === "Tất cả"} onClick={() => { onCategory("Tất cả"); categoriesMenu.current.open = false; browse(); }}>Tất cả</button>{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => { onCategory(item); categoriesMenu.current.open = false; browse(); }}>{item}</button>)}</nav>
      </details>
      <form className={`header-search ${searchOpen ? "is-search-open" : ""}`} role="search" onSubmit={event => { event.preventDefault(); onSearchFocus(false); setSearchOpen(false); browse(); }}>
        <label className="sr-only" htmlFor="store-search">Tìm sản phẩm, thương hiệu, shop</label><Search size={16} aria-hidden="true" />
        <input ref={searchInput} id="store-search" autoComplete="off" value={search} placeholder="Tìm sản phẩm, thương hiệu, shop..." onFocus={() => onSearchFocus(true)} onChange={event => { onSearch(event.target.value); onSearchFocus(true); }} onBlur={event => { if (!event.currentTarget.form?.contains(event.relatedTarget)) onSearchFocus(false); }} />
        <button type="submit" className="primary-button">Tìm</button>
        {searchFocused && search.trim() && <div className="search-suggestions" aria-label="Gợi ý tìm kiếm">{suggestions.length ? suggestions.map(product => <button type="button" key={product._id} onClick={() => { onSearch(product.name); onSearchFocus(false); setSearchOpen(false); browse(); }}><ProductImage product={product} /><span>{product.name}</span></button>) : <p>Không tìm thấy sản phẩm phù hợp.</p>}</div>}
      </form>
      <div className="store-header-actions">
        <button type="button" className="mobile-search-toggle" aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"} aria-expanded={searchOpen} aria-controls="store-search" onClick={() => setSearchOpen(!searchOpen)}>{searchOpen ? <X size={20} /> : <Search size={20} />}</button>
        <a className="support-button" href="/?support=1" target="_blank" rel="noopener noreferrer" aria-label="Hỗ trợ"><CircleHelp size={17} /><span>Hỗ trợ</span></a>
        <details ref={account} className="account-menu"><summary aria-label={`Tài khoản ${user || "của bạn"}`}><UserRound size={17} /><span>{user || "Tài khoản"}</span><ChevronDown size={12} /></summary><div className="account-dropdown"><button type="button" onClick={() => choose(onOrders)}>Đơn hàng</button><button type="button" onClick={() => choose(onProfile)}>Thông tin</button><button type="button" onClick={() => choose(onLogout)}>Đăng xuất</button></div></details>
        <button type="button" className="header-cart" onClick={onCart} aria-label="Mở giỏ hàng"><ShoppingBag size={19} /><span className="cart-label">Giỏ hàng</span><span className="cart-count">{cartCount}</span></button>
      </div>
    </div>
  </header>;
}
