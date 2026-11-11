# Kết quả kiểm thử — 11/11/2026

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
