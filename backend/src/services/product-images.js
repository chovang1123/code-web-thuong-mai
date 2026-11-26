import cloudinary from "../config/cloudinary.js";
import { ENV } from "../config/env.js";

function imageUploadError(status, message) {
  return Object.assign(new Error(message), { status, publicMessage: message });
}

export function uploadProductImage(file) {
  return new Promise((resolve, reject) => {
    const config = cloudinary.config();
    if (!/^[a-z0-9_-]+$/i.test(config.cloud_name || "") || !config.api_key || !config.api_secret) {
      reject(imageUploadError(503, "Dịch vụ lưu ảnh chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên."));
      return;
    }
    if (ENV.CLOUDINARY_UPLOAD_UNSIGNED && !ENV.CLOUDINARY_UPLOAD_PRESET) {
      reject(imageUploadError(503, "Chưa cấu hình preset tải ảnh. Vui lòng liên hệ quản trị viên."));
      return;
    }
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "products", resource_type: "image", timeout: 30000,
        ...(ENV.CLOUDINARY_UPLOAD_PRESET ? { upload_preset: ENV.CLOUDINARY_UPLOAD_PRESET } : {}),
        ...(ENV.CLOUDINARY_UPLOAD_UNSIGNED ? { unsigned: true } : {}),
      },
      (error, result) => {
        if (error) {
          const code = Number(error.http_code);
          if (code === 401 || code === 403) {
            reject(imageUploadError(503, "Dịch vụ lưu ảnh chưa được cấp quyền tải lên. Vui lòng liên hệ quản trị viên."));
          } else if (code === 404) {
            reject(imageUploadError(503, "Dịch vụ lưu ảnh chưa được cấu hình đúng. Vui lòng liên hệ quản trị viên."));
          } else if (code === 400) {
            reject(imageUploadError(400, "Ảnh không hợp lệ hoặc không được hỗ trợ. Vui lòng chọn ảnh khác."));
          } else {
            reject(imageUploadError(502, "Không thể tải ảnh lên dịch vụ lưu trữ. Vui lòng thử lại."));
          }
          return;
        }
        if (!result?.secure_url || !result?.public_id) {
          reject(imageUploadError(502, "Dịch vụ lưu ảnh không trả về ảnh đã tải. Vui lòng thử lại."));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(file.buffer);
  });
}

// Accept references returned by our upload endpoint, never an arbitrary image URL.
export function readProductImage(value) {
  if (!value || typeof value.url !== "string" || typeof value.publicId !== "string" || !/^products\/[a-z0-9_/-]+$/i.test(value.publicId)) return null;
  try {
    const url = new URL(value.url);
    const prefix = `/${cloudinary.config().cloud_name}/image/upload/`;
    if (url.origin !== "https://res.cloudinary.com" || !url.pathname.startsWith(prefix) || url.search || url.hash) return null;
    const asset = decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^v\d+\//, "");
    if (asset !== value.publicId && !["jpg", "jpeg", "png", "webp"].some(extension => asset === `${value.publicId}.${extension}`)) return null;
    return { url: value.url, publicId: value.publicId };
  } catch {
    return null;
  }
}
