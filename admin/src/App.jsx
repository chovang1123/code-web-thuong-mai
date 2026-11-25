import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  LogIn,
  MessageCircle,
  Star,
  Store,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import AdminPanel from "./AdminPanel";
import HelpCenter from "./HelpCenter";
import BankPanel from "./BankPanel";
import AddressPanel from "./AddressPanel";
import OrdersPanel from "./OrdersPanel";
import VoucherPanel from "./VoucherPanel";
import { openPayment } from "./lib/payment";
import CheckoutPanel from "./CheckoutPanel";
import { decorateProduct, formatPrice, productRating } from "./lib/products";
import SellerDashboard from "./pages/SellerDashboard";
import ProductImage from "./components/ProductImage";
import StoreHeader from "./components/StoreHeader";
import HomePage from "./components/HomePage";
import { historyKey, readViewHistory, recordProductView } from "./lib/recommendations";
import CartDrawer, { CartPage } from "./components/CartDrawer";
import Dialog from "./components/Dialog";
import { coupons } from "./lib/storeConfig";
import { checkoutTotals } from "./lib/cartPricing";



const cartStorageKey = (email) =>
  `net_store_cart_${email?.trim().toLowerCase() || "guest"}`;
const loadSavedCart = (email) => {
  try {
    const savedCart = JSON.parse(
      localStorage.getItem(cartStorageKey(email)) || "[]",
    );
    return Array.isArray(savedCart) ? savedCart : [];
  } catch (error) {
    console.error("Unable to restore saved cart:", error);
    return [];
  }
};
const normalizeSearch = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function App() {
  const [authUser, setAuthUser] = useState(() =>
    localStorage.getItem("net_store_user"),
  );
  const [authEmail, setAuthEmail] = useState(
    () => localStorage.getItem("net_store_email") || "",
  );
  const [authRole, setAuthRole] = useState(
    () => localStorage.getItem("net_store_role") || "customer",
  );
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("net_store_token") || "",
  );
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    shopName: "",
    shopLocation: "",
  });
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [cart, setCart] = useState(() => loadSavedCart(authEmail));
  const [cartReady, setCartReady] = useState(false);
  const [cartSyncMessage, setCartSyncMessage] = useState("");
  const cartSaveQueue = useRef(Promise.resolve());
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPageOpen, setCartPageOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewHistory, setViewHistory] = useState(() => readViewHistory(localStorage));
  useEffect(() => { try { localStorage.setItem(historyKey, JSON.stringify(viewHistory)); } catch { /* Browsing works when storage is disabled. */ } }, [viewHistory]);
  const viewProduct = product => { setViewHistory(history => recordProductView(history, product)); setSelectedProduct(product); };
  const [sellerShop, setSellerShop] = useState(null);
  const [profileOpen, setProfileOpen] = useState(() => location.pathname === "/orders" && Boolean(authToken));
  const [accountTab, setAccountTab] = useState(location.pathname === "/orders" ? "orders" : "profile");
  const [profileForm, setProfileForm] = useState({
    name: authUser || "",
    email: authEmail,
    phone: "",
    address: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviews, setReviews] = useState({});
  const supportMode =
    new URLSearchParams(window.location.search).get("support") === "1";

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey(authEmail), JSON.stringify(cart));
    } catch (error) {
      console.error("Unable to save cart:", error);
    }
  }, [authEmail, cart]);

  useEffect(() => {
    if (authRole !== "customer" || !authToken || !authEmail) {
      setCartReady(false);
      if (authRole === "customer" && authEmail) {
        setCartSyncMessage("Vui lòng đăng xuất rồi đăng nhập lại để đồng bộ giỏ hàng.");
      }
      return undefined;
    }

    let isMounted = true;
    setCartReady(false);
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const headers = { Authorization: `Bearer ${authToken}` };

    const synchronizeCart = async () => {
      try {
        const response = await fetch(`${apiUrl}/cart/web`, { headers });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải giỏ hàng từ máy chủ.");
        }

        const serverItems = (data.cart.items || [])
          .filter((item) => item.product)
          .map((item) => ({ ...item.product, quantity: item.quantity }));
        const mergedItems = new Map(
          serverItems.map((item) => [item._id, item]),
        );
        for (const item of loadSavedCart(authEmail)) {
          const existing = mergedItems.get(item._id);
          mergedItems.set(item._id, {
            ...existing,
            ...item,
            quantity: Math.max(existing?.quantity || 0, item.quantity),
          });
        }

        const mergedCart = [...mergedItems.values()];
        const saveResponse = await fetch(`${apiUrl}/cart/web`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            items: mergedCart.map((item) => ({
              productId: item._id,
              quantity: item.quantity,
            })),
          }),
        });
        const savedData = await saveResponse.json();
        if (!saveResponse.ok) {
          throw new Error(savedData.message || "Không thể lưu giỏ hàng lên máy chủ.");
        }

        if (isMounted) {
          setCart(
            (savedData.cart.items || [])
              .filter((item) => item.product)
              .map((item) => ({ ...item.product, quantity: item.quantity })),
          );
          setCartSyncMessage("");
          setCartReady(true);
        }
      } catch (error) {
        console.error("Unable to synchronize cart with MongoDB:", error);
        if (isMounted) {
          setCartSyncMessage(error.message);
          setCartReady(true);
        }
      }
    };

    synchronizeCart();
    return () => {
      isMounted = false;
    };
  }, [authEmail, authRole, authToken]);

  useEffect(() => {
    if (authRole !== "customer" || !cartReady || !authToken || !authEmail) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const items = cart.map((item) => ({
      productId: item._id,
      quantity: item.quantity,
    }));
    cartSaveQueue.current = cartSaveQueue.current
      .catch(() => {})
      .then(async () => {
        const response = await fetch(`${apiUrl}/cart/web`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Không thể lưu giỏ hàng lên máy chủ.");
        }
      })
      .catch((error) => {
        console.error("Unable to save cart to MongoDB:", error);
        setCartSyncMessage(error.message);
      });
  }, [authEmail, authRole, authToken, cart, cartReady]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await fetch(`${apiUrl}/products`);
        if (!response.ok) {
          throw new Error(`Product request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted || !Array.isArray(data)) return;
        const householdProducts = data.filter(
          (product) =>
            !["Ăn uống", "Đồ ăn", "Food", "Beverage"].includes(
              product.category,
            ),
        );
        const latestProducts = householdProducts.map(decorateProduct);
        setProducts(latestProducts);
        setSelectedProduct((current) =>
          current
            ? latestProducts.find((product) => product._id === current._id) ||
              null
            : current,
        );
      } catch (error) {
        if (isMounted) console.error("Unable to refresh storefront products:", error);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadProducts();
    };

    loadProducts();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct?._id || selectedProduct._id.length !== 24) return;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    fetch(`${apiUrl}/web-reviews/${selectedProduct._id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) =>
        setReviews((current) => ({ ...current, [selectedProduct._id]: data })),
      )
      .catch(() => {});
  }, [selectedProduct]);

  const suggestions = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return [];
    return products
      .filter((product) => normalizeSearch(product.name).startsWith(query))
      .slice(0, 8);
  }, [products, search]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const applyCoupon = (input = couponInput) => {
    const code = input.trim().toUpperCase();
    if (!coupons[code]) {
      setAppliedCoupon(null);
      setCouponMessage("Mã không hợp lệ. Thử NET10, WELCOME50 hoặc FREESHIP.");
      return;
    }
    setCouponInput(code);
    setAppliedCoupon(coupons[code]);
    setCouponMessage(`${coupons[code].label} đã được áp dụng.`);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selectedProduct || !reviewText.trim()) return;
    if (selectedProduct._id.length !== 24) {
      setReviewMessage("Sản phẩm này chưa kết nối với dữ liệu đánh giá.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    setReviewMessage("");
    setReviewSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/web-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct._id,
          name: authUser,
          rating: reviewRating,
          text: reviewText.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Không thể gửi đánh giá.");
      }

      setReviews((current) => ({
        ...current,
        [selectedProduct._id]: [
          result,
          ...(current[selectedProduct._id] || []),
        ],
      }));
      setReviewText("");
      setReviewRating(5);
      setReviewMessage("Đánh giá của bạn đã được gửi.");
    } catch (error) {
      setReviewMessage(error.message || "Không thể kết nối để gửi đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const addToCart = (product) =>
    setCart((current) => {
      const found = current.find((item) => item._id === product._id);
      if (found)
        return current.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      return [...current, { ...product, quantity: 1 }];
    });
  const changeQuantity = (id, change) =>
    setCart((current) =>
      current
        .map((item) =>
          item._id === id
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

  const submitWebOrder = async (shippingAddress, paymentMethod = "cod", checkoutReference, bankCode) => {
    if (!authToken) {
      throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng xuất rồi đăng nhập lại.");
    }
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    await cartSaveQueue.current;
    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };
    if (paymentMethod === "cod") {
      const cartResponse = await fetch(`${apiUrl}/cart/web`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
          })),
        }),
      });
      const cartData = await cartResponse.json();
      if (!cartResponse.ok) {
        throw new Error(
          cartData.message || "Không thể đồng bộ giỏ hàng trước khi đặt.",
        );
      }
    }

    const response = await fetch(`${apiUrl}/orders/web`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shippingAddress, paymentMethod, checkoutReference, bankCode, expectedTotal: checkoutTotals(cartTotal, appliedCoupon, paymentMethod).total,
        expectedItems: cart.map(item => ({ product: item._id, quantity: item.quantity })),
        couponCode: paymentMethod === "vnpay" ? Object.keys(coupons).find(code => coupons[code] === appliedCoupon) : undefined }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Không thể tạo đơn hàng.");
    }
    setCart([]);
    if (paymentMethod !== "cod") await openPayment(data.order._id, authToken, bankCode);
    return data.order;
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    if (authForm.password.length < 6) {
      setAuthError("Mật khẩu cần có ít nhất 6 ký tự.");
      return;
    }
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const response = await fetch(
        `${apiUrl}/auth/${authMode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authForm),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không thể xác thực tài khoản.");
      localStorage.setItem("net_store_user", data.user.name);
      localStorage.setItem("net_store_email", data.user.email);
      localStorage.setItem("net_store_role", data.user.role || "customer");
      localStorage.setItem("net_store_token", data.token);
      setCart(loadSavedCart(data.user.email));
      setAuthUser(data.user.name);
      setAuthEmail(data.user.email);
      setAuthRole(data.user.role || "customer");
      setAuthToken(data.token);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const openProfile = async () => {
    setProfileMessage("");
    setAccountTab("profile");
    setProfileOpen(true);
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const response = await fetch(
        `${apiUrl}/auth/profile?email=${encodeURIComponent(authEmail)}`,
      );
      const data = await response.json();
      if (response.ok)
        setProfileForm({
          name: data.user.name || "",
          email: data.user.email || authEmail,
          phone: data.user.phone || "",
          address: data.user.address || "",
        });
    } catch {
      setProfileMessage("Không thể tải thông tin cá nhân.");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const response = await fetch(`${apiUrl}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không thể lưu thông tin.");
      setAuthUser(data.user.name);
      localStorage.setItem("net_store_user", data.user.name);
      setProfileMessage("Đã cập nhật thông tin cá nhân.");
    } catch (error) {
      setProfileMessage(error.message);
    }
  };
  if (supportMode) return <HelpCenter />;
  if (!authUser)
    return (
      <AuthScreen
        mode={authMode}
        setMode={(mode) => {
          setAuthMode(mode);
          setAuthError("");
        }}
        form={authForm}
        setForm={setAuthForm}
        error={authError}
        onSubmit={handleAuth}
      />
    );
  if (authRole === "admin")
    return (
      <AdminPanel
        adminName={authUser}
        email={authEmail}
        onLogout={() => {
          localStorage.removeItem("net_store_user");
          localStorage.removeItem("net_store_email");
          localStorage.removeItem("net_store_role");
          localStorage.removeItem("net_store_token");
          setAuthUser(null);
          setAuthToken("");
        }}
      />
    );
  if (authRole === "seller")
    return (
      <SellerDashboard
        name={authUser}
        email={authEmail}
        token={authToken}
        onLogout={() => {
          localStorage.removeItem("net_store_user");
          localStorage.removeItem("net_store_email");
          localStorage.removeItem("net_store_role");
          localStorage.removeItem("net_store_token");
          setAuthUser(null);
          setAuthEmail("");
          setAuthRole("customer");
          setAuthToken("");
        }}
      />
    );

  const cartProps = { cart, products, onQuantity: changeQuantity, onRemove: id => setCart(items => items.filter(item => item._id !== id)), onAdd: addToCart,
    onView: product => { setCartOpen(false); setCartPageOpen(false); viewProduct(product); },
    onCheckout: () => { setCartOpen(false); setCartPageOpen(false); setCheckoutOpen(true); },
    coupon: appliedCoupon, couponCode: Object.keys(coupons).find(code => coupons[code] === appliedCoupon), couponInput, onCouponInput: setCouponInput,
    onApplyCoupon: applyCoupon, couponMessage, syncMessage: cartSyncMessage };
  return (
    <div className="storefront">
      <StoreHeader products={products} user={authUser} search={search} onSearch={setSearch} searchFocused={searchFocused} onSearchFocus={setSearchFocused} suggestions={suggestions} category={category} onCategory={setCategory} cartCount={cartCount} onCart={() => setCartOpen(true)} onProfile={openProfile} onOrders={() => { openProfile(); setAccountTab("orders"); }} onLogout={() => {
        ["user", "email", "role", "token"].forEach(key => localStorage.removeItem("net_store_" + key));
        setAuthUser(null); setAuthToken("");
      }} />
      <main id="top">
        <HomePage products={products} category={category} onCategory={setCategory} search={search} onSearch={setSearch} onView={viewProduct} onAdd={addToCart} onBuy={product => { addToCart(product); setCheckoutOpen(true); }} onShop={setSellerShop} />
      </main>
      <footer id="contact">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>NET STORE</span>
        </div>
        <p>Đồ dùng tử tế cho nhịp sống hiện đại.</p>
        <span>© 2026 NET</span>
      </footer>
      {cartOpen && <CartDrawer {...cartProps} onClose={() => setCartOpen(false)} onViewCart={() => { setCartOpen(false); setCartPageOpen(true); }} />}
      {cartPageOpen && <CartPage {...cartProps} onClose={() => setCartPageOpen(false)} />}

      {selectedProduct && (
        <div className="overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="product-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Đóng chi tiết sản phẩm"
              onClick={() => setSelectedProduct(null)}
            >
              <X />
            </button>
            <div className="detail-image">
              {selectedProduct.discountPercent > 0 && <span className="sale-badge">
                -{selectedProduct.discountPercent}%
              </span>}
              <ProductImage product={selectedProduct} />
            </div>
            <div className="detail-content">
              <p className="breadcrumb">
                Net Store &gt; {selectedProduct.category}
              </p>
              <h2>{selectedProduct.name}</h2>
              <p className="detail-brand">Thương hiệu: {selectedProduct.brand}</p>
              <div className="detail-rating">
                <span>{productRating(selectedProduct) > 0 ? `★ ${productRating(selectedProduct).toFixed(1)}` : "Chưa có đánh giá"}</span>
                <span>{selectedProduct.sold > 0 ? `${selectedProduct.sold} đã bán` : "Chưa có lượt bán"}</span>
              </div>
              <div className="detail-price">
                <strong>{formatPrice(selectedProduct.price)}</strong>
                {selectedProduct.discountPercent > 0 && <><del>{formatPrice(selectedProduct.originalPrice)}</del><b>Giảm {selectedProduct.discountPercent}%</b></>}
              </div>
              <div className="voucher-list">
                <p>Voucher của shop</p>
                <span>NET10 · Giảm 10% qua VNPay</span>
                <span>WELCOME50 · Giảm 50.000đ qua VNPay</span>
              </div>
              <p className="detail-description">
                {selectedProduct.description}
              </p>
              <section className="seller-card">
                <div className="seller-avatar">
                  {selectedProduct.sellerName?.charAt(0).toUpperCase() || "N"}
                </div>
                <div className="seller-card-info">
                  <span>NGƯỜI BÁN</span>
                  <strong>{selectedProduct.sellerName}</strong>
                  <small>{selectedProduct.sellerLocation}</small>
                </div>
                <button
                  onClick={() => {
                    setSellerShop(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  Xem shop
                </button>
              </section>
              <div className="detail-service">
                <span>✓ Đổi trả miễn phí</span>
                <span>✓ Giao hàng nhanh</span>
              </div>
              <div className="detail-actions">
                <button
                  className="detail-add"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  Thêm vào giỏ hàng
                </button>
                <button
                  className="detail-buy"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                    setCheckoutOpen(true);
                  }}
                >
                  Mua ngay
                </button>
              </div>
              <section className="reviews-section">
                <div className="reviews-heading">
                  <h3>
                    <MessageCircle size={18} /> Đánh giá sản phẩm
                  </h3>
                  <span>
                    {(reviews[selectedProduct._id] || []).length} bình luận
                  </span>
                </div>
                <form className="review-form" onSubmit={submitReview}>
                  <div className="star-picker">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={
                          star <= reviewRating ? "star active" : "star"
                        }
                        onClick={() => setReviewRating(star)}
                        aria-label={`${star} sao`}
                      >
                        <Star size={19} fill="currentColor" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="Chia sẻ cảm nhận của bạn..."
                    rows="3"
                    required
                  />
                  <button
                    className="review-submit"
                    type="submit"
                    disabled={reviewSubmitting}
                  >
                    {reviewSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                  {reviewMessage && (
                    <p
                      className={
                        reviewMessage.startsWith("Đánh giá")
                          ? "review-message review-message-success"
                          : "review-message"
                      }
                      role="status"
                    >
                      {reviewMessage}
                    </p>
                  )}
                </form>
                <div className="review-list">
                  {(reviews[selectedProduct._id] || []).map((review, index) => (
                    <article
                      className="review-item"
                      key={review._id || `${review.createdAt}-${index}`}
                    >
                      <div className="review-avatar">
                        {review.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{review.name}</strong>
                        <div className="review-meta">
                          <span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                fill={star <= review.rating ? "currentColor" : "none"}
                              />
                            ))}
                          </span>
                          {review.createdAt && (
                            <small>
                              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                            </small>
                          )}
                        </div>
                        <p>{review.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      {sellerShop && (
        <div className="overlay seller-shop-overlay" onClick={() => setSellerShop(null)}>
          <section className="seller-shop" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSellerShop(null)} aria-label="Đóng shop">
              <X />
            </button>
            <header className="seller-shop-header">
              <div className="seller-avatar seller-shop-avatar">
                {sellerShop.sellerName?.charAt(0).toUpperCase() || "N"}
              </div>
              <div>
                <p className="eyebrow">GIAN HÀNG NGƯỜI BÁN</p>
                <h2>{sellerShop.sellerName}</h2>
                <p><Store size={14} /> {sellerShop.sellerLocation}</p>
              </div>
            </header>
            <div className="seller-shop-stats">
              <span><strong>{products.filter((product) => product.sellerName === sellerShop.sellerName).length}</strong>Sản phẩm</span>
              <span><strong>{sellerShop.sold}+</strong>Lượt bán sản phẩm nổi bật</span>
              <span><strong>{sellerShop.brand}</strong>Thương hiệu</span>
            </div>
            <div className="seller-shop-products">
              <div className="seller-shop-products-heading">
                <h3>Tất cả sản phẩm</h3>
                <span>{products.filter((product) => product.sellerName === sellerShop.sellerName).length} sản phẩm</span>
              </div>
              <div className="product-grid">
                {products
                  .filter((product) => product.sellerName === sellerShop.sellerName)
                  .map((product) => (
                    <article
                      className="product-card"
                      key={product._id}
                      onClick={() => {
                        setSellerShop(null);
                        viewProduct(product);
                      }}
                    >
                      <div className="product-image">
                        <ProductImage product={product} />
                      </div>
                      <div className="product-info">
                        <span className="product-brand">{product.brand}</span>
                        <h3>{product.name}</h3>
                        <div className="price-row">
                          <strong>{formatPrice(product.price)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          </section>
        </div>
      )}
      {checkoutOpen && !ordered && (
        <Dialog label="Thanh toán" className="checkout-overlay checkout-dialog" onClose={() => setCheckoutOpen(false)}>
          <CheckoutPanel authToken={authToken} authEmail={authEmail} cart={cart} coupon={appliedCoupon} couponCode={cartProps.couponCode} couponInput={couponInput} onCouponInput={setCouponInput} onApplyCoupon={applyCoupon} couponMessage={couponMessage} onBack={() => { setCheckoutOpen(false); setCartPageOpen(true); }} onComplete={() => setOrdered(true)} onSubmitOrder={submitWebOrder} />
        </Dialog>
      )}
      {checkoutOpen && ordered && (
        <div className="overlay">
          <div className="checkout-modal">
            <div className="success"><span><Check /></span><h2>Đặt hàng thành công</h2><p>Cảm ơn bạn. Net sẽ liên hệ để xác nhận đơn hàng.</p><button className="checkout-button" onClick={() => { setOrdered(false); setCheckoutOpen(false); setCart([]); }}>Tiếp tục mua sắm</button></div>
          </div>
        </div>
      )}
      {profileOpen && (
        <div className="overlay profile-overlay" onClick={() => setProfileOpen(false)}>
          <div className="profile-center" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setProfileOpen(false)}><X /></button>
            <aside className="profile-sidebar">
              <div className="profile-user"><div className="profile-avatar">{authUser?.charAt(0).toUpperCase()}</div><div><strong>{authUser}</strong><button onClick={() => setAccountTab("profile")}>✎ Sửa hồ sơ</button></div></div>
              <nav className="profile-nav">
                <button className={accountTab === "promotions" ? "profile-nav-active" : ""} onClick={() => setAccountTab("promotions")}>♧ Thông báo</button>
                <button className="profile-nav-title"><UserRound size={16} /> Tài khoản của tôi</button>
                <button
                  className={
                    accountTab === "profile" ? "profile-nav-active" : ""
                  }
                  onClick={() => setAccountTab("profile")}
                >
                  Hồ sơ
                </button>
                <button
                  className={
                    accountTab === "bank" ? "profile-nav-active" : ""
                  }
                  onClick={() => setAccountTab("bank")}
                >
                  Ngân hàng
                </button>
                <button
                  className={
                    accountTab === "addresses" ? "profile-nav-active" : ""
                  }
                  onClick={() => setAccountTab("addresses")}
                >
                  Địa chỉ
                </button>
                <button
                  className={
                    accountTab === "password" ? "profile-nav-active" : ""
                  }
                  onClick={() => setAccountTab("password")}
                >
                  Đổi mật khẩu
                </button>
                <button className={accountTab === "orders" ? "profile-nav-title profile-nav-active" : "profile-nav-title"} onClick={() => setAccountTab("orders")}>▣ Đơn mua</button>
                <button className={accountTab === "vouchers" ? "profile-nav-title profile-nav-active" : "profile-nav-title"} onClick={() => setAccountTab("vouchers")}>▤ Kho Voucher</button>
              </nav>
            </aside>
            <section className="profile-main">
              {accountTab === "promotions" ? (
                <PromotionPanel />
              ) : accountTab === "bank" ? (
                <BankPanel email={authEmail} />
              ) : accountTab === "addresses" ? (
                <AddressPanel email={authEmail} authToken={authToken} />
              ) : accountTab === "password" ? (
                <PasswordPanel email={authEmail} />
              ) : accountTab === "orders" ? (
                <OrdersPanel email={authEmail} authToken={authToken} />
              ) : accountTab === "vouchers" ? (
                <VoucherPanel email={authEmail} />
              ) : (
                <>
                  <p className="eyebrow">TÀI KHOẢN CỦA TÔI</p>
                  <h2>Hồ sơ của tôi</h2>
                  <p className="profile-subtitle">
                    Quản lý thông tin hồ sơ để bảo mật tài khoản
                  </p>
                  <div className="profile-divider" />
                  <div className="profile-layout">
                    <form className="profile-form" onSubmit={saveProfile}>
                      <label>
                        Tên đăng nhập
                        <input
                          value={profileForm.email.split("@")[0]}
                          disabled
                        />
                        <small>
                          Tên đăng nhập chỉ dùng để nhận diện tài khoản.
                        </small>
                      </label>
                      <label>
                        Tên
                        <input
                          required
                          value={profileForm.name}
                          onChange={(event) =>
                            setProfileForm({
                              ...profileForm,
                              name: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Email
                        <input value={profileForm.email} disabled />
                      </label>
                      <label>
                        Số điện thoại
                        <input
                          value={profileForm.phone}
                          onChange={(event) =>
                            setProfileForm({
                              ...profileForm,
                              phone: event.target.value,
                            })
                          }
                          placeholder="Thêm số điện thoại"
                        />
                      </label>
                      <label>
                        Địa chỉ
                        <textarea
                          rows="2"
                          value={profileForm.address}
                          onChange={(event) =>
                            setProfileForm({
                              ...profileForm,
                              address: event.target.value,
                            })
                          }
                          placeholder="Thêm địa chỉ nhận hàng"
                        />
                      </label>
                      <div className="profile-options">
                        <span>Giới tính</span>
                        <label>
                          <input type="radio" name="gender" /> Nam
                        </label>
                        <label>
                          <input type="radio" name="gender" /> Nữ
                        </label>
                        <label>
                          <input type="radio" name="gender" /> Khác
                        </label>
                      </div>
                      <label>
                        Ngày sinh
                        <input type="date" />
                      </label>
                      {profileMessage && (
                        <p
                          className={
                            profileMessage.startsWith("Đã")
                              ? "profile-success"
                              : "auth-error"
                          }
                        >
                          {profileMessage}
                        </p>
                      )}
                      <button className="profile-save" type="submit">
                        Lưu
                      </button>
                    </form>
                    <div className="profile-photo">
                      <div className="large-avatar">
                        <UserRound size={55} />
                      </div>
                      <button>Chọn ảnh</button>
                      <p>
                        Dung lượng file tối đa 1 MB
                        <br />
                        Định dạng: JPEG, PNG
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordPanel({ email }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async (event) => {
    event.preventDefault();
    setMessage("");
    if (form.newPassword.length < 6) {
      setMessage("Mật khẩu mới cần có ít nhất 6 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
      const response = await fetch(`${apiUrl}/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể đổi mật khẩu.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Đã đổi mật khẩu thành công.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return <><p className="eyebrow">BẢO MẬT TÀI KHOẢN</p><h2>Đổi mật khẩu</h2><p className="profile-subtitle">Cập nhật mật khẩu để bảo vệ tài khoản Net của bạn.</p><div className="profile-divider"/><form className="profile-form password-form" onSubmit={changePassword}><label>Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} placeholder="Nhập mật khẩu hiện tại"/></label><label>Mật khẩu mới<input required minLength="6" type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} placeholder="Tối thiểu 6 ký tự"/><small>Nên dùng mật khẩu riêng, khó đoán và không dùng lại ở nơi khác.</small></label><label>Xác nhận mật khẩu mới<input required minLength="6" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Nhập lại mật khẩu mới"/></label>{message && <p className={message.startsWith("Đã") ? "profile-success" : "auth-error"}>{message}</p>}<button className="profile-save" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Đổi mật khẩu"}</button></form></>;
}

function AuthScreen({ mode, setMode, form, setForm, error, onSubmit }) {
  const isRegister = mode === "register";
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <a className="brand auth-brand" href="#top">
          <span className="brand-mark">N</span>
          <span>NET STORE</span>
        </a>
        <div className="auth-quote">
          <p className="eyebrow">MỘT KHỞI ĐẦU ĐẸP</p>
          <h1>
            Những điều
            <br />
            <em>tử tế bắt đầu</em>
            <br />
            từ hôm nay.
          </h1>
          <p>
            Đăng nhập để lưu sản phẩm yêu thích và tiếp tục hành trình mua sắm
            của bạn.
          </p>
        </div>
        <span className="auth-caption">
          Đồ dùng tử tế cho nhịp sống hiện đại.
        </span>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <p className="eyebrow">
            {isRegister ? "TẠO TÀI KHOẢN" : "CHÀO MỪNG TRỞ LẠI"}
          </p>
          <h2>{isRegister ? "Bắt đầu hành trình." : "Đăng nhập vào Net."}</h2>
          <p className="auth-description">
            {isRegister
              ? "Tạo tài khoản để trải nghiệm cửa hàng trọn vẹn hơn."
              : "Nhập thông tin của bạn để tiếp tục mua sắm."}
          </p>
          <form className="auth-form" onSubmit={onSubmit}>
            {isRegister && (
              <label>
                Họ và tên
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Nguyễn Văn An"
                />
              </label>
            )}
            {isRegister && (
              <label>
                Loại tài khoản
                <select
                  value={form.role || "customer"}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                >
                  <option value="customer">Khách hàng</option>
                  <option value="seller">Người bán</option>
                </select>
              </label>
            )}
            {isRegister && form.role === "seller" && (
              <>
                <label>
                  Tên gian hàng
                  <input
                    required
                    value={form.shopName || ""}
                    onChange={(event) =>
                      setForm({ ...form, shopName: event.target.value })
                    }
                    placeholder="Nhà May Handmade"
                  />
                </label>
                <label>
                  Địa chỉ gian hàng
                  <input
                    required
                    value={form.shopLocation || ""}
                    onChange={(event) =>
                      setForm({ ...form, shopLocation: event.target.value })
                    }
                    placeholder="Hà Nội"
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="ban@example.com"
              />
            </label>
            <label>
              Mật khẩu
              <input
                required
                type="password"
                minLength="6"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit">
              {isRegister ? (
                <>
                  <UserPlus size={18} /> Đăng ký
                </>
              ) : (
                <>
                  <LogIn size={18} /> Đăng nhập
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? "Bạn đã có tài khoản?" : "Bạn chưa có tài khoản?"}{" "}
            <button onClick={() => setMode(isRegister ? "login" : "register")}>
              {isRegister ? "Đăng nhập" : "Tạo tài khoản"}
            </button>
          </p>
          <p className="auth-note">
            Tài khoản được lưu trên MongoDB của cửa hàng.
          </p>
        </div>
      </div>
    </div>
  );
}

function PromotionPanel() {
  const promotions = [
    {
      title: "Voucher dành riêng cho bạn mới đang chờ!",
      text: "Tặng ngay voucher giảm 60.000đ và freeship cho đơn đầu tiên.",
      code: "WELCOME50",
      tone: "promo-peach",
    },
    {
      title: "Ưu đãi cuối tuần cho đồ dùng gia đình",
      text: "Giảm thêm 10% cho đèn bàn, khay gỗ và phụ kiện góc làm việc.",
      code: "NET10",
      tone: "promo-green",
    },
    {
      title: "Freeship toàn cửa hàng",
      text: "Miễn phí vận chuyển cho đơn từ 300.000đ trong hôm nay.",
      code: "FREESHIP",
      tone: "promo-blue",
    },
  ];
  return (
    <>
      <div className="promotion-top">
        <div>
          <p className="eyebrow">THÔNG BÁO & KHUYẾN MÃI</p>
          <h2>Ưu đãi dành cho bạn</h2>
        </div>
        <button>Đánh dấu đã đọc tất cả</button>
      </div>
      <div className="promotion-list">
        {promotions.map((promotion) => (
          <article
            className={`promotion-card ${promotion.tone}`}
            key={promotion.code}
          >
            <div className="promotion-icon">%</div>
            <div className="promotion-copy">
              <h3>{promotion.title}</h3>
              <p>{promotion.text}</p>
              <small>
                Hôm nay · Mã: <strong>{promotion.code}</strong>
              </small>
            </div>
            <button className="promotion-detail">Xem chi tiết</button>
          </article>
        ))}
      </div>
    </>
  );
}

export default App;
