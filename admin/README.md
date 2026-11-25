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

Xem thử trang chủ bằng dữ liệu API thật (cần backend đang chạy):

```powershell
npm run test:ui --prefix admin
```

Mở http://127.0.0.1:5173/test/home-review.html để kiểm tra trang chủ bằng dữ liệu thật từ GET /products. Trang kiểm tra không đăng nhập, không seed, không ghi API/DB và không tạo đơn; giỏ kiểm tra chỉ ở bộ nhớ. Dùng công cụ responsive của trình duyệt để chọn 1280 / 768 / 390px. Cổng 5173 khớp danh sách CORS hiện tại của backend. Thoát bằng Ctrl+C.

## Cấu trúc giao diện

- src/styles/tokens.css: màu, font, bo góc dùng chung.
- src/styles/storefront.css: giao diện dùng chung, drawer và checkout responsive.
- src/styles/homepage.css: header 64px, hero và các kệ cuộn ngang của trang chủ v2.
- src/components/StoreHeader.jsx: header một hàng 64px, menu danh mục và tìm kiếm mở rộng trên mobile.
- src/components/HomePage.jsx, CategoryChips.jsx, FilterDrawer.jsx: state lọc chung cho toàn bộ trang chủ; tái sử dụng ProductFilters.jsx.
- src/components/FeaturedHero.jsx: tối đa 5 sản phẩm API; tự chuyển 6 giây, dừng khi hover/focus hoặc giảm chuyển động.
- src/components/ProductShelf.jsx, ProductCard.jsx: kệ ngang tối đa 12 thẻ, scroll-snap, điều khiển bàn phím và nút cuộn.
- src/components/HomeLoadState.jsx: skeleton, lỗi/thử lại và kho rỗng.
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
- Gợi ý trên trang chủ tối đa 12 sản phẩm, lịch sử tối đa 10 món. Dùng cùng danh mục và giá ±30% theo catalog API mới nhất, loại toàn bộ món đã xem/trong giỏ, ưu tiên đánh giá và lượt bán thật. Ẩn kệ khi còn dưới 3 món hoặc chưa có lịch sử. Mua kèm tiếp tục loại các món đã có trong giỏ.

## Trang chủ v2 — dữ liệu thật

- Đã gỡ danh sách sản phẩm dự phòng, shop tự gán, quảng cáo mẫu và bản preview sinh dữ liệu giả. Gỡ lệnh tự POST /web-admin/products/seed khi kho rỗng; API backend vẫn giữ nguyên. Không seed hoặc sửa DB trong đợt UI này.
- Bán chạy tuần này chỉ xuất hiện với ít nhất 3 sản phẩm có salesLast7Days > 0. Không thay doanh số cả đời cho doanh số tuần.
- Đang giảm giá chỉ xuất hiện khi ít nhất 3 sản phẩm có originalPrice thật tạo mức giảm từ 15%. Không tự tính ra giá gốc để giả lập giảm giá.
- Khối nổi bật ưu tiên isPinned (nếu API có), mức giảm thật, điểm đánh giá và ngày tạo; nếu không có ưu đãi, dùng nhãn Khám phá hôm nay.
- Khi chip Tất cả được chọn, mỗi danh mục đủ 3 sản phẩm có một kệ riêng. Nếu lọc không còn kệ chuyên biệt, có kệ Lựa chọn theo danh mục từ dữ liệu phù hợp.
- Tìm kiếm vẫn hiển thị kết quả chính xác khi chỉ có 1–2 món; đây là ngoại lệ của ngưỡng 3 để không làm mất chức năng tìm kiếm.
- Mọi kệ tối đa 12 món. Thêm sản phẩm trong cùng danh mục không tạo thêm hàng dọc; dùng cuộn ngang.
- Kiểm tra API thật ngày 2026-11-25: 23 sản phẩm/6 danh mục; chưa có originalPrice/salesLast7Days/isPinned. Các kệ chưa đủ metadata được ẩn và sẽ cập nhật khi API trả dữ liệu được bổ sung sau.
- Các dữ liệu trong unit/DOM test chỉ ở bộ nhớ, không gọi DB hoặc seed.
