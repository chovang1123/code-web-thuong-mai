# Net Store — bản Android để kiểm tra

App React Native + Expo SDK 57, viết và chạy lệnh bằng VS Code. App gọi chung Express API và MongoDB với website. Thay đổi mã nguồn của phần việc này chỉ nằm trong `mobile/`.

## Kế hoạch và phạm vi bản đầu

| Bước | Công việc | Điều kiện kiểm tra |
| --- | --- | --- |
| 1 | Đối chiếu route, payload và cơ chế token của backend | Dùng tài khoản email/mật khẩu của web, đúng nhóm API `/web` |
| 2 | Sản phẩm, tìm kiếm, chi tiết | Lấy dữ liệu API, có tải lại và thông báo lỗi |
| 3 | Đăng nhập, giữ phiên, đăng xuất | Token lưu SecureStore; không lưu mật khẩu; xử lý 401 |
| 4 | Giỏ hàng | Thêm, tăng/giảm, xóa; lưu server; chặn thao tác trùng |
| 5 | Đặt hàng | Kiểm tra địa chỉ; server tính tiền và kiểm tra tồn kho |
| 6 | Lịch sử và chi tiết đơn | Xem cùng đơn với web, kéo để cập nhật trạng thái |
| 7 | Làm → kiểm thử → sửa → kiểm thử lại | Kiểm tra logic, màn hình, TypeScript, lint và Android bundle |

Để giữ bản đầu gọn, đăng ký tài khoản thực hiện trên website. App dành cho khách mua hàng; người bán và quản trị dùng website. Chưa thêm quản lý địa chỉ đã lưu, đánh giá, yêu thích, thanh toán trực tuyến, thông báo đẩy hay chức năng người bán trên Android.

## Chạy từ VS Code trên Windows

### 1. Cài thư viện app

```powershell
cd D:\code-web-thuong-mai\mobile
npm ci
```

### 2. Chuẩn bị giả lập, không cài Android Studio

```powershell
npm run android:setup
```

Script tải Android CLI chính thức của Google, SDK và tạo `medium_phone`. Các thư mục SDK/AVD của dự án nằm trong `mobile/.tools/`, đã bỏ qua trong Git. Không thay đổi PATH hệ thống. Lần đầu cần Internet và dung lượng đĩa cho ảnh Android.

Máy cần bật Virtualization trong BIOS và Windows Hypervisor Platform (WHPX). Nếu thay đổi Windows Features yêu cầu khởi động lại, thực hiện khởi động lại trước khi chạy app.

### 3. Chạy backend có sẵn

Mở terminal riêng:

```powershell
cd D:\code-web-thuong-mai\backend
npm run dev
```

Backend dùng file `backend/.env` hiện có. Cổng backend đã kiểm tra là **3000**. Chỉ tiếp tục kiểm thử dữ liệu thật khi backend báo kết nối MongoDB và lắng nghe thành công.

### 4. Mở app Android

```powershell
cd D:\code-web-thuong-mai\mobile
npm run android
```

Lệnh này cấu hình SDK cho tiến trình hiện tại, khởi động giả lập nếu cần, chờ Android sẵn sàng, chạy Metro tại cổng **8082**, rồi mở app bằng Expo Go qua ADB reverse/localhost. Cổng 8082 phục vụ mã giao diện; API vẫn dùng chung backend web tại cổng 3000. Để terminal đầu tiên chạy Metro mở trong khi dùng app; dừng Metro bằng **Ctrl+C** trong terminal đó.

Bạn có thể chạy lại `npm run android`: nếu Metro của chính dự án đang chạy ở cổng 8082, script dùng lại server và mở app, không khởi động server thứ hai. Dòng `Reusing Net Store Metro on port 8082` là kết quả bình thường; lệnh có thể trả về dấu nhắc terminal sau khi mở app. Nếu cổng thuộc chương trình/dự án khác, script báo rõ và có thể chọn cổng khác bằng `npm run android -- -Port 8083`.

Mỗi lần mở máy ảo mới, script đặt cửa sổ tại vị trí trong màn hình với tỷ lệ 30% để nhìn đủ điện thoại. Kéo thanh tiêu đề **Android Emulator** để di chuyển cửa sổ; kéo trong phần màn hình điện thoại là thao tác vuốt nội dung Android.

Giả lập được chạy với đồ họa phần mềm và không tải snapshot cũ để tránh lỗi OpenGL đã gặp trên máy kiểm tra. Nếu Expo Go dừng ở trang Home, chọn **Net Store** trong **Recent history**. Lần đầu có thể hiện phần giới thiệu/menu phát triển: nhấn **Continue**, rồi đóng menu bằng nút quay lại để vào app.

Ứng dụng mặc định gọi `http://10.0.2.2:3000/api`. Trong Android Emulator, `10.0.2.2` trỏ tới máy tính đang chạy backend.

Nếu backend đổi cổng hoặc chuyển sang máy chủ khác:

```powershell
Copy-Item .env.example .env
```

Sửa `EXPO_PUBLIC_API_URL` trong `.env`, rồi tải lại app. Không đưa thông tin kết nối MongoDB, khóa ký token hay khóa bí mật vào app.

## API đang sử dụng

| Chức năng | API | Dữ liệu |
| --- | --- | --- |
| Danh sách | `GET /api/products` | Mảng sản phẩm |
| Chi tiết | `GET /api/products/:id` | Một sản phẩm |
| Đăng nhập | `POST /api/auth/login` | `{ email, password }` → `{ user, token }` |
| Lấy giỏ | `GET /api/cart/web` | `{ cart: { items } }` |
| Lưu giỏ | `PUT /api/cart/web` | `{ items: [{ productId, quantity }] }` |
| Đặt hàng | `POST /api/orders/web` | `{ shippingAddress }` → `{ order }` |
| Lịch sử | `GET /api/orders/web` | `{ orders }` |

Giỏ hàng và đơn hàng gửi `Authorization: Bearer <token>`. Không dùng các route yêu cầu token Clerk. Tìm kiếm thực hiện trên danh sách sản phẩm đã tải, phù hợp phạm vi bản đầu.

Mỗi lần thay đổi giỏ, app đọc lại giỏ server trước khi gửi PUT để tránh ghi đè bằng dữ liệu cũ đã tải trên app. API hiện tại thay toàn bộ giỏ, nên thao tác đồng thời trên web và app vẫn có thể xung đột; bản đầu chưa hỗ trợ cập nhật thời gian thực hoặc khóa phiên bản ở backend.

Nếu mất kết nối trong lúc đặt hàng, app không tự gửi lại POST và yêu cầu kiểm tra danh sách đơn trước khi đặt lại, vì máy chủ có thể đã tạo đơn. Sản phẩm đã bị xóa khỏi giỏ server cần xử lý trên website trong bản này.

## Kịch bản để bạn kiểm tra

1. Trên web, tạo hoặc chọn sản phẩm còn hàng và tài khoản **khách mua hàng**.
2. Mở Android, tải danh sách, tìm kiếm và mở chi tiết sản phẩm.
3. Đăng nhập bằng tài khoản đó; thêm sản phẩm vào giỏ.
4. Tăng/giảm số lượng, xóa rồi thêm lại; tải lại giỏ trên web để đối chiếu.
5. Nhập họ tên, điện thoại, địa chỉ, tỉnh/thành và xác nhận đặt hàng.
6. Kiểm tra thông báo thành công, mã đơn, giỏ được xóa và đơn xuất hiện trên website.
7. Cập nhật trạng thái trên web; kéo tải lại danh sách đơn trên Android để đối chiếu.
8. Đăng xuất: màn hình giỏ/đơn không còn hiển thị dữ liệu tài khoản cũ.
9. Tắt backend: app hiện lỗi kết nối, không tự thêm dữ liệu hoặc báo đặt đơn thành công.

## Kiểm thử tự động

```powershell
npm run typecheck
npm run lint
npm test
npm run export:android
npx expo install --check
```

Các test dùng phản hồi API và kho phiên giả lập, không tạo đơn hay thay đổi tồn kho MongoDB thật. Test màn hình render component React Native và thao tác biểu mẫu/nút; không thay thế kiểm thử trên máy Android.

Kết quả và giới hạn kiểm thử thực tế được ghi trong [TESTING.md](./TESTING.md). `export:android` kiểm tra đóng gói JavaScript/Hermes; đầu ra `dist/` không phải APK.

Tham khảo: [Android CLI](https://developer.android.com/tools/agents/android-cli), [Android Emulator/WHPX](https://developer.android.com/studio/run/emulator-acceleration), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/).
