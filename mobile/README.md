# Net Store — bản Android để kiểm tra

App React Native + Expo SDK 57, viết và chạy lệnh bằng VS Code. App gọi chung Express API, MongoDB và danh mục chuẩn `shared/catalog-taxonomy.mjs` với website.

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

Đăng nhập tài khoản khách để mua hàng hoặc tài khoản seller để vào Net Seller: tổng quan, sản phẩm, đơn hàng và hồ sơ gian hàng. Seller có thể tạo/sửa/xóa sản phẩm, chọn ảnh từ điện thoại, cập nhật tồn kho và xác nhận gửi/đã giao. Quyền sở hữu được backend kiểm tra. Quản trị và đăng ký tài khoản vẫn dùng website; chưa thêm đánh giá, yêu thích hay thông báo đẩy.

Trong **Tài khoản → Địa chỉ và số điện thoại mặc định**, nhập thông tin rồi chọn **Lưu địa chỉ mặc định**. Thông tin được lưu bằng API `/auth/addresses` với token hiện tại, dùng chung với sổ địa chỉ trên web, và được đọc lại khi mở app/checkout. Checkout tự chọn địa chỉ có `isDefault` (hoặc địa chỉ đầu tiên nếu dữ liệu cũ chưa đánh dấu). Có thể sửa mặc định ngay tại checkout hoặc chọn **Giao đến địa chỉ khác** để nhập thông tin riêng cho một đơn; lựa chọn này không ghi đè mặc định. Số điện thoại nhận hàng đi theo địa chỉ đã chọn. Tỉnh/thành phố và quận/huyện được lưu riêng và gửi đủ vào đơn hàng.

Sau khi cập nhật mã phát triển, dùng **Reload** trong menu Expo Go một lần để tạo lại phiên JavaScript; Fast Refresh có thể giữ đối tượng store của bản mã cũ.

Trang chủ tối đa 6 nhóm, mỗi nhóm 6 sản phẩm. Danh sách tìm kiếm/danh mục 12 sản phẩm/trang; giỏ hàng, lịch sử, sản phẩm và đơn seller 10 mục/trang. Danh mục cha/con và bộ lọc thương hiệu/giới tính/hệ điều hành dùng cùng nguồn với web. Mọi sản phẩm vẫn truy cập được qua danh mục hoặc Xem tất cả.

Khách có thể chọn COD hoặc VNPay. Khi xác nhận đơn VNPay, app mở cổng thanh toán ngay; đây mới là đơn chờ, chưa hiển thị thành công. Sau khi quay lại app, màn hình kết quả đọc trạng thái API và kiểm tra lại trong khoảng 30 giây. Chỉ trạng thái `paid` từ backend mới hiện **Đặt hàng thành công**. Hủy/đóng trình duyệt có thể tiếp tục thanh toán cùng đơn trong lịch sử.

## Test VNPay trên Android

1. Khởi động lại backend sau khi cập nhật mã: `cd backend`, `npm run dev` (từ thư mục gốc).
2. `backend/.env`: giữ `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `PAYMENT_ENV=sandbox`, `PORT=3000`. Không đưa các khóa này vào mobile.
3. Trên Android Emulator, để trống `VNPAY_MOBILE_RETURN_URL` thì backend dùng `http://10.0.2.2:3000/api/vnpay/return`. Web tiếp tục dùng `VNPAY_RETURN_URL`/localhost riêng. Nếu có `VNPAY_IPN_URL`, mobile mặc định dùng cùng host public làm cầu nối return. Có thể ghi đè bằng `VNPAY_MOBILE_RETURN_URL`.
4. Trên điện thoại thật, đặt `mobile/.env` là `EXPO_PUBLIC_API_URL=http://<IP-LAN-MAY-TINH>:3000/api` và backend `VNPAY_MOBILE_RETURN_URL=http://<IP-LAN-MAY-TINH>:3000/api/vnpay/return` (cùng mạng), hoặc dùng backend HTTPS public. Khởi động lại backend và Metro. Production yêu cầu HTTPS.
5. Để VNPay xác nhận đơn qua IPN, chạy `cloudflared tunnel --url http://localhost:3000`, đặt `VNPAY_IPN_URL=https://<HOST-TUNNEL>/api/vnpay/ipn`, khởi động lại backend và cập nhật **IPN đã đăng ký phía VNPay sandbox**. Chỉ sửa `.env` không tự đăng ký URL với VNPay. Giữ tunnel hoạt động; Quick Tunnel đổi URL mỗi lần chạy lại.
6. Trong `mobile/`, chạy `npm run android` (nếu 8082 bị chiếm, `npm run android -- -Port 8083`). Tạo giao dịch mới từ app, tổng từ 10.000đ. URL giao dịch cũ vẫn mang callback cũ.
7. NCB sandbox: `9704198526191432198`, `NGUYEN VAN A`, `07/15`, OTP `123456`. Sau thanh toán trình duyệt gọi backend rồi chuyển về `payment-result` trong app; Expo Go dùng link `exp://…/--/payment-result`, bản build dùng `netstore://payment-result`.
8. Kiểm tra cả thành công, hủy, đóng trình duyệt và thanh toán lại. Nếu chưa nhận IPN, app giữ chờ xác nhận; không tự coi query `result=paid` là bằng chứng đã trả tiền. Seller chưa thể gửi đơn online chưa trả tiền.

Mã xử lý: `src/lib/payment.ts`, `src/app/payment-result.tsx`, backend `src/routes/payment.route.js`, `src/services/payment-gateways.js`. Return URL không chốt đơn; IPN có kiểm chữ ký/số tiền/lần giao dịch và xử lý lặp an toàn.

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
