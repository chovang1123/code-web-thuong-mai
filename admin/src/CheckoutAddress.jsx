import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const blank = { fullName: "", phoneNumber: "", state: "", city: "", streetAddress: "", zipCode: "" };

function AddressFields({ value, onChange, disabled }) {
  const field = (name) => (event) => onChange({ ...value, [name]: event.target.value });
  return <div className="checkout-fields">
    <label>Họ và tên<input required autoComplete="name" value={value.fullName} disabled={disabled} onChange={field("fullName")} /></label>
    <label>Số điện thoại<input required type="tel" autoComplete="tel" value={value.phoneNumber} disabled={disabled} onChange={field("phoneNumber")} /></label>
    <label>Tỉnh/Thành phố<input required value={value.state} disabled={disabled} onChange={field("state")} /></label>
    <label>Quận/Huyện<input required value={value.city} disabled={disabled} onChange={field("city")} /></label>
    <label className="checkout-street">Địa chỉ cụ thể<textarea required autoComplete="street-address" rows="2" value={value.streetAddress} disabled={disabled} onChange={field("streetAddress")} /></label>
  </div>;
}

export default function CheckoutAddress({ authToken, onChange, disabled }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState("saved");
  const [editing, setEditing] = useState(false);
  const [fixed, setFixed] = useState(blank);
  const [temporary, setTemporary] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const fields = useRef(null);
  const api = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const selected = addresses.find(address => address._id === selectedId);

  useEffect(() => {
    const controller = new AbortController();
    fetch(api + "/auth/addresses", { headers: { Authorization: "Bearer " + authToken }, signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thể tải địa chỉ đã lưu.");
        if (controller.signal.aborted) return;
        const list = data.addresses || [];
        const preferred = list.find(address => address.isDefault) || list[0];
        setAddresses(list);
        setSelectedId(preferred?._id || "");
        setFixed(preferred ? { ...blank, ...preferred } : blank);
        setEditing(!preferred);
        setError("");
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, authToken, reload]);

  useEffect(() => {
    onChange(!loading && !saving ? mode === "temporary" ? temporary : !editing ? selected || null : null : null);
  }, [onChange, loading, saving, mode, temporary, editing, selected]);

  async function save() {
    if (saving || disabled) return;
    const inputs = [...fields.current.querySelectorAll("input, textarea")];
    if (!inputs.every(input => input.reportValidity())) return;
    if (inputs.some(input => !input.value.trim())) {
      setError("Vui lòng nhập đầy đủ thông tin địa chỉ.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(api + "/auth/addresses" + (selected ? "/" + selected._id : ""), {
        method: selected ? "PUT" : "POST",
        headers: { Authorization: "Bearer " + authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ ...fixed, label: fixed.label || "Nhà riêng", isDefault: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu địa chỉ.");
      setAddresses(current => [...current.filter(item => item._id !== data.address._id).map(item => ({ ...item, isDefault: false })), data.address]);
      setSelectedId(data.address._id);
      setFixed(data.address);
      setEditing(false);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }

  return <section className="checkout-card checkout-address">
    <div className="checkout-card-title"><h2><MapPin size={19} /> Địa chỉ nhận hàng</h2></div>
    <div className="checkout-address-modes">
      <label><input type="radio" name="addressMode" checked={mode === "saved"} disabled={disabled || saving} onChange={() => setMode("saved")} /> Địa chỉ cố định</label>
      <label><input type="radio" name="addressMode" checked={mode === "temporary"} disabled={disabled || saving} onChange={() => setMode("temporary")} /> Giao đến địa chỉ khác</label>
    </div>
    {loading ? <p>Đang tải địa chỉ...</p> : mode === "temporary" ? <>
      <p className="checkout-address-help">Dùng cho đơn này khi bạn ở văn phòng, đi du lịch hoặc không ở nhà.</p>
      <AddressFields value={temporary} onChange={setTemporary} disabled={disabled} />
    </> : editing ? <div ref={fields}>
      <p className="checkout-address-help">Lưu địa chỉ mặc định để những lần đặt sau được điền sẵn.</p>
      <AddressFields value={fixed} onChange={setFixed} disabled={disabled || saving} />
      <div className="checkout-address-actions">
        <button type="button" disabled={disabled || saving} onClick={save}>{saving ? "Đang lưu..." : "Lưu địa chỉ mặc định"}</button>
        {selected && <button type="button" disabled={disabled || saving} onClick={() => setEditing(false)}>Hủy sửa</button>}
      </div>
    </div> : selected ? <div className="checkout-saved-address">
      {addresses.length > 1 && <label>Địa chỉ đã lưu<select aria-label="Địa chỉ đã lưu" value={selectedId} disabled={disabled} onChange={event => setSelectedId(event.target.value)}>
        {addresses.map(address => <option key={address._id} value={address._id}>{address.label} · {address.streetAddress}{address.isDefault ? " (Mặc định)" : ""}</option>)}
      </select></label>}
      <strong>{selected.fullName} · {selected.phoneNumber}</strong>
      <p>{selected.streetAddress}, {selected.city}, {selected.state}</p>
      <button type="button" disabled={disabled} onClick={() => { setFixed({ ...blank, ...selected }); setEditing(true); }}>Sửa địa chỉ cố định</button>
    </div> : <p>Bạn chưa có địa chỉ cố định. <button type="button" onClick={() => setEditing(true)}>Thêm địa chỉ</button></p>}
    {error && <div role="alert" className="auth-error">{error} <button type="button" disabled={disabled || saving} onClick={() => { setLoading(true); setReload(value => value + 1); }}>Tải lại</button></div>}
  </section>;
}
