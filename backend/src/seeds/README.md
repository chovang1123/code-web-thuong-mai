# Dữ liệu mẫu Net Store

## Snapshot đúng 1.000 sản phẩm đã nạp

`demo-catalog.ejson` được xuất chỉ đọc từ MongoDB ngày 25/11/2026: đúng 1.000 sản phẩm `isDemo` thuộc batch `net-store-demo-v1` và 50 danh mục chuẩn. Giữ ID, tên, ảnh, giá, tồn kho tại thời điểm xuất, sao, lượt bán và ngày tạo. Không chứa 23 sản phẩm cũ, tài khoản, đơn hàng, mật khẩu hay cấu hình kết nối.

Sau khi pull lần 2, nếu dùng một database khác, cấu hình `backend/.env` của máy đích rồi chạy trong `backend/`:

```powershell
node --tls-max-v1.2 src/seeds/import-demo.js
node --tls-max-v1.2 src/seeds/import-demo.js --apply
```

Lệnh đầu chỉ kiểm tra file, không kết nối DB. `--apply` thêm những sản phẩm/danh mục chưa tồn tại và ánh xạ lại `categoryId` theo DB đích; không xóa hay ghi đè bản ghi có sẵn. Chạy lại sẽ không nhân bản 1.000 sản phẩm. Không cần nhập lại nếu tiếp tục dùng MongoDB hiện tại. Đơn hàng, tài khoản shop và liên kết sở hữu không nằm trong snapshot này.

`git push` chỉ đưa file snapshot/script lên GitHub, không tự chạy import hay chuyển collection. Có thể tạo lại snapshot từ DB bằng `node --tls-max-v1.2 src/seeds/export-demo.js`.

## Tạo lại bộ sản phẩm từ dữ liệu nguồn

Chạy từ `backend/`:

```powershell
npm run seed:products -- --dry-run
npm run seed:products
```

Nếu Node gặp `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` khi kết nối Atlas, lần nạp đã được xác minh trên máy này sử dụng TLS 1.2:

```powershell
node --tls-max-v1.2 src/seeds/index.js
```

Lệnh nạp vào MongoDB qua `backend/.env`: `DB_URL` hoặc `MONGO_URI`, có hỗ trợ `MONGO_DNS_SERVERS`. Không in URI hoặc bí mật ra terminal.

- Giữ đúng **1.000 sản phẩm mẫu** và khóa seed v1 ổn định. Dữ liệu hiện dùng **50 danh mục chuẩn** (10 nhóm cấp đầu, 40 mục con); các nhóm nguồn v1 10–30 chào bán được gộp theo mapping mới.
- Mỗi sản phẩm có đúng một `category` chính, `categorySlug`, `categoryId`; `categories[]` chỉ chứa tên chính để tương thích client cũ. Vị trí xuất hiện chéo chuyển sang `tags[]`.
- Collection `categories` lưu `name`, `slug`, `parentSlug`, `parent_id`, `sortOrder`, `isVisible`, `isArchived`. GET /api/categories trả các mục đang hiển thị có sản phẩm, kèm số sản phẩm trực tiếp và toàn nhánh.
- Snapshot [DummyJSON](https://dummyjson.com/products?limit=0) trong `source-products.json` cung cấp sản phẩm gốc và ảnh cùng loại. Bộ dữ liệu gồm các chào bán từ nhiều shop và bộ nhiều sản phẩm của cùng mẫu gốc; không phải 1.000 mẫu thiết kế hay ảnh riêng biệt.
- Giá VNĐ, sao, số lượng đánh giá, lượt bán, doanh số 7 ngày, giá gốc và tồn kho được tạo phục vụ giao diện. `isDemo: true` và `seedKey` đánh dấu từng bản ghi. Không tạo đơn hàng, tài khoản hay nội dung đánh giá giả.
- `_id` cố định và `$setOnInsert` giúp chạy lại không sinh trùng, không đặt lại tồn kho, tên hay dữ liệu đã sửa. Không xóa sản phẩm cũ. Chạy migration bên dưới để chuyển dữ liệu cũ; seed không tái tạo danh mục cũ.
- `--dry-run` kiểm tra schema và in thống kê mà không kết nối MongoDB. Kiểm tra cục bộ: `node --test test/catalog.test.js`.

Biểu mẫu quản trị/người bán dùng một bộ chọn danh mục chuẩn và tag. Giới tính lưu nam/nu/unisex; hệ điều hành ios/android. Chỉ suy ra thuộc tính khi có bằng chứng; bỏ trống nếu chưa rõ.

## Migration danh mục v2

Đã áp dụng ngày 2026-11-25: 1.023 sản phẩm trước và sau; 50 mục chuẩn, 25 mục cũ được lưu trữ (không xóa), tổng collection có 75 bản ghi.

Chạy trong backend:

```powershell
node --tls-max-v1.2 src/migrations/catalog-v2.js
node --tls-max-v1.2 src/migrations/catalog-v2.js --apply
```

Lệnh đầu chỉ lập kế hoạch. --apply sao lưu đầy đủ BSON/EJSON trước khi cập nhật trong transaction; lần chạy tiếp theo không có thay đổi. Không sửa ID, giá, tồn kho, ảnh, sao, lượt bán, thời gian hoặc collection nghiệp vụ khác. Backup và báo cáo gốc ở backend/.backups/, bị Git bỏ qua.

Backup đã dùng: catalog-v2-2026-11-25T08-39-47-065Z.ejson. Đối soát và xuất báo cáo:

```powershell
node --tls-max-v1.2 src/migrations/verify-catalog-v2.js .backups/catalog-v2-2026-11-25T08-39-47-065Z.ejson ../docs
```

Hoàn tác khi cần (chưa thực hiện trên DB dự án):

```powershell
node --tls-max-v1.2 src/migrations/catalog-v2.js --rollback .backups/catalog-v2-2026-11-25T08-39-47-065Z.ejson
```

Rollback chỉ phục hồi các trường danh mục/thuộc tính và cây danh mục; giữ thay đổi tồn kho/giá phát sinh sau đó. Tự hủy nếu sản phẩm hoặc danh mục đã được sửa sau migration, hoặc số lượng sản phẩm đã đổi. Đã kiểm thử migrate → chạy lại → rollback trên replica set tạm, không rollback dữ liệu thật.

Báo cáo chi tiết: docs/catalog-v2-report.json ở gốc repo, gồm bảng trước/sau đủ các danh mục, old_slug → new_slug, 45 sản phẩm thiếu gender (19 túi/ba lô, 26 trang sức), 20 sản phẩm cũ cần chọn mục con. Chưa có mục chuẩn nào rỗng; Văn phòng phẩm có 3 sản phẩm nên vẫn hiển thị. Hai tên mắt/mặt có slug riêng: trang-diem-mat và trang-diem-khuon-mat.

Kiểm thử backend dùng MongoDB tạm, không kết nối database dự án. Nếu mongod chưa nằm trong PATH trên Windows, đặt MONGOD_BIN tới binary MongoDB đã cài trước khi chạy npm test.
