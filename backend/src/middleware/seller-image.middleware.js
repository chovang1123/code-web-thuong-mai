import multer from "multer";
import path from "node:path";

const imageTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20 },
  fileFilter(req, file, callback) {
    if (imageTypes.get(path.extname(file.originalname).toLowerCase()) !== file.mimetype) {
      return callback(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP."));
    }
    callback(null, true);
  },
}).single("image");

export function uploadSellerImage(req, res, next) {
  parseImage(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Ảnh phải có dung lượng tối đa 5 MB."
      : error instanceof multer.MulterError
        ? "Chỉ được tải lên một ảnh sản phẩm, tối đa 5 MB."
        : error.message;
    res.status(400).json({ message });
  });
}
