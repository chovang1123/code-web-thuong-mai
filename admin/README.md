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

Mở http://127.0.0.1:5173/test/home-review.html để kiểm tra trang chủ bằng dữ liệu thật từ GET /products. Trang kiểm tra không đăng nhập, không seed, không ghi API/DB và không tạo đơn; giỏ kiểm tra chỉ ở bộ nhớ. Dùng công cụ responsive của trình duyệt để chọn 1280 / 768 / 360px. Cổng 5173 khớp danh sách CORS hiện tại của backend. Thoát bằng Ctrl+C.

## Cấu trúc giao diện

- src/styles/tokens.css: màu, font, bo góc dùng chung.
- src/styles/storefront.css: giao diện dùng chung, drawer và checkout responsive.
- src/styles/homepage.css: header 64px, hero và các kệ cuộn ngang của trang chủ v2.
- src/components/StoreHeader.jsx: header một hàng 64px (60px trên mobile), menu danh mục và ô tìm kiếm luôn hiển thị.
- src/components/HomePage.jsx, CategoryChips.jsx, FilterDrawer.jsx: state lọc chung cho toàn bộ trang chủ; tái sử dụng ProductFilters.jsx.
- src/components/FeaturedHero.jsx: banner tĩnh cao 240px (224px trên mobile), hiển thị sản phẩm đầu tiên từ cùng bộ lựa chọn nổi bật của API; giữ hành động xem chi tiết và mua ngay.
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
- NET10, WELCOME50 và FREESHIP lần lượt giảm 10%, 50.000đ và 30.000đ cho cả COD lẫn VNPay. Mức giảm không vượt tiền hàng; API tính lại từ giá trong DB và kiểm tra tổng tiền client.
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
- Catalog hiện có 1.023 sản phẩm sau đợt seed được người dùng yêu cầu. UI chỉ đọc metadata API, bao gồm dữ liệu mẫu đã đánh dấu isDemo; đợt refactor giao diện không seed hoặc thay đổi DB.
- Các dữ liệu trong unit/DOM test chỉ ở bộ nhớ, không gọi DB hoặc seed.

## Unslop — 2026-11-25

Định hướng: sàn mua sắm rõ ràng, nhanh, gần gũi; ảnh và giá là điểm nhấn. Dùng quy trình [unslop của Damir Sokolovsky](https://github.com/heydamir/unslop), CC BY 4.0.

Audit trước khi sửa: hero xanh cao 380px và carousel/list bị lặp; font serif; chip lớn, nút lọc nét đứt; spacing/type nhiều cỡ; CSS hero/quảng cáo và dashboard Clerk cũ không được entry hiện tại dùng; palette người bán/trợ giúp khác storefront. Kế hoạch đã trình bày trước sửa: tokens → Header → danh mục → nổi bật → kệ/card → footer → màn hình phụ → dọn mã/QA.

- Một font Be Vietnam Pro (400/500/600, display=swap), cỡ 12/14/16/20/28; màu cam #c2410c và xám/trắng; tokens spacing/radius/shadow dùng chung.
- Header sticky 60/64px, search luôn có trên mobile. Chip một hàng, active cam nhạt; nút Bộ lọc gọn.
- Banner trắng tĩnh 224/240px, tên clamp hai dòng với line-height 1.5. Bỏ carousel 6 giây và danh sách phụ; không cần gộp sản phẩm trùng vì danh sách đó đã bỏ.
- Card ảnh vuông contain, tên hai dòng, giá/giảm giá nhỏ; hover nâng 2px, không zoom ảnh. Giữ thêm giỏ, xem sản phẩm và xem shop. Footer dùng StoreFooter chung.
- Ảnh khai báo width/height, decoding=async; ảnh hero eager/high, ảnh khác lazy. Kệ dùng content-visibility để giảm layout phần ngoài màn hình.
- Đồng bộ auth, profile, chi tiết, giỏ, checkout, thanh toán, trợ giúp, admin/seller qua cùng tokens. Bỏ emoji chào mừng, gradient, serif, viền nét đứt và màu xanh/tím trang trí.
- Xóa 13 module không reachable từ src/main.jsx (nhóm dashboard Clerk cũ và helper chỉ phục vụ nhóm đó); không đổi các nhánh điều hướng/route đang hoạt động. Loại 140 rule CSS không dùng ở lần dọn đầu, tiếp tục bỏ CSS story/recommendation cũ. Không gỡ thư viện khỏi package-lock trong đợt này.
- Giữ logic, request, quyền truy cập, API, dữ liệu, cart/checkout/VNPay. Thay đổi App chỉ ở phần trình bày/copy/footer.

Kiểm tra: lint/build sau từng phần; 48 test hồi quy đạt. Browser QA trang chủ ở 360/768/1280: không tràn ngang, header 60/64, banner 224/240, search/filter và sticky hoạt động. Checkout/cart/admin/seller kiểm tra cả ba kích thước, header 64px, không tràn trang/dialog. Đăng nhập/trợ giúp kiểm tra mobile và desktop. CSS build gzip cuối khoảng 18,4KB so với 22,6KB trước refactor.

Trang kiểm tra panel: /test/panels-review.html?view=checkout (hoặc cart/admin/seller), dùng trong Vite dev. Trang này chỉ GET catalog ban đầu; mọi request khác dùng fixture trong bộ nhớ, chặn POST/PUT/PATCH/DELETE. Không tạo đơn, tài khoản hoặc chỉnh DB. Không đưa fixture này vào luồng sản phẩm.

Không còn lựa chọn thiết kế bắt buộc cần xác nhận. Font hiện tải từ Google Fonts như cơ chế font trước đây; có thể tự host sau nếu dự án yêu cầu chạy không phụ thuộc dịch vụ font.

## Hệ màu theo vai trò — 2026-11-25

- Token nền/chữ: --bg-page #FAF6F0, --surface #FFFFFF, --surface-media #F4EFE8, --border #E8E1D6, --text #1F2937, --text-muted #6B7280.
- Token nhấn: --primary #C2410C + --primary-soft #FFEDD5 (CTA/chọn/giỏ); --accent #0F766E + --accent-soft #E6F4F1 (link/nút phụ/chip lọc/số sao); --sale #DC2626 + --sale-soft #FEE2E2 (giá bán/badge giảm giá). Tất cả màu giao diện tập trung tại src/styles/tokens.css, không giữ tên --color-* cũ.
- AA: --text-muted #6B7280 trên nền ấm chỉ đạt4,49:1, nên thêm --text-muted-on-warm #606874 và alias --muted-ink theo nền. Giá đỏ trên nền hero mềm không đủ4,5:1; cụm giá hero có nền trắng, đỏ/trắng đạt4,83:1. Token --overlay/--shadow-color giữ độ sâu trung tính hiện có.
- Hero nền primary-soft đặc, cột ảnh40%, khung ảnh232px tối đa, nhãn Ưu đãi hôm nay màu ngọc, tên clamp2, giá đỏ và CTAcam. Cao280px desktop/256px mobile. Không đổi nguồn dữ liệu, callback, điều kiện giảm giá hay hành động mua.
- 49 test (gồm tương phản và kiểm tra màu hard-code), lint/build đạt. Browser QA360/768/1280 không tràn ngang; hero có giá gốc/badge ở360 vẫn vừa khung; chip lọc ngọc, tabcam, badge đỏ/white đúng vai trò. Quét31 đoạn chữ đang hiển thị trên mobile không có cặp dưới4,5:1.

## Danh mục v2 — 2026-11-25

Theo yêu cầu tái cấu trúc đã được duyệt sau giai đoạn khảo sát. Giữ hướng Unslop hiện có: nền ấm, điều hướng yên, ảnh và giá làm điểm nhấn; không thêm hiệu ứng hoặc màu mới.

- Một nguồn chuẩn tại shared/catalog-taxonomy.mjs dùng chung web/API/migration/seed: 10 nhóm cấp đầu + 40 mục con, tối đa hai cấp. Trang điểm mắt và mặt dùng hai slug riêng để không va chạm sau khi bỏ dấu.
- Product giữ category dạng chuỗi cho client cũ, thêm categoryId/categorySlug, categories chỉ một phần tử; cross placement dùng tags. gender (nam/nu/unisex), brand, os (ios/android) chỉ suy ra khi có bằng chứng.
- Header dùng CategoryMenu: mega menu desktop, accordion mobile, có số sản phẩm. CategoryChips tối đa 8 nhóm + Xem thêm; chọn nhóm mở hàng mục con, chip đang chọn tự cuộn vào vùng nhìn thấy. Menu không lấy tag làm membership.
- CategoryBreadcrumb dùng chung trang danh mục/chi tiết. useCategoryLocation giữ URL /danh-muc/:slug, Back/Forward, title/description/canonical. API có redirect 301 từ slug cũ, sitemap chỉ chứa mục đang hiển thị; Vite dev hỗ trợ cùng redirect. Khi triển khai tách frontend/backend, chuyển tiếp /sitemap.xml và quy tắc 301 tới backend, hoặc dùng cấu hình tương đương. PUBLIC_SITE_URL chỉ định origin công khai.
- Trang chủ giữ kệ cuộn tối đa 12 sản phẩm. Trang danh mục và tìm kiếm hiển thị lưới, tải thêm từng 36 món để xem được hết kết quả. Bộ lọc hiện có giữ nguyên, thêm thuộc tính đúng danh mục; bộ chọn danh mục trong drawer gọn một trường thay cho danh sách dài.
- AdminPanel/SellerDashboard dùng ProductCategoryFields chung: bộ chọn danh mục chuẩn, tag và thuộc tính. API chuẩn hóa tên/slug, kiểm tra registry và lưu một categoryId.
- Migration đã chạy: 1.023 → 1.023 sản phẩm, 50 mục chuẩn, 25 mục cũ lưu trữ, không mục chuẩn rỗng. Backup BSON/EJSON và rollback có guard. Đối soát toàn bộ trường ngoài metadata giữ nguyên, không sản phẩm mồ côi, không cha chỉ có một con, chạy lại không đổi dữ liệu.
- Cần duyệt: 45 sản phẩm thiếu gender (19 túi/ba lô + 26 trang sức) và 20 sản phẩm cũ đang ở nhóm cha. Danh sách đủ, mapping cũ/mới và bảng trước/sau: docs/catalog-v2-review.txt và docs/catalog-v2-report.json. Hướng dẫn chạy/rollback: backend/src/seeds/README.md.

Các file chính: shared/catalog-taxonomy.mjs, shared/category-seo.mjs; backend/src/{models/category.model.js,models/product.model.js,utils/product-categories.js,services/catalog.js,routes/category.route.js,routes/category-pages.route.js,migrations/catalog-v2.js,migrations/verify-catalog-v2.js,seeds/*}; admin/src/{App.jsx,AdminPanel.jsx,pages/SellerDashboard.jsx,components/CategoryMenu.jsx,components/CategoryChips.jsx,components/CategoryBreadcrumb.jsx,components/ProductCategoryFields.jsx,components/ProductFilters.jsx,components/FilterDrawer.jsx,components/HomePage.jsx,components/ProductShelf.jsx,components/StoreHeader.jsx,lib/categories.js,lib/useCategoryLocation.js,lib/productFilters.js,lib/homeCatalog.js,lib/storeConfig.js}, admin/vite.config.js và stylesheet liên quan. Giỏ hàng/đơn hàng/tài khoản không đổi nghiệp vụ; mobile tiếp tục đọc category chuỗi.

Kiểm tra cuối: lint/build và 51 test web đạt; toàn bộ 10 test backend đạt (bao gồm checkout/VNPay và migrate → chạy lại → rollback trên replica set tạm). QA với catalog thật tại 360/768/1280px: không tràn ngang, header 60/64px, chip dài đang chọn hiện đủ chữ; đã mở đủ 10 nhóm cha, thử các mục con, lọc Apple+iOS và Unisex, menu mobile và Xem thêm. Kiểm tra HTTP đủ 29 slug thực sự đổi đích trả 301, toàn bộ 61 slug có mapping, HTML danh mục có title/meta/canonical, sitemap có 51 URL (trang chủ + 50 mục chuẩn). Danh sách file của đợt này ở phần trên; mọi thay đổi từ các đợt UI trước được giữ nguyên, không commit/push.

## Sửa voucher cho COD — 2026-11-25

- Nguyên nhân: checkout loại giảm giá khi chọn COD, request không gửi couponCode và API chỉ tính voucher trong nhánh VNPay. Nhánh COD không có transaction cũng bỏ qua mã.
- shared/coupons.mjs là nguồn định nghĩa và phép tính giảm dùng chung web/API. Giữ các mức giảm hiện tại, áp dụng độc lập phương thức thanh toán. Xóa nhãn chỉ dùng VNPay trong giỏ, checkout và chi tiết sản phẩm; VoucherInput ghi rõ COD và VNPay.
- backend/src/services/order-pricing.js tính từ tiền hàng trên DB, chuẩn hóa mã, từ chối mã không hợp lệ và tổng client không khớp. Dùng cho cả transaction và nhánh COD fallback; lỗi không để mất hàng hay làm rỗng giỏ. VNPay giữ hạn mức riêng; COD có thể có tổng 0 khi voucher phủ hết tiền hàng.
- Đơn mới lưu subtotal, couponCode, discountAmount cùng totalPrice sau giảm; không cập nhật lại đơn cũ. Chuyển đơn VNPay sang COD giữ nguyên giảm giá đã lưu.
- File chính: shared/coupons.mjs; backend/src/services/order-pricing.js, controllers/order.controller.js, models/order.model.js; admin/src/lib/cartPricing.js, lib/storeConfig.js, App.jsx, CheckoutPanel.jsx, components/VoucherInput.jsx, components/CartDrawer.jsx. Test: backend/test/order-pricing.test.js, backend/test/payments.test.js, admin/test/cart-pricing.test.js, admin/test/checkout-smoke.cjs.
- Kiểm tra: lint/build và 57 test web đạt; 13 test backend đạt trên replica set tạm. Bao gồm ba mã × COD/ATM/thẻ quốc tế, chuyển phương thức trước khi đặt, tổng lưu trong DB, COD fallback không transaction, mã sai/tổng sai không tạo đơn và hoàn kho, giảm không âm, chuyển đơn đã giảm từ VNPay sang COD. Không tạo đơn hay sửa dữ liệu trên database dự án.
