import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  LogIn,
  LogOut,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
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
import AdvertisingSection from "./AdvertisingSection";
import CheckoutPanel from "./CheckoutPanel";
import { withSellerDetails } from "./lib/marketplace";

const fallbackProducts = [
  {
    _id: "linen-shirt",
    name: "Áo sơ mi Linen",
    description:
      "Phom relaxed, chất linen thoáng nhẹ cho những ngày năng động.",
    price: 420000,
    category: "Thời trang",
    images: [
      "https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "cotton-tee",
    name: "Áo thun Cotton Basic",
    description: "Cotton mềm thoáng, phom cơ bản dễ phối mỗi ngày.",
    price: 195000,
    category: "Thời trang",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "denim-jacket",
    name: "Áo khoác Denim",
    description: "Lớp khoác denim đứng dáng cho những ngày se lạnh.",
    price: 690000,
    category: "Thời trang",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "canvas-tote",
    name: "Túi Canvas Daily",
    description: "Túi canvas bền chắc, đủ rộng cho một ngày làm việc.",
    price: 285000,
    category: "Phụ kiện",
    images: [
      "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "ceramic-cup",
    name: "Cốc gốm Morning",
    description: "Một chiếc cốc thủ công cho nghi thức buổi sáng chậm rãi.",
    price: 190000,
    category: "Nhà cửa",
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "leather-wallet",
    name: "Ví da Compact",
    description: "Thiết kế tối giản, gọn gàng, dùng lâu càng đẹp.",
    price: 560000,
    category: "Phụ kiện",
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "sunglasses-frame",
    name: "Kính mát Frame 01",
    description: "Gọng kính nhẹ, tròng chống UV cho ngày nắng.",
    price: 325000,
    category: "Phụ kiện",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "minimal-watch",
    name: "Đồng hồ Minimal",
    description: "Mặt số thanh lịch, dây da mềm và dễ phối đồ.",
    price: 780000,
    category: "Phụ kiện",
    images: [
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "sneakers-cloud",
    name: "Giày Cloud Walk",
    description: "Đế êm nhẹ, phối đồ linh hoạt cho cả ngày dài.",
    price: 890000,
    category: "Thời trang",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "scented-candle",
    name: "Nến thơm Gỗ tuyết tùng",
    description: "Hương gỗ ấm, tạo một góc nhà thật thư thái.",
    price: 245000,
    category: "Nhà cửa",
    images: [
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "wireless-headphones",
    name: "Tai nghe Quiet",
    description: "Âm thanh rõ, thiết kế gọn cho những chuyến đi xa.",
    price: 1250000,
    category: "Công nghệ",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "mechanical-keyboard",
    name: "Bàn phím Mechanical",
    description: "Layout gọn, gõ êm và phù hợp góc máy tối giản.",
    price: 980000,
    category: "Công nghệ",
    images: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "desk-speaker",
    name: "Loa để bàn Mini",
    description: "Âm thanh cân bằng cho bàn làm việc và phòng nhỏ.",
    price: 540000,
    category: "Công nghệ",
    images: [
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "desk-lamp",
    name: "Đèn bàn Halo",
    description: "Ánh sáng dịu cho góc học tập và làm việc.",
    price: 635000,
    category: "Nhà cửa",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "soft-pillow",
    name: "Gối tựa Soft Cloud",
    description: "Gối tựa êm với màu trung tính cho sofa và phòng ngủ.",
    price: 210000,
    category: "Nhà cửa",
    images: [
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "wooden-tray",
    name: "Khay gỗ Oak",
    description: "Khay gỗ vân tự nhiên, đẹp cho bàn trà và bàn làm việc.",
    price: 295000,
    category: "Nhà cửa",
    images: [
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "skincare-set",
    name: "Bộ chăm sóc da Daily",
    description: "Bộ ba bước tối giản cho làn da sạch và đủ ẩm.",
    price: 480000,
    category: "Làm đẹp",
    images: [
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "hair-care",
    name: "Bộ chăm sóc tóc Silk",
    description: "Dưỡng tóc nhẹ nhàng cho mái tóc mềm và sáng khỏe.",
    price: 365000,
    category: "Làm đẹp",
    images: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "makeup-bag",
    name: "Túi mỹ phẩm Travel",
    description: "Nhiều ngăn nhỏ gọn, tiện mang theo trong mỗi chuyến đi.",
    price: 230000,
    category: "Làm đẹp",
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "travel-backpack",
    name: "Ba lô Travel 20L",
    description: "Nhiều ngăn tiện dụng, sẵn sàng cho công việc và du lịch.",
    price: 745000,
    category: "Phụ kiện",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "notebook-set",
    name: "Sổ giấy tái chế",
    description: "Bộ sổ ba cuốn cho ý tưởng, kế hoạch và những ghi chú nhỏ.",
    price: 120000,
    category: "Văn phòng phẩm",
    images: [
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "desk-organizer",
    name: "Khay đựng bút Desk",
    description: "Giữ góc học tập gọn gàng với khay đựng đa năng.",
    price: 145000,
    category: "Văn phòng phẩm",
    images: [
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    _id: "planner-2026",
    name: "Sổ kế hoạch 2026",
    description: "Lịch tuần, mục tiêu và ghi chú trong một cuốn sổ tiện dụng.",
    price: 175000,
    category: "Văn phòng phẩm",
    images: [
      "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=900&q=80",
    ],
  },
];

const coupons = {
  NET10: { type: "percent", value: 10, label: "Giảm 10%" },
  WELCOME50: { type: "fixed", value: 50000, label: "Giảm 50.000đ" },
  FREESHIP: { type: "fixed", value: 30000, label: "Giảm 30.000đ" },
};
const discountRates = [10, 15, 20, 12, 25, 18, 30, 10, 16, 22, 14];
const decorateProduct = (product, index) => ({
  ...withSellerDetails(product, index),
  originalPrice:
    product.originalPrice ||
    Math.round(
      product.price / (1 - discountRates[index % discountRates.length] / 100),
    ),
  discountPercent:
    product.discountPercent || discountRates[index % discountRates.length],
  sold: product.sold || (index + 2) * 137,
});
const demoFallbackProducts = fallbackProducts.map(decorateProduct);

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
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
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState(
    fallbackProducts.map(decorateProduct),
  );
  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sellerShop, setSellerShop] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountTab, setAccountTab] = useState("profile");
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

  const categories = [
    "Tất cả",
    ...new Set(products.map((product) => product.category)),
  ];
  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const query = normalizeSearch(search.trim());
        const searchableText = normalizeSearch(
          `${product.name} ${product.description || ""} ${product.category}`,
        );
        return (
          (category === "Tất cả" || product.category === category) &&
          searchableText.includes(query)
        );
      }),
    [category, products, search],
  );
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
  const discount = appliedCoupon
    ? appliedCoupon.type === "percent"
      ? Math.round((cartTotal * appliedCoupon.value) / 100)
      : Math.min(appliedCoupon.value, cartTotal)
    : 0;
  const finalTotal = Math.max(0, cartTotal - discount);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!coupons[code]) {
      setAppliedCoupon(null);
      setCouponMessage("Mã không hợp lệ. Thử NET10, WELCOME50 hoặc FREESHIP.");
      return;
    }
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
      setAuthUser(data.user.name);
      setAuthEmail(data.user.email);
      setAuthRole(data.user.role || "customer");
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
        fallbackProducts={demoFallbackProducts}
        onLogout={() => {
          localStorage.removeItem("net_store_user");
          localStorage.removeItem("net_store_email");
          localStorage.removeItem("net_store_role");
          setAuthUser(null);
        }}
      />
    );

  return (
    <div className="storefront">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">N</span>
          <span>NET STORE</span>
        </a>
        <nav>
          <a href="#shop">Cửa hàng</a>
        </nav>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchFocused(true);
              }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Tìm sản phẩm"
            />
            {searchFocused && search.trim() && (
              <div className="search-suggestions">
                {suggestions.length ? (
                  suggestions.map((product) => (
                    <button
                      key={product._id}
                      onMouseDown={() => {
                        setSearch(product.name);
                        setSearchFocused(false);
                        document
                          .getElementById("shop")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <img src={product.images?.[0]} alt="" />
                      <span>{product.name}</span>
                      <small>{product.category}</small>
                    </button>
                  ))
                ) : (
                  <p>Không có sản phẩm bắt đầu bằng “{search}”.</p>
                )}
              </div>
            )}
          </div>
          <button
            className="support-button"
            onClick={() =>
              window.open(
                `${window.location.origin}/?support=1`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            <CircleHelp size={17} />
            <span>Hỗ Trợ</span>
          </button>
          <button className="profile-trigger" onClick={openProfile}>
            <UserRound size={17} />
            <span>{authUser}</span>
          </button>
          <button
            className="logout-button"
            onClick={() => {
              localStorage.removeItem("net_store_user");
              localStorage.removeItem("net_store_email");
              localStorage.removeItem("net_store_role");
              setAuthUser(null);
            }}
            aria-label="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
            aria-label="Mở giỏ hàng"
          >
            <ShoppingBag size={20} />
            <span>{cartCount}</span>
          </button>
        </div>
      </header>
      <main id="top">
        <AdvertisingSection onShopClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })} />
        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NET MARKET / DEAL HÔM NAY</p>
              <h2>
                Đồ dùng tốt
                <br />
                <em>giá tốt mỗi ngày.</em>
              </h2>
            </div>
            <p className="section-note">
              Mua sắm nhanh, chọn sản phẩm chất lượng và nhận ưu đãi riêng cho
              từng món.
            </p>
          </div>
          <div className="category-row">
            {categories.map((item) => (
              <button
                className={category === item ? "category active" : "category"}
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {visibleProducts.length === 0 ? (
            <div className="no-results">
              <Search size={30} />
              <h3>Không tìm thấy sản phẩm</h3>
              <p>Thử từ khóa khác hoặc chọn danh mục “Tất cả”.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("Tất cả");
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article
                  className="product-card"
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="product-image">
                    <span className="sale-badge">
                      -{product.discountPercent}%
                    </span>
                    <img src={product.images?.[0]} alt={product.name} />
                    <button
                      className="add-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product);
                      }}
                      aria-label={`Thêm ${product.name} vào giỏ`}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="product-info">
                    <p>{product.category}</p>
                    <span className="product-brand">{product.brand}</span>
                    <h3>{product.name}</h3>
                    <button
                      className="product-seller-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSellerShop(product);
                      }}
                    >
                      <Store size={13} />
                      {product.sellerName}
                    </button>
                    <div className="rating-row">
                      <span>★ 4.9</span>
                      <span>Đã bán {product.sold}+</span>
                    </div>
                    <div className="price-row">
                      <strong>{formatPrice(product.price)}</strong>
                      <del>{formatPrice(product.originalPrice)}</del>
                    </div>
                    <span className="shipping-label">Miễn phí vận chuyển</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="story" id="story">
          <div className="story-image">
            <img
              src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85"
              alt="Không gian sống tối giản"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">NET / PHILOSOPHY</p>
            <h2>
              Mua ít hơn.
              <br />
              <em>Chọn đúng hơn.</em>
            </h2>
            <p>
              Chúng tôi tin một sản phẩm tốt không cần nói quá nhiều. Nó chỉ cần
              làm đúng việc của mình, bền bỉ theo thời gian và khiến bạn muốn
              cầm lên mỗi ngày.
            </p>
            <a className="text-link" href="#shop">
              Xem bộ sưu tập <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
      <footer id="contact">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>NET STORE</span>
        </div>
        <p>Đồ dùng tử tế cho nhịp sống hiện đại.</p>
        <span>© 2026 NET</span>
      </footer>
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">GIỎ HÀNG CỦA BẠN</p>
                <h2>{cartCount} sản phẩm</h2>
              </div>
              <button onClick={() => setCartOpen(false)} aria-label="Đóng">
                <X />
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={42} />
                <p>Giỏ hàng đang trống.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <img src={item.images?.[0]} alt="" />
                      <div>
                        <h3>{item.name}</h3>
                        <strong>{formatPrice(item.price)}</strong>
                        <div className="quantity">
                          <button onClick={() => changeQuantity(item._id, -1)}>
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => changeQuantity(item._id, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="coupon-box">
                  <div>
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      placeholder="Mã giảm giá"
                    />
                    <button onClick={applyCoupon}>Áp dụng</button>
                  </div>
                  {couponMessage && (
                    <small
                      className={
                        appliedCoupon ? "coupon-success" : "coupon-error"
                      }
                    >
                      {couponMessage}
                    </small>
                  )}
                </div>
                <div className="cart-total">
                  <span>Tạm tính</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
                {discount > 0 && (
                  <div className="cart-total discount-row">
                    <span>Giảm giá</span>
                    <strong>-{formatPrice(discount)}</strong>
                  </div>
                )}
                <div className="cart-total final-row">
                  <span>Tổng cộng</span>
                  <strong>{formatPrice(finalTotal)}</strong>
                </div>
                <button
                  className="checkout-button"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                >
                  Đặt hàng <ArrowRight size={18} />
                </button>
              </>
            )}
          </aside>
        </div>
      )}
      {checkoutOpen && (
        <div className="overlay" onClick={() => setCheckoutOpen(false)}>
          <div
            className="checkout-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setCheckoutOpen(false)}
            >
              <X />
            </button>
            {ordered ? (
              <div className="success">
                <span>
                  <Check />
                </span>
                <h2>Đặt hàng thành công</h2>
                <p>Cảm ơn bạn. Cửa hàng sẽ liên hệ để xác nhận đơn hàng.</p>
                <button
                  className="checkout-button"
                  onClick={() => {
                    setOrdered(false);
                    setCheckoutOpen(false);
                    setCart([]);
                  }}
                >
                  Tiếp tục mua sắm
                </button>
              </div>
            ) : (
              <>
                <p className="eyebrow">HOÀN TẤT ĐẶT HÀNG</p>
                <h2>Thông tin nhận hàng</h2>
                <p className="muted">
                  Không cần thanh toán online. Bạn sẽ thanh toán khi nhận hàng.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const storageKey = `net_store_orders_${authEmail}`;
                    const orders = JSON.parse(localStorage.getItem(storageKey) || "[]");
                    orders.unshift({ id: `NET-${Date.now()}`, items: cart, total: finalTotal, status: "pending", createdAt: new Date().toISOString() });
                    localStorage.setItem(storageKey, JSON.stringify(orders));
                    setOrdered(true);
                  }}
                >
                  <input required placeholder="Họ và tên" />
                  <input required type="tel" placeholder="Số điện thoại" />
                  <textarea required placeholder="Địa chỉ nhận hàng" rows="3" />
                  <button className="checkout-button" type="submit">
                    Xác nhận đặt hàng <ArrowRight size={18} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {selectedProduct && (
        <div className="overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="product-detail"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
            >
              <X />
            </button>
            <div className="detail-image">
              <span className="sale-badge">
                -{selectedProduct.discountPercent}%
              </span>
              <img
                src={selectedProduct.images?.[0]}
                alt={selectedProduct.name}
              />
            </div>
            <div className="detail-content">
              <p className="breadcrumb">
                Net Store &gt; {selectedProduct.category}
              </p>
              <h2>{selectedProduct.name}</h2>
              <p className="detail-brand">Thương hiệu: {selectedProduct.brand}</p>
              <div className="detail-rating">
                <span>★ 4.9</span>
                <span>{selectedProduct.sold}+ đã bán</span>
                <span>Đã kiểm chứng</span>
              </div>
              <div className="detail-price">
                <strong>{formatPrice(selectedProduct.price)}</strong>
                <del>{formatPrice(selectedProduct.originalPrice)}</del>
                <b>Giảm {selectedProduct.discountPercent}%</b>
              </div>
              <div className="voucher-list">
                <p>Voucher của shop</p>
                <span>Giảm {selectedProduct.discountPercent}%</span>
                <span>Miễn phí vận chuyển</span>
                <span>Hoàn xu 5%</span>
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
                        setSelectedProduct(product);
                      }}
                    >
                      <div className="product-image">
                        <img src={product.images?.[0]} alt={product.name} />
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
        <div className="checkout-overlay">
          <CheckoutPanel cart={cart} total={finalTotal} discount={discount} email={authEmail} onBack={() => setCheckoutOpen(false)} onComplete={() => setOrdered(true)} />
        </div>
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
                <AddressPanel email={authEmail} />
              ) : accountTab === "password" ? (
                <PasswordPanel email={authEmail} />
              ) : accountTab === "orders" ? (
                <OrdersPanel email={authEmail} />
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
