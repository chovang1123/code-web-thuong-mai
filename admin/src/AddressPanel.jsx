import { useCallback, useEffect, useState } from "react";
import { Check, Edit3, Home, MapPin, Plus, Trash2, X } from "lucide-react";

const emptyForm = {
  label: "Nhà riêng",
  fullName: "",
  phoneNumber: "",
  city: "",
  state: "",
  streetAddress: "",
  zipCode: "",
  isDefault: false,
};

const provinces = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Thừa Thiên Huế"];

function AddressPanel({ email }) {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/addresses?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải danh sách địa chỉ.");
      setAddresses(data.addresses || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, email]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (address) => {
    setForm({ label: address.label, fullName: address.fullName, phoneNumber: address.phoneNumber, city: address.city, state: address.state, streetAddress: address.streetAddress, zipCode: address.zipCode || "", isDefault: address.isDefault });
    setEditingId(address._id);
    setMessage("");
    setFormOpen(true);
  };

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submitAddress = async (event) => {
    event.preventDefault();
    setMessage("");
    const endpoint = editingId ? `${apiUrl}/auth/addresses/${editingId}` : `${apiUrl}/auth/addresses`;
    try {
      const response = await fetch(endpoint, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu địa chỉ.");
      setFormOpen(false);
      setForm(emptyForm);
      setMessage(editingId ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới.");
      await loadAddresses();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const setDefault = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/auth/addresses/${id}/default`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể đặt địa chỉ mặc định.");
      setMessage("Đã đặt địa chỉ mặc định.");
      await loadAddresses();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeAddress = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
    try {
      const response = await fetch(`${apiUrl}/auth/addresses/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa địa chỉ.");
      setMessage("Đã xóa địa chỉ.");
      await loadAddresses();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return <>
    <div className="bank-heading"><div><p className="eyebrow">ĐỊA CHỈ NHẬN HÀNG</p><h2>Địa chỉ của tôi</h2><p className="profile-subtitle">Quản lý địa chỉ giao hàng để đặt hàng nhanh hơn.</p></div><button className="bank-add-button" onClick={openCreate}><Plus size={17} /> Thêm địa chỉ</button></div>
    <div className="profile-divider" />
    {message && <p className={message.startsWith("Đã") ? "profile-success" : "auth-error"}>{message}</p>}
    {loading ? <p className="muted">Đang tải danh sách địa chỉ...</p> : addresses.length === 0 ? <div className="bank-empty"><MapPin size={38} /><h3>Chưa có địa chỉ nhận hàng</h3><p>Thêm địa chỉ để Net giao hàng đúng nơi bạn muốn.</p><button className="profile-save" onClick={openCreate}><Plus size={16} /> Thêm địa chỉ</button></div> : <div className="address-list">{addresses.map((address) => <article className={address.isDefault ? "address-card address-card-default" : "address-card"} key={address._id}><div className="address-card-icon"><Home size={22} /></div><div className="address-card-content"><div className="address-card-title"><h3>{address.fullName}</h3><span>{address.label}</span>{address.isDefault && <b><Check size={13} /> Mặc định</b>}</div><p>{address.phoneNumber}</p><p>{address.streetAddress}, {address.state}{address.city ? `, ${address.city}` : ""}{address.zipCode ? ` - ${address.zipCode}` : ""}</p></div><div className="address-card-actions"><button onClick={() => openEdit(address)} aria-label="Sửa địa chỉ"><Edit3 size={16} /></button><button onClick={() => removeAddress(address._id)} aria-label="Xóa địa chỉ"><Trash2 size={16} /></button>{!address.isDefault && <button className="address-default-action" onClick={() => setDefault(address._id)}>Đặt mặc định</button>}</div></article>)}</div>}
    {formOpen && <div className="bank-overlay" onClick={() => setFormOpen(false)}><div className="bank-modal address-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Đóng"><X /></button><div className="bank-modal-header"><button onClick={() => setFormOpen(false)}>←</button><h2>{editingId ? "Chỉnh sửa địa chỉ" : "Địa chỉ mới"}</h2></div><form className="address-form" onSubmit={submitAddress}><div className="address-form-row"><label>Họ và tên<input required value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Nhập họ và tên" /></label><label>Số điện thoại<input required type="tel" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} placeholder="Nhập số điện thoại" /></label></div><div className="address-form-row"><label>Tỉnh/Thành phố<select required value={form.state} onChange={(event) => updateField("state", event.target.value)}><option value="">Chọn tỉnh/thành phố</option>{provinces.map((province) => <option key={province}>{province}</option>)}</select></label><label>Quận/Huyện<input required value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Nhập quận/huyện" /></label></div><label>Địa chỉ cụ thể<textarea required rows="3" value={form.streetAddress} onChange={(event) => updateField("streetAddress", event.target.value)} placeholder="Số nhà, tên đường, phường/xã" /></label><div className="address-form-row"><label>Mã bưu chính<input value={form.zipCode} onChange={(event) => updateField("zipCode", event.target.value.replace(/\D/g, ""))} placeholder="Không bắt buộc" /></label><div><span className="address-label">Loại địa chỉ</span><div className="address-type-options"><button type="button" className={form.label === "Nhà riêng" ? "selected" : ""} onClick={() => updateField("label", "Nhà riêng")}>Nhà riêng</button><button type="button" className={form.label === "Văn phòng" ? "selected" : ""} onClick={() => updateField("label", "Văn phòng")}>Văn phòng</button></div></div></div><label className="bank-checkbox"><input type="checkbox" checked={form.isDefault} onChange={(event) => updateField("isDefault", event.target.checked)} /> Đặt làm địa chỉ mặc định</label>{message && !message.startsWith("Đã") && <p className="auth-error">{message}</p>}<div className="bank-form-actions"><button type="button" onClick={() => setFormOpen(false)}>Trở lại</button><button className="profile-save" type="submit">Hoàn thành</button></div></form></div></div>}
  </>;
}

export default AddressPanel;
