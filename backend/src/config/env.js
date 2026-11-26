import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3000,
  DB_URL: process.env.DB_URL,
  MONGO_DNS_SERVERS: process.env.MONGO_DNS_SERVERS,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  WEB_AUTH_SECRET: process.env.WEB_AUTH_SECRET,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_UNSIGNED: process.env.CLOUDINARY_UPLOAD_UNSIGNED === "true",
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  CLIENT_URL: process.env.CLIENT_URL,
};
