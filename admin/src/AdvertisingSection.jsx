import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const campaigns = [
  { title: "Cuối tháng\ndọn kho", detail: "Ưu đãi đến 3 triệu đồng", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1500&q=85", tone: "advertising-blue" },
  { title: "Sắm đồ mới\ncho ngày thường.", detail: "Ưu đãi đến 500.000đ", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1500&q=85", tone: "advertising-warm" },
  { title: "Làm mới\ngóc sống.", detail: "Giảm đến 30%", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1500&q=85", tone: "advertising-green" },
];

const sideCampaigns = [
  { title: "Phụ kiện mới\ncho nhịp sống", detail: "Ưu đãi hôm nay", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85" },
  { title: "Đồ dùng tử tế\ncho góc nhà", detail: "Giảm đến 20%", image: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=900&q=85" },
];

function AdvertisingSection({ onShopClick }) {
  const [activeCampaign, setActiveCampaign] = useState(0);
  const campaign = campaigns[activeCampaign];

  useEffect(() => {
    const timer = window.setInterval(() => setActiveCampaign((current) => (current + 1) % campaigns.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const moveCampaign = (direction) => setActiveCampaign((current) => (current + direction + campaigns.length) % campaigns.length);

  return <section className="advertising-section advertising-hero" aria-label="Quảng cáo và ưu đãi">
    <div className="advertising-grid">
      <button className={`advertising-main ${campaign.tone}`} onClick={onShopClick}>
        <img src={campaign.image} alt="" />
        <div className="advertising-main-overlay"><p>NET SALE / ƯU ĐÃI ĐẶC BIỆT</p><h1>{campaign.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><strong>{campaign.detail}</strong><span className="advertising-cta">Mua sắm ngay <ArrowRight size={15} /></span></div>
        <span className="advertising-arrow advertising-arrow-left" onClick={(event) => { event.stopPropagation(); moveCampaign(-1); }}><ArrowLeft size={18} /></span><span className="advertising-arrow advertising-arrow-right" onClick={(event) => { event.stopPropagation(); moveCampaign(1); }}><ArrowRight size={18} /></span>
        <span className="advertising-dots">{campaigns.map((item, index) => <i className={index === activeCampaign ? "active" : ""} key={item.title} />)}</span>
      </button>
      <div className="advertising-side">{sideCampaigns.map((item) => <button key={item.title} onClick={onShopClick}><img src={item.image} alt="" /><span><small>{item.detail}</small><b>{item.title.split("\n").map((line) => <span key={line}>{line}</span>)}</b><em>Xem ngay <ArrowRight size={13} /></em></span></button>)}</div>
    </div>
  </section>;
}

export default AdvertisingSection;
