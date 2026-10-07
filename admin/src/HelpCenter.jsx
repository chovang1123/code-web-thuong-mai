import { createElement, useMemo, useState } from "react";
import { ChevronDown, CircleHelp, CreditCard, Mail, Phone, RefreshCcw, Search, ShieldCheck, Store, Tag, Truck } from "lucide-react";

const categories = [
  { icon: Store, title: "Mua sắm cùng Net", color: "#ef6c4d" },
  { icon: Tag, title: "Khuyến mãi & Ưu đãi", color: "#ef6c4d" },
  { icon: CreditCard, title: "Thanh toán", color: "#ef6c4d" },
  { icon: Truck, title: "Đơn hàng & Vận chuyển", color: "#35a89b" },
  { icon: RefreshCcw, title: "Trả hàng & Hoàn tiền", color: "#ef6c4d" },
  { icon: ShieldCheck, title: "Thông tin chung", color: "#4d85c5" },
];

const faqs = [
  {
    question: "Mua sắm an toàn cùng Net",
    answer: "Hãy kiểm tra thông tin sản phẩm, đánh giá của người mua và chỉ thanh toán qua các phương thức được Net hỗ trợ.",
  },
  {
    question: "Tôi có thể theo dõi đơn hàng ở đâu?",
    answer: "Mở mục Đơn hàng trong tài khoản để xem trạng thái xử lý, vận chuyển và thời gian giao dự kiến.",
  },
  {
    question: "Tôi không thể đặt hàng hoặc đăng nhập tài khoản",
    answer: "Kiểm tra lại kết nối mạng và thông tin tài khoản. Nếu vấn đề vẫn còn, hãy gửi yêu cầu tới đội ngũ hỗ trợ Net.",
  },
  {
    question: "Tại sao tôi không thể thanh toán đơn hàng trên Net?",
    answer: "Bạn có thể thử lại sau ít phút hoặc chọn phương thức thanh toán khác. Đừng chia sẻ mã OTP cho bất kỳ ai.",
  },
  {
    question: "Làm sao để yêu cầu trả hàng hoặc hoàn tiền?",
    answer: "Vào chi tiết đơn hàng, chọn yêu cầu trả hàng/hoàn tiền và gửi lý do kèm hình ảnh nếu cần.",
  },
  {
    question: "Cách liên hệ Chăm sóc khách hàng Net",
    answer: "Bạn có thể gửi email hoặc gọi đến đội ngũ hỗ trợ ở phần Liên hệ Net bên dưới.",
  },
];

function HelpCenter() {
  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleFaqs = useMemo(() => faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedSearch)), [normalizedSearch]);

  return <div className="help-page">
    <header className="help-header">
      <a className="help-brand" href="/?support=1"><span className="brand-mark">N</span><span>NET STORE</span><i></i><strong>Trung tâm trợ giúp Net</strong></a>
      <a className="help-policy" href="#contact">Net Policies</a>
    </header>
    <section className="help-hero">
      <h1>Xin chào, Net có thể giúp gì cho bạn?</h1>
      <label className="help-search"><Search size={20}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập từ khóa hoặc nội dung cần tìm"/><button aria-label="Tìm kiếm"><Search size={20}/></button></label>
    </section>
    <main className="help-content">
      <div className="help-notice">Mẹo an toàn: Net sẽ không bao giờ yêu cầu bạn cung cấp mật khẩu hoặc mã OTP qua tin nhắn.</div>
      <section className="help-section">
        <h2>Danh mục</h2>
        <div className="help-categories">{categories.map(({ icon, title, color }) => <button key={title} onClick={() => setSearch(title)}><span style={{ color }}>{createElement(icon, { size: 19 })}</span><b>{title}</b></button>)}</div>
      </section>
      <section className="help-section help-faq-section">
        <div className="help-section-heading"><h2>Câu hỏi thường gặp</h2>{search && <button onClick={() => setSearch("")}>Xóa tìm kiếm</button>}</div>
        <div className="help-faqs">{visibleFaqs.length ? visibleFaqs.map((faq) => <button className="help-faq" key={faq.question} onClick={() => setExpandedFaq(expandedFaq === faq.question ? null : faq.question)}><span><CircleHelp size={17}/><b>{faq.question}</b></span><ChevronDown className={expandedFaq === faq.question ? "is-open" : ""} size={18}/>{expandedFaq === faq.question && <p>{faq.answer}</p>}</button>) : <p className="help-empty">Không tìm thấy câu hỏi phù hợp.</p>}</div>
      </section>
    </main>
    <section className="help-contact" id="contact"><h2>Liên hệ Net nếu bạn cần thêm hỗ trợ</h2><div><a href="mailto:support@net.store"><Mail size={21}/><span>Gửi yêu cầu hỗ trợ</span></a><a href="tel:+8418000000"><Phone size={21}/><span>Hướng dẫn liên hệ Net</span></a></div></section>
    <footer className="help-footer"><span>Net Policy</span><span>Service Requirement</span><span>Privacy Policy</span><small>© 2026 Net. Tất cả các quyền được bảo lưu.</small></footer>
  </div>;
}

export default HelpCenter;
