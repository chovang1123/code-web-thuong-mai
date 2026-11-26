import { v2 as cloudinary } from "cloudinary";

import { ENV } from "./env.js";

export function parseCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "cloudinary:" || !/^[a-z0-9_-]+$/i.test(url.hostname) || !url.username || !url.password) return null;
    return {
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}

const config = parseCloudinaryUrl(ENV.CLOUDINARY_URL);
cloudinary.config({
  cloud_name: config?.cloud_name || "",
  api_key: config?.api_key || "",
  api_secret: config?.api_secret || "",
  secure: true,
});

export default cloudinary;
