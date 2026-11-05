import { createElement, useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Plus,
  Store,
  X,
} from "lucide-react";
import "./SellerDashboard.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const initialProductForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "",
  image: "",
};

async function sellerRequest(token, path, options = {}) {
  const response = await fetch(`${apiUrl}/seller${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể hoàn tất yêu cầu.");
  }
  return data;
}

function SellerDashboard({ name, email, token, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productDialog, setProductDialog] = useState(undefined);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", location: "" });
  const [updatingOrder, setUpdatingOrder] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const data = await sellerRequest(token, "/dashboard");
      setDashboard(data);
      setProfileForm({
        name: data.shop.name || "",
        location: data.shop.location || "",
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = dashboard?.stats;
  const chart = dashboard?.chart || [];
  const products = dashboard?.products || [];
  const orders = dashboard?.orders || [];
  const maxRevenue = Math.max(...chart.map((item) => item.revenue), 1);

  const openProductDialog = (product = null) => {
    setNotice("");
    setProductForm(
      product
        ? {
            name: product.name || "",
            description: product.description || "",
            category: product.category || "",
            price: String(product.price ?? ""),
            stock: String(product.stock ?? ""),
            image: product.images?.[0] || "",
          }
        : initialProductForm,
    );
    setProductDialog(product);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setError("");
    try {
      const isEditing = Boolean(productDialog?._id);
      const path = isEditing
        ? `/products/${productDialog._id}`
        : "/products";
      await sellerRequest(token, path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify({
          ...productForm,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
        }),
      });
      setProductDialog(undefined);
      setNotice(isEditing ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}" khỏi gian hàng?`)) return;
    setError("");
    setNotice("");
    try {
      await sellerRequest(token, `/products/${product._id}`, {
        method: "DELETE",
      });
      setNotice("Đã xóa sản phẩm.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");
    try {
      await sellerRequest(token, "/profile", {
        method: "PUT",
        body: JSON.stringify({
          shopName: profileForm.name,
          shopLocation: profileForm.location,
        }),
      });
      setNotice("Đã cập nhật thông tin gian hàng.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const advanceOrder = async (order, status) => {
    setUpdatingOrder(order._id);
    setError("");
    setNotice("");
    try {
      await sellerRequest(token, `/orders/${order._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice("Đã cập nhật trạng thái đơn hàng.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingOrder("");
    }
  };

  const navItems = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "products", label: "Sản phẩm", icon: Package },
    { id: "orders", label: "Đơn hàng", icon: ClipboardList },
    { id: "store", label: "Gian hàng", icon: Store },
  ];

  return (
    <div className="seller-workspace">
      <aside className="seller-sidebar">
        <a className="seller-brand" href="#seller-home">
          <span className="seller-brand-mark">N</span>
          <span>NET <b>SELLER</b></span>
        </a>
        <p className="seller-nav-caption">MENU CHÍNH</p>
        <nav className="seller-nav" aria-label="Điều hướng người bán">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={activeSection === id ? "active" : ""}
              key={id}
              onClick={() => {
                setActiveSection(id);
                setNotice("");
              }}
              type="button"
            >
              {createElement(Icon, { size: 18 })}
              {label}
              {id === "orders" && stats?.orders > 0 && (
                <span className="seller-nav-count">{stats.orders}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="seller-sidebar-bottom">
          <div className="seller-avatar">{(name || "N").charAt(0).toUpperCase()}</div>
          <div className="seller-account-copy">
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
          <button className="seller-logout-icon" onClick={onLogout} type="button" aria-label="Đăng xuất">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="seller-main" id="seller-home">
        <header className="seller-topbar">
          <div>
            <span className="seller-topbar-eyebrow">KÊNH NGƯỜI BÁN</span>
            <h1>{dashboard?.shop.name || "Gian hàng của bạn"}</h1>
          </div>
          <div className="seller-location">
            <MapPin size={16} />
            {dashboard?.shop.location || "Chưa cập nhật địa chỉ"}
          </div>
        </header>

        <div className="seller-content">
          {error && <div className="seller-alert seller-alert-error" role="alert">{error}</div>}
          {notice && <div className="seller-alert seller-alert-success" role="status">{notice}</div>}

          {loading ? (
            <div className="seller-loading"><span className="seller-spinner" />Đang tải dữ liệu gian hàng…</div>
          ) : (
            <>
              {activeSection === "overview" && (
                <section>
                  <div className="seller-page-heading">
                    <div>
                      <p className="seller-section-kicker">TỔNG QUAN</p>
                      <h2>Xin chào, {name} <span>👋</span></h2>
                      <p>Theo dõi hoạt động và hiệu quả kinh doanh của gian hàng.</p>
                    </div>
                    <button className="seller-primary-button" onClick={() => openProductDialog()} type="button">
                      <Plus size={18} /> Thêm sản phẩm
                    </button>
                  </div>

                  <div className="seller-stat-grid">
                    <StatCard label="Doanh thu" value={currency.format(stats?.revenue || 0)} icon={ArrowUpRight} tone="green" note="Tổng giá trị sản phẩm đã bán" />
                    <StatCard label="Đơn hàng" value={stats?.orders || 0} icon={ClipboardList} tone="orange" note="Đơn có sản phẩm của bạn" />
                    <StatCard label="Sản phẩm" value={stats?.products || 0} icon={Package} tone="blue" note="Đang có trong gian hàng" />
                    <StatCard label="Sắp hết hàng" value={stats?.lowStock || 0} icon={Boxes} tone="purple" note="Còn tối đa 5 sản phẩm" />
                  </div>

                  <div className="seller-overview-grid">
                    <section className="seller-panel seller-revenue-panel">
                      <div className="seller-panel-heading">
                        <div>
                          <p className="seller-section-kicker">HIỆU QUẢ KINH DOANH</p>
                          <h3>Doanh thu 6 tháng gần nhất</h3>
                        </div>
                        <span className="seller-period-chip">6 tháng</span>
                      </div>
                      <div className="seller-chart">
                        {chart.map((item) => (
                          <div className="seller-chart-column" key={item.label}>
                            <strong>{item.revenue ? currency.format(item.revenue) : "—"}</strong>
                            <div className="seller-chart-track">
                              <div
                                className="seller-chart-bar"
                                style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, item.revenue ? 8 : 3)}%` }}
                                title={currency.format(item.revenue)}
                              />
                            </div>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="seller-panel seller-inventory-panel">
                      <div className="seller-panel-heading">
                        <div>
                          <p className="seller-section-kicker">CẦN CHÚ Ý</p>
                          <h3>Tình trạng kho</h3>
                        </div>
                        <Boxes size={20} />
                      </div>
                      {products.filter((product) => product.stock <= 5).length ? (
                        <div className="seller-low-stock-list">
                          {products.filter((product) => product.stock <= 5).slice(0, 4).map((product) => (
                            <div className="seller-low-stock-item" key={product._id}>
                              <img src={product.images?.[0]} alt="" />
                              <div><strong>{product.name}</strong><span>{product.category}</span></div>
                              <b>{product.stock} còn</b>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="seller-empty-inline">Kho hàng đang ổn định. Chưa có sản phẩm sắp hết.</div>
                      )}
                    </section>
                  </div>

                  <section className="seller-panel seller-recent-orders">
                    <div className="seller-panel-heading">
                      <div>
                        <p className="seller-section-kicker">MỚI NHẤT</p>
                        <h3>Đơn hàng gần đây</h3>
                      </div>
                      <button className="seller-text-button" onClick={() => setActiveSection("orders")} type="button">
                        Xem tất cả <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <OrderList orders={orders.slice(0, 4)} updatingOrder={updatingOrder} onAdvance={advanceOrder} />
                  </section>
                </section>
              )}

              {activeSection === "products" && (
                <section>
                  <div className="seller-page-heading">
                    <div>
                      <p className="seller-section-kicker">QUẢN LÝ SẢN PHẨM</p>
                      <h2>Sản phẩm của gian hàng</h2>
                      <p>Cập nhật danh mục, giá bán và số lượng tồn kho.</p>
                    </div>
                    <button className="seller-primary-button" onClick={() => openProductDialog()} type="button">
                      <Plus size={18} /> Thêm sản phẩm
                    </button>
                  </div>
                  <section className="seller-panel seller-table-panel">
                    {products.length ? (
                      <div className="seller-table-scroll">
                        <table className="seller-table">
                          <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Thao tác</th></tr></thead>
                          <tbody>
                            {products.map((product) => (
                              <tr key={product._id}>
                                <td><div className="seller-product-cell"><img src={product.images?.[0]} alt="" /><div><strong>{product.name}</strong><span>{product.description}</span></div></div></td>
                                <td>{product.category}</td>
                                <td className="seller-price">{currency.format(product.price)}</td>
                                <td><span className={`seller-stock ${product.stock <= 5 ? "low" : ""}`}>{product.stock} sản phẩm</span></td>
                                <td><div className="seller-row-actions"><button onClick={() => openProductDialog(product)} type="button">Chỉnh sửa</button><button onClick={() => deleteProduct(product)} type="button">Xóa</button></div></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState title="Gian hàng chưa có sản phẩm" detail="Thêm sản phẩm đầu tiên để bắt đầu bán hàng." action={() => openProductDialog()} />
                    )}
                  </section>
                </section>
              )}

              {activeSection === "orders" && (
                <section>
                  <div className="seller-page-heading">
                    <div>
                      <p className="seller-section-kicker">QUẢN LÝ ĐƠN HÀNG</p>
                      <h2>Đơn hàng của gian hàng</h2>
                      <p>Xác nhận và cập nhật trạng thái giao hàng cho khách.</p>
                    </div>
                  </div>
                  <section className="seller-panel seller-orders-panel">
                    <OrderList orders={orders} updatingOrder={updatingOrder} onAdvance={advanceOrder} />
                  </section>
                </section>
              )}

              {activeSection === "store" && (
                <section>
                  <div className="seller-page-heading">
                    <div>
                      <p className="seller-section-kicker">HỒ SƠ GIAN HÀNG</p>
                      <h2>Thông tin cửa hàng</h2>
                      <p>Thông tin này xuất hiện cùng sản phẩm trên Net Store.</p>
                    </div>
                  </div>
                  <div className="seller-profile-layout">
                    <div className="seller-store-preview">
                      <div className="seller-store-avatar">{(dashboard?.shop.name || "N").charAt(0).toUpperCase()}</div>
                      <span className="seller-section-kicker">NGƯỜI BÁN</span>
                      <h3>{dashboard?.shop.name || "Tên gian hàng"}</h3>
                      <p><MapPin size={15} />{dashboard?.shop.location || "Địa chỉ gian hàng"}</p>
                      <span className="seller-owner-label">Chủ gian hàng · {name}</span>
                    </div>
                    <form className="seller-panel seller-profile-form" onSubmit={saveProfile}>
                      <h3>Chỉnh sửa hồ sơ</h3>
                      <label>Tên gian hàng<input required maxLength="80" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Nhà May Handmade" /></label>
                      <label>Địa chỉ<input required maxLength="120" value={profileForm.location} onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })} placeholder="Hà Nội" /></label>
                      <label>Tên chủ gian hàng<input value={name} readOnly /></label>
                      <label>Email đăng nhập<input value={email} readOnly /></label>
                      <button className="seller-primary-button" disabled={savingProfile} type="submit">{savingProfile ? "Đang lưu…" : "Lưu thông tin"}</button>
                    </form>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {productDialog !== undefined && (
        <div className="seller-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProductDialog(undefined);
        }}>
          <form className="seller-product-modal" onSubmit={saveProduct}>
            <div className="seller-modal-heading">
              <div><p className="seller-section-kicker">{productDialog ? "CẬP NHẬT" : "SẢN PHẨM MỚI"}</p><h2>{productDialog ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</h2></div>
              <button className="seller-close-button" onClick={() => setProductDialog(undefined)} type="button" aria-label="Đóng"><X size={20} /></button>
            </div>
            <label>Tên sản phẩm<input required maxLength="120" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Tên sản phẩm" /></label>
            <label>Mô tả<textarea required rows="3" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Mô tả sản phẩm" /></label>
            <div className="seller-form-row">
              <label>Danh mục<input required value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Thời trang" /></label>
              <label>Giá bán (₫)<input required type="number" min="0" step="1000" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="250000" /></label>
            </div>
            <div className="seller-form-row">
              <label>Số lượng tồn<input required type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} placeholder="20" /></label>
              <label>Đường dẫn ảnh<input required type="url" value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} placeholder="https://…" /></label>
            </div>
            {error && <div className="seller-alert seller-alert-error" role="alert">{error}</div>}
            <div className="seller-modal-actions">
              <button className="seller-secondary-button" onClick={() => setProductDialog(undefined)} type="button">Hủy</button>
              <button className="seller-primary-button" disabled={savingProduct} type="submit">{savingProduct ? "Đang lưu…" : productDialog ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, note }) {
  return (
    <article className="seller-stat-card">
      <div className={`seller-stat-icon ${tone}`}>{createElement(Icon, { size: 19 })}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function OrderList({ orders, updatingOrder, onAdvance }) {
  if (!orders.length) {
    return <EmptyState title="Chưa có đơn hàng" detail="Đơn hàng có sản phẩm của bạn sẽ xuất hiện tại đây." />;
  }

  return (
    <div className="seller-order-list">
      {orders.map((order) => {
        const status = order.orderItems[0]?.sellerStatus || "pending";
        const nextStatus = status === "pending" ? "shipped" : status === "shipped" ? "delivered" : null;
        const statusLabels = { pending: "Chờ xử lý", shipped: "Đang giao", delivered: "Đã giao" };
        return (
          <article className="seller-order-card" key={order._id}>
            <div className="seller-order-top">
              <div><span className="seller-order-id">ĐƠN #{order._id.slice(-8).toUpperCase()}</span><span className={`seller-order-status ${status}`}>{statusLabels[status]}</span></div>
              <time>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</time>
            </div>
            <div className="seller-order-customer"><strong>{order.shippingAddress?.fullName || order.user?.name || "Khách hàng"}</strong><span>{order.orderItems.length} sản phẩm · {currency.format(order.sellerTotal || 0)}</span></div>
            <div className="seller-order-items">
              {order.orderItems.map((item, index) => (
                <div key={`${item._id || item.product?._id || item.name}-${index}`}>
                  <span>{item.name} <b>× {item.quantity}</b></span>
                  <span>{currency.format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            {nextStatus && (
              <button className="seller-order-action" disabled={updatingOrder === order._id} onClick={() => onAdvance(order, nextStatus)} type="button">
                {updatingOrder === order._id ? "Đang cập nhật…" : nextStatus === "shipped" ? "Xác nhận gửi hàng" : "Xác nhận đã giao"}
                <ArrowDownRight size={16} />
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function EmptyState({ title, detail, action }) {
  return (
    <div className="seller-empty-state">
      <div><Store size={22} /></div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && <button className="seller-primary-button" onClick={action} type="button"><Plus size={17} /> Thêm sản phẩm</button>}
    </div>
  );
}

export default SellerDashboard;
