export default function HomeLoadState({ loading, error, onRetry }) {
  if (loading) return <div className="home-loading" aria-busy="true" aria-label="Đang tải sản phẩm"><p className="sr-only" role="status">Đang tải sản phẩm…</p><div className="skeleton-heading" /><div className="skeleton-featured"><div /><div /></div>{[0, 1].map(row => <div className="skeleton-shelf" key={row}><div className="skeleton-heading" /><div className="skeleton-track">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-product" key={index}><div /><span /><span /><span /></div>)}</div></div>)}</div>;
  if (error) return <div className="home-load-errors">{["Nổi bật và gợi ý", "Sản phẩm trong cửa hàng"].map(title => <section className="home-load-error" key={title}><h2>{title}</h2><p role="alert">{error}</p><button type="button" className="secondary-button" onClick={onRetry}>Thử lại</button></section>)}</div>;
  return null;
}
