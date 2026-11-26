<h1 align="center">✨ Website thương mại điện tử + API ✨</h1>

![Ảnh minh họa ứng dụng](/admin/public/screenshot-for-readme.png)

✨ **Các tính năng nổi bật:**

- 🛍️ Website thương mại điện tử với trang sản phẩm, giỏ hàng, đặt hàng và tài khoản khách hàng
- 🔐 Xác thực an toàn bằng Clerk (đăng nhập Google và Apple)
- 🛒 Luồng giỏ hàng, yêu thích, đặt hàng và quản lý đơn hàng
- 📦 Đặt hàng không qua thanh toán trực tuyến (phù hợp với đồ án thương mại điện tử)
- 🗺️ Hệ thống quản lý địa chỉ
- 🏪 Trang quản trị — sản phẩm, đơn hàng, khách hàng và thống kê
- 🧑‍💼 Khu vực người bán — thông tin cửa hàng, tồn kho sản phẩm, xử lý đơn hàng và doanh thu
- ⚙️ REST API đầy đủ (Node.js + Express) với xác thực và phân quyền
- 🛂 Các tuyến truy cập được bảo vệ, chỉ dành cho quản trị viên
- 📦 Tác vụ nền với Inngest
- 🧭 Trang tổng quan với số liệu phân tích được cập nhật trực tiếp
- 🛠️ Quản lý sản phẩm (thêm, xem, sửa, xóa; xử lý ảnh; định giá và các chức năng khác)
- 🏷️ Thông tin thương hiệu và người bán/cửa hàng trên từng sản phẩm, kèm trang riêng của cửa hàng
- 📦 Quản lý đơn hàng
- 👥 Trang quản lý khách hàng
- 🛡️ Tích hợp Sentry để giám sát và theo dõi lỗi
- 🚀 Triển khai trên Sevalla (API và trang quản trị)
- 🖼️ Trình chiếu ảnh sản phẩm
- ⚡ Tải và lưu đệm dữ liệu bằng TanStack Query
- 🧰 Quy trình Git và GitHub đầy đủ (nhánh, commit, yêu cầu hợp nhất và đánh giá mã nguồn)
- 🤖 Phân tích yêu cầu hợp nhất bằng CodeRabbit (bảo mật, chất lượng và tối ưu hóa)

---

## 🧪 Thiết lập `.env`

### 🟦 Máy chủ API (`/backend`)

```bash
NODE_ENV=development
PORT=3000

DB_URL=<YOUR_DB_URL>
# Tùy chọn: dùng khi truy vấn SRV của Atlas gặp lỗi querySrv ECONNREFUSED.
MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8
WEB_AUTH_SECRET=<LONG_RANDOM_SECRET>

CLERK_PUBLISHABLE_KEY=<YOUR_CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=<YOUR_CLERK_SECRET_KEY>

INNGEST_SIGNING_KEY=<YOUR_INNGEST_SIGNING_KEY>

CLOUDINARY_URL=cloudinary://YOUR_API_KEY:YOUR_API_SECRET@YOUR_CLOUD_NAME
# Tùy chọn, chỉ đặt khi đã có upload preset:
CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_UPLOAD_UNSIGNED=false

ADMIN_EMAIL=<YOUR_ADMIN_EMAIL>

CLIENT_URL=http://localhost:5173

```

---

### 🟩 Giao diện website (`/admin`)

```bash
VITE_CLERK_PUBLISHABLE_KEY=<YOUR_CLERK_PUBLISHABLE_KEY>
VITE_API_URL=http://localhost:3000/api

VITE_SENTRY_DSN=<YOUR_SENTRY_DSN>
```

---

## 🔧 Chạy máy chủ API

```bash

cd backend
npm install
npm run dev
```

Khi khởi động, máy chủ tạo các bộ sưu tập MongoDB còn thiếu cho người dùng, sản phẩm, giỏ hàng, đơn hàng, đánh giá sản phẩm và đánh giá website. Giỏ hàng của từng khách mua hàng được lưu vào MongoDB và lưu đệm trong trình duyệt. Đặt `WEB_AUTH_SECRET` thành một chuỗi ngẫu nhiên dài để ký mã xác thực đồng bộ giỏ hàng; nếu không đặt, máy chủ sử dụng khóa bí mật Clerk hoặc địa chỉ kết nối cơ sở dữ liệu đã cấu hình. Sau khi triển khai thay đổi này, hãy đăng nhập lại một lần để nhận mã xác thực đồng bộ giỏ hàng. Đơn hàng chỉ được lưu vào MongoDB sau khi xác nhận đặt hàng.

---

Nếu kết nối Atlas gặp lỗi `querySrv ECONNREFUSED`, đặt `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` trong `backend/.env` rồi khởi động lại máy chủ. Thiết lập này thay DNS cho tiến trình Node.js trước khi kết nối bằng `mongodb+srv://`; bỏ thiết lập để dùng DNS của hệ thống. MongoDB Compass là phần mềm kết nối và quản lý cơ sở dữ liệu: giá trị `DB_URL` cần là URI kết nối MongoDB, thay vì khóa API. Nếu kết nối đến MongoDB được cài trực tiếp trên máy, sử dụng URI như `mongodb://127.0.0.1:27017/thuongmaidientu`.

## 🔧 Chạy website

```bash
cd admin
npm install
npm run dev
```

Website chạy tại `http://localhost:5173`. Thương hiệu sản phẩm và tên người bán/cửa hàng có thể được thiết lập trong biểu mẫu sản phẩm của trang quản trị; khách mua hàng có thể mở thẻ người bán trên sản phẩm để xem các sản phẩm của cửa hàng đó.

Ảnh sản phẩm của người bán được tải qua `POST /api/seller/uploads` với Bearer token và multipart field `image`. Backend dùng multer memoryStorage, nhận một ảnh JPG/JPEG/PNG/WebP tối đa 5 MB, rồi tải buffer lên Cloudinary bằng upload_stream trong folder `products`. API trả `{ "url": "<secure_url>", "publicId": "<public_id>" }`; biểu mẫu gửi kết quả này trong trường `image` khi lưu sản phẩm. Khi chỉnh sửa mà không chọn ảnh mới, ảnh hiện tại được giữ nguyên. `CLOUDINARY_URL` và preset chỉ đặt ở backend; không dùng biến `VITE_` hoặc đưa secret xuống frontend. Cấu hình URL không thay đổi quyền tải ảnh của khóa Cloudinary.

Nếu sử dụng preset đã được cấu hình Unsigned trong Cloudinary, đặt tên vào `CLOUDINARY_UPLOAD_PRESET` và đặt `CLOUDINARY_UPLOAD_UNSIGNED=true`. Backend vẫn xác thực người bán và kiểm tra tệp trước khi gửi ảnh, nhưng Cloudinary xác thực thao tác bằng preset thay vì chữ ký API key. Nên giới hạn định dạng và dung lượng ngay trong preset vì ai biết tên preset có thể gọi trực tiếp API unsigned của Cloudinary. Không bật chế độ này khi chưa có preset tương ứng; không tự động chuyển chế độ sau lỗi quyền.

## Kiểm thử VNPay sandbox trên máy tính

Return URL do trình duyệt mở sau thanh toán. IPN do máy chủ VNPay gọi để xác nhận và cập nhật đơn hàng. Return chỉ xác minh và hiển thị, không ghi trạng thái thanh toán vào DB. Hai địa chỉ được cấu hình riêng; `PAYMENT_PUBLIC_URL` cũ không còn được dùng.

1. Đặt cấu hình trong `backend/.env` (xem thêm `backend/.env.example`):

   ```dotenv
   PORT=3000
   PAYMENT_ENV=sandbox
   VNP_TMN_CODE=MA_MERCHANT_CUA_BAN
   VNP_HASH_SECRET=SECRET_CUA_BAN
   CLIENT_URL=http://localhost:5173
   VNPAY_RETURN_URL=
   VNPAY_IPN_URL=
   ```

   Để trống `VNPAY_RETURN_URL` ở dev thì URL thanh toán dùng `http://localhost:<PORT>/api/vnpay/return`, theo cổng backend thực sự nhận yêu cầu tạo giao dịch. Có thể ghi rõ URL đầy đủ vào biến này nếu cần; khi thay PORT nhớ cập nhật override nếu đã đặt. Production bắt buộc đặt Return URL HTTPS. Không đưa mã merchant hoặc hash secret vào frontend, log, hay commit `.env`.

2. Chạy backend và frontend ở hai terminal riêng, từ thư mục gốc dự án:

   ```powershell
   npm run dev --prefix backend
   ```

   ```powershell
   npm run dev --prefix admin
   ```

3. Mở terminal thứ ba và chạy tunnel cho IPN (thay 3000 nếu đã đổi PORT):

   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

   Giữ terminal này chạy. Sao chép URL HTTPS mới mà cloudflared in ra và đặt `VNPAY_IPN_URL=https://<HOST-TUNNEL-MOI>/api/vnpay/ipn` trong `backend/.env`. Khởi động lại backend sau khi sửa `.env`. Mỗi lần tạo Quick Tunnel mới phải cập nhật lại biến này **và địa chỉ IPN đã đăng ký trên hệ thống VNPay sandbox** (hoặc gửi VNPay cập nhật theo tài khoản tích hợp). Chỉ sửa `.env` không tự thay cấu hình phía VNPay. Return URL vẫn để localhost, không thay theo tunnel.

   Tích hợp PAY 2.1.0 hiện tại đăng ký IPN riêng với VNPay; không thêm tham số `vnp_IpnUrl` tùy ý vào URL thanh toán. Backend đọc/kiểm tra `VNPAY_IPN_URL` như cấu hình IPN public; endpoint nhận là `GET /api/vnpay/ipn`. Xem [tài liệu PAY chính thức](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

4. Đăng nhập khách mua hàng, đặt đơn với VNPay và tổng tiền sau giảm giá từ **10.000 VND** trở lên. Có thể dùng **171.000 VND** để đối chiếu `vnp_Amount=17100000`. Sandbox được chặn dưới 10.000 VND trong cả checkout và API; COD không bị hạn mức này. Mỗi lần tạo URL thanh toán có `vnp_TxnRef` mới, nên phải dùng URL vừa tạo; link cũ vẫn giữ Return URL cũ.

5. Chọn NCB trong nhóm thẻ ATM/tài khoản ngân hàng nội địa và dùng dữ liệu thử:

   | Thông tin | Giá trị |
   | --- | --- |
   | Ngân hàng | NCB |
   | Số thẻ | `9704198526191432198` |
   | Chủ thẻ | `NGUYEN VAN A` |
   | Ngày phát hành | `07/15` |
   | OTP | `123456` |

   Đây là [thẻ thử do VNPay công bố](https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/). Không dùng thẻ thật trên môi trường sandbox.

6. Sau thanh toán, trình duyệt phải về localhost rồi tới `/payment-result` của frontend. Chỉ khi chữ ký hợp lệ, số tiền khớp và IPN có cả `vnp_ResponseCode=00`, `vnp_TransactionStatus=00` thì DB được chốt `paid`. Return thành công nhưng chưa nhận IPN sẽ hiển thị đang xử lý; kiểm tra tunnel và cấu hình IPN phía VNPay. Đóng trình duyệt trước khi return vẫn nhận được cập nhật qua IPN. Hủy thanh toán (24) hiển thị đã hủy; callback lặp không ghi trạng thái/thời điểm trả tiền lần hai. Không sửa đơn thành paid chỉ dựa vào query trên trình duyệt.

Để kiểm tra tự động, chạy `npm test --prefix backend` (cần `mongod`, có thể đặt `MONGOD_BIN` trỏ tới mongod.exe); `npm run lint --prefix admin`, `npm run build --prefix admin` rồi `npm test --prefix admin`. Các kiểm thử thanh toán dùng replica set MongoDB tạm, không ghi database ứng dụng thật.

Để tạo tài khoản người bán, chọn **Người bán** trong biểu mẫu đăng ký rồi nhập tên và địa chỉ cửa hàng. Tài khoản được lưu trong bộ sưu tập `users` của MongoDB với vai trò `seller`; sau đó người bán có thể quản lý sản phẩm, tồn kho, thông tin cửa hàng, đơn hàng và doanh thu của mình từ trang tổng quan dành cho người bán.

---

## 📱 Chạy ứng dụng Android (`/mobile`)

Ứng dụng được xây dựng bằng React Native và Expo, sử dụng chung máy chủ API, tài khoản, sản phẩm, giỏ hàng và đơn hàng với website. Có thể viết mã và chạy lệnh trong VS Code trên Windows, sử dụng giả lập Android mà không cần cài Android Studio.

Các lệnh dưới đây bắt đầu từ thư mục gốc của dự án. Mỗi phần yêu cầu terminal riêng cần được mở tại thư mục gốc trước khi chạy lệnh `cd`.

### 1. Chuẩn bị môi trường

- Cài Node.js, npm và mở thư mục dự án trong VS Code.
- Bật ảo hóa (Virtualization/Intel VT-x/AMD SVM) trong BIOS.
- Bật **Windows Hypervisor Platform** trong **Turn Windows features on or off**. Nếu Windows yêu cầu, hãy khởi động lại máy.
- Chuẩn bị kết nối Internet và dung lượng đĩa để tải SDK cùng ảnh hệ điều hành Android trong lần thiết lập đầu tiên.

### 2. Cài thư viện và thiết lập giả lập lần đầu

Mở terminal trong VS Code và chạy:

```powershell
cd mobile
npm ci
npm run android:setup
```

Lệnh `android:setup` tải bộ công cụ Android CLI chính thức của Google, cài SDK và tạo máy ảo `medium_phone`. SDK và dữ liệu máy ảo dùng cho dự án nằm trong `mobile/.tools/`; thư mục này được bỏ qua trong Git nên cần thiết lập lại khi tải dự án sang máy khác.

Nếu máy đã thiết lập xong, các lần chạy sau có thể bỏ qua bước này.

### 3. Chạy máy chủ API ở terminal riêng

Tạo file `backend/.env` theo phần cấu hình ở trên nếu chưa có. Mở một terminal mới tại thư mục gốc rồi chạy:

```powershell
cd backend
npm install
npm run dev
```

Giữ terminal này chạy. Máy chủ dùng cổng **3000** theo cấu hình mẫu và phải kết nối MongoDB thành công trước khi app tải được dữ liệu. Có thể kiểm tra máy chủ tại `http://localhost:3000/api/health` trên trình duyệt máy tính.

Nếu Atlas từ chối kết nối, kiểm tra cluster đang hoạt động và IP public hiện tại của máy chạy máy chủ đã được thêm vào **IP Access List** của Atlas.

### 4. Mở app trên giả lập Android

Mở một terminal mới khác tại thư mục gốc:

```powershell
cd mobile
npm run android
```

Lệnh này mở giả lập nếu cần, chờ Android sẵn sàng rồi mở Net Store bằng Expo Go. Cửa sổ giả lập được đặt trong màn hình với tỷ lệ 30% để nhìn đủ điện thoại. Kéo thanh tiêu đề **Android Emulator** để di chuyển cửa sổ; kéo bên trong màn hình điện thoại để vuốt nội dung app.

Metro, công cụ phục vụ mã giao diện của app, chạy ở cổng **8082**; máy chủ API vẫn dùng chung cổng **3000** với website. Giữ terminal đầu tiên chạy Metro mở trong khi dùng app. Muốn dừng Metro, nhấn **Ctrl+C** trong terminal đó.

Nếu Expo Go hiện trang **Home**, chọn **Net Store** trong **Recent history**. Trong lần đầu, nếu xuất hiện phần giới thiệu công cụ phát triển, nhấn **Continue** rồi đóng menu bằng nút quay lại để vào app.

Có thể chạy lại `npm run android`: nếu Metro của dự án đang chạy ở cổng 8082, lệnh sẽ dùng lại máy chủ đó. Dòng `Reusing Net Store Metro on port 8082` là thông báo bình thường; terminal có thể trở về dấu nhắc sau khi mở app. Nếu cổng đang thuộc về chương trình khác, dùng cổng Metro khác:

```powershell
npm run android -- -Port 8083
```

### 5. Địa chỉ API và đăng nhập

App mặc định gọi `http://10.0.2.2:3000/api`. Trong giả lập Android, `10.0.2.2` trỏ đến máy tính đang chạy máy chủ API. Cấu hình này dùng được khi backend của website chạy trên cùng máy ở cổng 3000.

Nếu cần thay đổi địa chỉ hoặc cổng API, tạo file `.env` trong thư mục `mobile` từ mẫu (chạy lệnh sau khi đang ở thư mục `mobile`):

```powershell
Copy-Item .env.example .env
```

Sau đó sửa giá trị trong `mobile/.env` theo máy chủ đang dùng và tải lại app:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

Đăng nhập tài khoản **khách mua hàng** để mua sắm hoặc **người bán** để mở Net Seller (tổng quan, quản lý sản phẩm/ảnh từ máy, đơn và hồ sơ shop). Danh mục dùng chung với web, trang chủ giới hạn từng nhóm, danh sách sản phẩm 12/trang và danh sách seller 10/trang. Quản trị vẫn dùng website.

VNPay trên app mở ngay khi xác nhận đặt hàng, quay về màn hình kết quả trong app và chỉ báo thành công sau khi API xác nhận đã trả tiền. Callback mobile dùng `VNPAY_MOBILE_RETURN_URL`, mặc định dev Android Emulator là `http://10.0.2.2:<PORT>/api/vnpay/return`; web có callback riêng. IPN vẫn cần URL public được đăng ký với VNPay. Xem các bước cấu hình và test trong [README mobile](./mobile/README.md#test-vnpay-trên-android).

Để kiểm tra liên thông: đặt một đơn trên Android, xem đơn trên website, cập nhật trạng thái trên website rồi kéo tải lại danh sách đơn trong app.

Xem hướng dẫn chi tiết tại [README của ứng dụng Android](./mobile/README.md) và kết quả kiểm thử tại [tài liệu kiểm thử](./mobile/TESTING.md).
