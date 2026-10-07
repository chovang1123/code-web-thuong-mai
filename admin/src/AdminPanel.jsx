import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, LogOut, PackagePlus, RefreshCw, Trash2, X } from "lucide-react";
import { withSellerDetails } from "./lib/marketplace";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category: "Nhà cửa",
  brand: "",
  sellerName: "",
  sellerLocation: "",
  image: "",
};

export default function AdminPanel({ adminName, email, fallbackProducts, onLogout }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "x-user-email": email }),
    [email],
  );

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchProducts = async () => {
        const response = await fetch(`${apiUrl}/web-admin/products`, { headers });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải sản phẩm.");
        }
        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu sản phẩm từ máy chủ không hợp lệ.");
        }
        return data;
      };

      let data = await fetchProducts();
      if (data.length === 0) {
        const seedResponse = await fetch(`${apiUrl}/web-admin/products/seed`, {
          method: "POST",
          headers,
          body: JSON.stringify(fallbackProducts),
        });
        const seedResult = await seedResponse.json();
        if (!seedResponse.ok) {
          throw new Error(seedResult.message || "Không thể khởi tạo sản phẩm mẫu.");
        }
        data = await fetchProducts();
      }

      setProducts(data.map(withSellerDetails));
      setLoadMessage(data.length === 0 ? "Kho hàng hiện chưa có sản phẩm." : "");
      return true;
    } catch (error) {
      console.error("Unable to load admin products:", error);
      setProducts([]);
      setLoadMessage(error.message || "Không thể tải danh sách sản phẩm.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, fallbackProducts, headers]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const saveProduct = async (event) => {
    event.preventDefault();
    const wasEditing = Boolean(editingId);
    const response = await fetch(`${apiUrl}/web-admin/products${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", headers, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message || "Không thể lưu sản phẩm."); return; }
    setForm(emptyForm); setEditingId(null);
    const loaded = await loadProducts();
    if (loaded) setMessage(wasEditing ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm.");
  };
  const editProduct = (product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      brand: product.brand || "",
      sellerName: product.sellerName || "",
      sellerLocation: product.sellerLocation || "",
      image: product.images?.[0] || "",
    });
    setEditingId(product._id);
  };
  const deleteProduct = async (id) => { if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return; await fetch(`${apiUrl}/web-admin/products/${id}`, { method: "DELETE", headers }); loadProducts(); };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="brand"><span className="brand-mark">N</span><span>NET STORE</span></div>
        <div className="admin-account"><span>Xin chào, {adminName}</span><button onClick={onLogout}><LogOut size={16} /> Đăng xuất</button></div>
      </header>
      <main className="admin-content">
        <div className="admin-title">
          <div><p className="eyebrow">QUẢN TRỊ CỬA HÀNG</p><h1>Quản lý sản phẩm</h1><p>Thêm, chỉnh sửa và xóa sản phẩm đang hiển thị trên cửa hàng.</p></div>
          <span className="admin-count">{products.length} sản phẩm</span>
        </div>
        <div className="admin-grid">
          <form className="admin-form" onSubmit={saveProduct}>
            <div className="admin-form-head">
              <h2>{editingId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}><X size={17} /></button>}
            </div>
            <label>Tên sản phẩm<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Mô tả<textarea required rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="admin-two">
              <label>Giá bán<input required type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
              <label>Tồn kho<input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
            </div>
            <label>Danh mục<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Thời trang</option><option>Phụ kiện</option><option>Nhà cửa</option><option>Công nghệ</option><option>Làm đẹp</option><option>Văn phòng phẩm</option></select></label>
            <label>Thương hiệu<input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Ví dụ: Net Select" /></label>
            <label>Tên shop / người bán<input required value={form.sellerName} onChange={(event) => setForm({ ...form, sellerName: event.target.value })} placeholder="Ví dụ: Nhà Mây Handmade" /></label>
            <label>Khu vực shop<input value={form.sellerLocation} onChange={(event) => setForm({ ...form, sellerLocation: event.target.value })} placeholder="Ví dụ: Thành phố Hồ Chí Minh" /></label>
            <label>URL hình ảnh<input required value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://..." /></label>
            {message && <p className="admin-message" role="status">{message}</p>}
            <button className="admin-submit" type="submit">{editingId ? <><Edit3 size={17} /> Lưu thay đổi</> : <><PackagePlus size={17} /> Thêm sản phẩm</>}</button>
          </form>
          <section className="admin-products">
            <div className="admin-list-head"><h2>Sản phẩm hiện có</h2><span>Dữ liệu từ MongoDB</span><button type="button" className="admin-refresh" onClick={loadProducts} disabled={isLoading}><RefreshCw size={14} /> {isLoading ? "Đang tải..." : "Tải lại"}</button></div>
            {loadMessage && <p className="admin-load-error" role="status">{loadMessage}</p>}
            <div className="admin-product-list">
              {!isLoading && products.length === 0 && !message && <p className="admin-empty">Chưa có sản phẩm nào trong cửa hàng.</p>}
              {products.map((product) => (
                <article className="admin-product" key={product._id}>
                  <img src={product.images?.[0]} alt="" />
                  <div><strong>{product.name}</strong><small>{product.category} · {Number(product.price).toLocaleString("vi-VN")}đ · Kho {product.stock}</small><small>Shop: {product.sellerName || "Net Market"} · {product.brand || "Net Select"}</small></div>
                  <button onClick={() => editProduct(product)} aria-label="Sửa"><Edit3 size={16} /></button>
                  <button className="delete-product" onClick={() => deleteProduct(product._id)} aria-label="Xóa"><Trash2 size={16} /></button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
