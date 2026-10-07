import { useCallback, useEffect, useState } from "react";
import { Building2, Check, CreditCard, Edit3, Plus, Trash2, X } from "lucide-react";

const emptyForm = {
  bankName: "",
  branchName: "",
  accountNumber: "",
  accountHolder: "",
  identityNumber: "",
  isDefault: false,
};

function BankPanel({ email }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/bank-accounts?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải tài khoản ngân hàng.");
      setAccounts(data.bankAccounts || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, email]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (account) => {
    setForm({ ...emptyForm, bankName: account.bankName, branchName: account.branchName, accountHolder: account.accountHolder, isDefault: account.isDefault });
    setEditingId(account._id);
    setMessage("Vui lòng nhập lại số tài khoản và CCCD để xác nhận thay đổi.");
    setFormOpen(true);
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    setMessage("");
    const endpoint = editingId ? `${apiUrl}/auth/bank-accounts/${editingId}` : `${apiUrl}/auth/bank-accounts`;
    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu tài khoản ngân hàng.");
      setFormOpen(false);
      setForm(emptyForm);
      setMessage(editingId ? "Đã cập nhật tài khoản ngân hàng." : "Đã thêm tài khoản ngân hàng.");
      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const setDefault = async (id) => {
    try {
      const response = await fetch(`${apiUrl}/auth/bank-accounts/${id}/default`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể đặt tài khoản mặc định.");
      setMessage("Đã đặt tài khoản mặc định.");
      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeAccount = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản ngân hàng này?")) return;
    try {
      const response = await fetch(`${apiUrl}/auth/bank-accounts/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa tài khoản ngân hàng.");
      setMessage("Đã xóa tài khoản ngân hàng.");
      await loadAccounts();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return <>
    <div className="bank-heading"><div><p className="eyebrow">TÀI KHOẢN THANH TOÁN</p><h2>Thẻ tín dụng/Ghi nợ</h2><p className="profile-subtitle">Quản lý tài khoản ngân hàng liên kết với Net.</p></div><button className="bank-add-button" onClick={openCreate}><Plus size={17} /> Thêm tài khoản</button></div>
    <div className="profile-divider" />
    {message && <p className={message.startsWith("Đã") ? "profile-success" : "auth-error"}>{message}</p>}
    {loading ? <p className="muted">Đang tải tài khoản ngân hàng...</p> : accounts.length === 0 ? <div className="bank-empty"><Building2 size={38} /><h3>Chưa có tài khoản liên kết</h3><p>Thêm tài khoản ngân hàng để thuận tiện nhận hoàn tiền và thanh toán.</p><button className="profile-save" onClick={openCreate}><Plus size={16} /> Thêm tài khoản</button></div> : <div className="bank-list">{accounts.map((account) => <article className={account.isDefault ? "bank-card bank-card-default" : "bank-card"} key={account._id}><div className="bank-card-icon"><CreditCard size={23} /></div><div className="bank-card-content"><div className="bank-card-title"><h3>{account.bankName}</h3>{account.isDefault && <span><Check size={13} /> Mặc định</span>}</div><p>{account.branchName}</p><strong>{account.accountNumber}</strong><small>{account.accountHolder}</small></div><div className="bank-card-actions"><button onClick={() => openEdit(account)} aria-label="Sửa tài khoản"><Edit3 size={16} /></button><button onClick={() => removeAccount(account._id)} aria-label="Xóa tài khoản"><Trash2 size={16} /></button>{!account.isDefault && <button className="bank-default-action" onClick={() => setDefault(account._id)}>Đặt mặc định</button>}</div></article>)}</div>}
    {formOpen && <div className="bank-overlay" onClick={() => setFormOpen(false)}><div className="bank-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Đóng"><X /></button><div className="bank-modal-header"><button onClick={() => setFormOpen(false)}>←</button><h2>{editingId ? "Chỉnh sửa tài khoản" : "Thêm tài khoản ngân hàng"}</h2></div><form className="bank-form" onSubmit={submitAccount}><label>Tên ngân hàng<input required value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="Ví dụ: Vietcombank" /></label><label>Tên chi nhánh<input required value={form.branchName} onChange={(event) => setForm({ ...form, branchName: event.target.value })} placeholder="Nhập tên chi nhánh" /></label><label>Số tài khoản<input required inputMode="numeric" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value.replace(/\D/g, "") })} placeholder="Nhập số tài khoản" /></label><label>Tên đầy đủ (viết in hoa, không dấu)<input required value={form.accountHolder} onChange={(event) => setForm({ ...form, accountHolder: event.target.value.toUpperCase() })} placeholder="NGUYEN VAN AN" /></label><label>Số CCCD<input required inputMode="numeric" value={form.identityNumber} onChange={(event) => setForm({ ...form, identityNumber: event.target.value.replace(/\D/g, "") })} placeholder="Nhập số CCCD" /></label><label className="bank-checkbox"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Đặt làm mặc định</label>{message && !message.startsWith("Đã") && <p className="auth-error">{message}</p>}<div className="bank-form-actions"><button type="button" onClick={() => setFormOpen(false)}>Trở lại</button><button className="profile-save" type="submit">Hoàn thành</button></div></form></div></div>}
  </>;
}

export default BankPanel;
