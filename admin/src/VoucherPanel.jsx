import { useMemo, useState } from "react";
import { Check, Gift, Ticket, Tag } from "lucide-react";

const vouchers = [
  { code: "WELCOME50", title: "Giảm 50.000đ", description: "Cho đơn hàng đầu tiên từ 300.000đ", expiry: "Hạn dùng: 31/12/2026", tone: "voucher-peach" },
  { code: "NET10", title: "Giảm 10%", description: "Giảm tối đa 100.000đ cho mọi đơn hàng", expiry: "Hạn dùng: 31/12/2026", tone: "voucher-green" },
  { code: "FREESHIP", title: "Miễn phí vận chuyển", description: "Giảm tối đa 30.000đ phí vận chuyển", expiry: "Hạn dùng: 31/12/2026", tone: "voucher-blue" },
];

function VoucherPanel({ email }) {
  const storageKey = `net_store_vouchers_${email}`;
  const [savedCodes, setSavedCodes] = useState(() => JSON.parse(localStorage.getItem(storageKey) || "[]"));
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const saved = useMemo(() => vouchers.filter((voucher) => savedCodes.includes(voucher.code)), [savedCodes]);
  const visibleVouchers = activeTab === "saved" ? saved : vouchers;

  const saveVoucher = (voucherCode) => {
    if (savedCodes.includes(voucherCode)) {
      setMessage("Voucher này đã có trong kho của bạn.");
      return;
    }
    const nextCodes = [...savedCodes, voucherCode];
    setSavedCodes(nextCodes);
    localStorage.setItem(storageKey, JSON.stringify(nextCodes));
    setMessage(`Đã lưu voucher ${voucherCode} vào kho.`);
  };

  const submitCode = (event) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    const voucher = vouchers.find((item) => item.code === normalizedCode);
    if (!voucher) {
      setMessage("Mã voucher không tồn tại hoặc đã hết hạn.");
      return;
    }
    saveVoucher(normalizedCode);
    setCode("");
  };

  return <><div className="voucher-heading"><div><p className="eyebrow">ƯU ĐÃI DÀNH CHO BẠN</p><h2>Kho Voucher</h2><p className="profile-subtitle">Lưu voucher và sử dụng khi thanh toán đơn hàng.</p></div><div className="voucher-count"><Gift size={17} /> {savedCodes.length} voucher đã lưu</div></div><div className="profile-divider" /><form className="voucher-code-form" onSubmit={submitCode}><label>Mã Voucher<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Nhập mã voucher tại đây" /></label><button type="submit">Lưu</button></form>{message && <p className={message.startsWith("Đã") ? "profile-success" : "auth-error"}>{message}</p>}<div className="voucher-tabs"><button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>Tất cả ({vouchers.length})</button><button className={activeTab === "saved" ? "active" : ""} onClick={() => setActiveTab("saved")}>Đã lưu ({savedCodes.length})</button></div><div className="voucher-grid">{visibleVouchers.map((voucher) => <article className={`voucher-card ${voucher.tone}`} key={voucher.code}><div className="voucher-icon"><Ticket size={26} /></div><div className="voucher-copy"><h3>{voucher.title}</h3><p>{voucher.description}</p><small>{voucher.expiry}</small><strong><Tag size={13} /> {voucher.code}</strong></div><button onClick={() => saveVoucher(voucher.code)}>{savedCodes.includes(voucher.code) ? <><Check size={14} /> Đã lưu</> : "Lưu ngay"}</button></article>)}</div></>;
}

export default VoucherPanel;
