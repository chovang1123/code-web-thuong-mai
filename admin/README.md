# Giao diện Net Store

React 19 + Vite, CSS thuần và Tailwind 4. Không thêm thư viện cho lần nâng cấp UI này.

## Chạy và kiểm tra

Từ thư mục gốc repo:

```powershell
npm run dev --prefix admin
npm run lint --prefix admin
npm run build --prefix admin
npm test --prefix admin
```

Test checkout chạy trên bản build và dùng jsdom đã có trong mobile/node_modules; cần cài dependencies của mobile khi chạy trên một checkout mới. Test logic dùng node:test có sẵn trong Node.js.

Xem thử bản build bằng dữ liệu mẫu cách ly, không gọi API thật hoặc tạo đơn:

```powershell
npm run test:ui --prefix admin
```

Mở http://127.0.0.1:4174/review để chuyển viewport 1280 / 768 / 390px. Thoát bằng Ctrl+C.

## Cấu trúc giao diện

- src/styles/tokens.css: màu, font, bo góc dùng chung.
- src/styles/storefront.css: bố cục cửa hàng, drawer và checkout responsive.
- src/components/StoreHeader.jsx: header hai tầng sticky.
- src/components/StoreCatalog.jsx, ProductFilters.jsx, ProductCard.jsx: lọc tức thời và thẻ dùng chung.
- src/components/CartDrawer.jsx: drawer và trang xem giỏ hàng.
- src/components/VoucherInput.jsx: nhập mã và chip voucher dùng chung.
- src/lib/productFilters.js, recommendations.js: logic thuần để kiểm thử độc lập.
- src/lib/cartPricing.js, storeConfig.js: tổng tiền, voucher và cấu hình vận chuyển.

## Ảnh đã đối chiếu

Các URL demo sau được thay bằng placeholder ghi đúng tên sản phẩm. Ảnh thay thế do người bán tải lên vẫn được giữ nguyên; ảnh tải lỗi cũng có fallback.

| Sản phẩm | Mapping cũ cần thay |
| --- | --- |
| Sổ kế hoạch 2026 | photo-1499951360447-b19be8fe80f5: bàn máy tính/laptop |
| Bộ chăm sóc da Daily | photo-1556228578-8c89e6adf883: ảnh không khớp theo đối chiếu người dùng |
| Bộ chăm sóc tóc Silk | photo-1522337360788-8b13dee7a37e: dịch vụ làm tóc |
| Túi mỹ phẩm Travel | photo-1596462502278-27bfdc403348: mỹ phẩm thay cho túi |
| Khay đựng bút Desk | photo-1517842645767-c639042777db: sổ ghi chép |

Danh sách và điều kiện thay ảnh nằm tại src/lib/productImages.js. Các ảnh API khác giữ nguyên vì frontend không thể xác định nội dung ảnh do shop tải lên chỉ từ URL.

## Quy tắc giữ nguyên backend

- Không sửa API, database, đăng nhập, callback VNPay hoặc whitelist kênh thanh toán.
- Backend hiện không thu phí vận chuyển: baseFee = 0. Ngưỡng miễn phí cấu hình sẵn 600.000đ; không bật phí khác 0 trước khi backend có cùng quy tắc.
- NET10, WELCOME50 và FREESHIP dùng đúng quy tắc hiện tại: lần lượt giảm 10%, 50.000đ và 30.000đ khi chọn VNPay. COD không áp voucher vì backend chưa hỗ trợ.
- Giữ COD, ATM nội địa và thẻ quốc tế qua VNPay. Không khôi phục QR đã bị gỡ trước đó.
- Ghi chú shop chỉ là bản nháp localStorage theo tài khoản; không được gửi cho shop vì API chưa có trường lưu.
- Không dựng doanh số, điểm đánh giá hoặc giá gốc giả cho dữ liệu API. Bộ lọc bán chạy/giảm giá dùng metadata có sẵn; khi thiếu, không tạo ưu đãi giả.
- Gợi ý tối đa 5 sản phẩm. Có lịch sử: cùng danh mục, giá trong ±30%, loại món đang xem. Không có sản phẩm phù hợp: fallback bán chạy. Mua kèm loại tất cả món đã có trong giỏ.
