# Kết quả kiểm thử — 26/11/2026

## UI, seller và VNPay Android

- TypeScript, lint và Android bundle/Hermes đạt sau thay đổi. Jest có 40 ca trong 5 bộ: API, phiên/role, màn hình checkout/kết quả/địa chỉ, danh mục/phân trang và seller.
- Địa chỉ mặc định: test lưu từ Tài khoản, khởi tạo store mới rồi mở checkout vẫn đọc đúng số điện thoại/địa chỉ; mặc định trên web được dùng; địa chỉ tạm không ghi đè; lưu lỗi giữ biểu mẫu và retry PUT đúng địa chỉ; response của phiên đã đăng xuất bị loại. API dùng Bearer, không tìm tài khoản qua email. Chỉ test bằng phản hồi API giả lập, không lưu địa chỉ thử vào tài khoản thật.
- Android thực tế: reload Expo Go để bỏ đối tượng store cũ do Fast Refresh giữ lại, sau đó xác minh địa chỉ và số điện thoại có sẵn hiển thị nhất quán ở Tài khoản và checkout. Thao tác này chỉ đọc, không sửa địa chỉ hay tạo đơn thật.
- Backend có 36 ca đạt, gồm DB replica set tạm: URL mobile/dev/production, ràng buộc deep link, chữ ký sai, amount sai, hủy, return về app, IPN cập nhật và callback lặp. Không tạo đơn hay sửa tồn kho trên database thật để test.
- Kiểm tra trực tiếp Expo Go SDK57 trên Android 16: trang chủ tải 1.023 sản phẩm thật thành các nhóm hữu hạn; chọn Công nghệ hiển thị cha/con và danh sách 12/trang. Nội dung vừa màn hình, cùng màu cam/ngọc và nền trung tính của web. Metro đang kiểm tra ở cổng 8083 vì 8082 đã bị chiếm.
- Seller được kiểm tra bằng component/API fixtures: phân trang 10, tìm kiếm reset trang, sửa giữ ảnh cũ, chọn file mới upload qua backend rồi gửi tham chiếu ảnh, chặn gửi đơn VNPay chưa trả tiền. Chưa đăng nhập seller thật hoặc tạo sản phẩm thật trong đợt này.
- Checkout test chứng minh VNPay mở ngay sau khi tạo đơn chờ; query `result=paid` không thể tạo thông báo thành công khi API còn unpaid. API paid mới hiển thị thành công. Return metadata được ràng buộc với đúng order và tài khoản.
- **Chưa xác minh thanh toán NCB trọn luồng trên Android.** Cấu hình local `VNPAY_IPN_URL` còn trống; cần tunnel public/đăng ký IPN với VNPay rồi thực hiện các bước trong README. Bản build với scheme `netstore` và điện thoại thật còn cần kiểm tra riêng; screenshot UI không chứng minh kết nối callback ngân hàng.

## Kết quả lịch sử — 11/11/2026

## Đã kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript (`npm run typecheck`) | Đạt |
| Lint (`npm run lint`) | Đạt |
| Jest (`npm test`) | 25/25 ca đạt, 3 bộ test |
| Android bundle/Hermes (`npm run export:android`) | Đạt, xuất vào `dist/` |
| Phiên bản SDK (`npx expo install --check`) | Đạt |
| Cú pháp script PowerShell | Đạt |
| Khớp `package.json` và lockfile | Đạt |
| WHPX trên máy Windows | Có sẵn và sử dụng được |
| Android SDK/Emulator riêng, không cài Android Studio | Đã cài và khởi động Android 16/API 36 |
| Mở app bằng Expo Go SDK 57 trên giả lập | Đạt |
| Màn hình sản phẩm khi backend ngắt kết nối | Hiển thị thông báo và nút Thử lại đúng |
| Tab giỏ hàng khi chưa đăng nhập | Hiển thị yêu cầu đăng nhập đúng |
| Biểu mẫu đăng nhập trống trên Android | Hiển thị lỗi kiểm tra dữ liệu đúng |
| Chạy lại bằng `npm run android` | Đạt, mở Expo Go qua `exp://127.0.0.1:8082`; khi về Home, chọn Net Store trong Recent history |
| Chạy lặp khi cổng 8082 đã có Metro của dự án | Hai lần liên tiếp đạt, exit code 0; dùng lại server, không còn EADDRINUSE |
| Cửa sổ giả lập ngoài mép màn hình | Đặt lại vị trí/tỷ lệ 30%; kiểm tra được toàn bộ cửa sổ và kéo thanh tiêu đề |

## Phạm vi của 25 ca tự động

- Tải/tìm sản phẩm, mở chi tiết; báo lỗi kết nối và thử lại.
- Sai mật khẩu, đăng nhập đúng, lưu/khôi phục/xóa phiên; giới hạn tài khoản khách mua hàng.
- Hết hạn token: xóa dữ liệu riêng tư kể cả khi bộ lưu phiên lỗi.
- Đọc lại giỏ server trước khi cập nhật; thêm, tăng/giảm, xóa.
- Lỗi tồn kho và mất kết nối không làm mất giỏ đã xác nhận.
- Kiểm tra địa chỉ, ngăn đặt giỏ rỗng, gửi đúng payload backend.
- Chặn thao tác ghi giỏ/đặt đơn trùng khi đang xử lý.
- Mất kết nối khi POST: không tự đặt lại; màn hình chuyển hướng kiểm tra đơn.
- Đặt thành công, xóa giỏ, hiển thị đơn và địa chỉ trong lịch sử.
- Người chưa đăng nhập không thấy giỏ riêng tư.
- Header Bearer, chuẩn hóa email, giữ nguyên mật khẩu, xử lý JSON lỗi và timeout.

Các ca trên dùng React Native Testing Library, API client thật của app và phản hồi máy chủ giả lập. Chúng không kết nối MongoDB và không tạo giao dịch thật. Bản app chạy bình thường luôn gọi API đã cấu hình; không có chế độ dữ liệu mẫu.

## Vòng làm → kiểm thử → sửa

1. Dựng màn hình và nối các route hiện có.
2. Phát hiện npm tự chọn phiên bản peer dependency khác SDK; ghim lại React DOM, Reanimated và Worklets theo SDK 57.
3. Chạy TypeScript/lint/test; sửa khai báo kiểu Jest, thư mục cache và cách xử lý ảnh lỗi.
4. Bổ sung kiểm thử thao tác màn hình và tình huống đặt đơn mất kết nối.
5. Chạy lại: 25 test, TypeScript, lint và đóng gói Android đều qua.
6. Chạy giả lập: sửa đường dẫn AVD do Android CLI tạo ở thư mục mặc định, chờ trình quản lý gói sẵn sàng và dùng đồ họa phần mềm để tránh ADB offline/OpenGL treo.
7. Mở Expo Go bằng localhost/ADB reverse, kiểm tra giao diện thực tế và biểu mẫu đăng nhập trên Android. Ảnh kiểm tra cục bộ nằm trong `.tools/qa/` (bỏ qua trong Git).

## Kiểm tra dữ liệu thật còn chờ

Backend hiện có không khởi động thành công do lỗi kết nối MongoDB Atlas trong môi trường này. Chưa xác minh luồng đặt đơn thật, trừ tồn kho hay đồng bộ đơn trên website. Không sửa cấu hình backend/Atlas và không dùng thông tin tài khoản thật để kiểm thử.

Khi backend hoạt động, thực hiện 9 bước kiểm tra thủ công trong README để hoàn tất xác minh liên thông web–Android.

## Phụ thuộc

`npm audit` còn báo lỗi ở chuỗi phụ thuộc `expo-router@57` → `query-string` → `decode-uri-component`. Bản sửa tự động npm đề xuất yêu cầu Expo Router 58; chưa nâng SDK hoặc ép phiên bản thư viện con trong bản kiểm tra này. Cần xử lý và kiểm thử lại phần này trước khi phát hành rộng rãi.
