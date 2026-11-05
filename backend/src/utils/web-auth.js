import crypto from "node:crypto";
import { ENV } from "../config/env.js";

const tokenLifetimeSeconds = 60 * 60 * 24 * 30;

function getSigningKey() {
  const secret =
    ENV.WEB_AUTH_SECRET ||
    ENV.CLERK_SECRET_KEY ||
    ENV.DB_URL ||
    process.env.MONGO_URI;
  if (!secret) {
    throw new Error("Set WEB_AUTH_SECRET to sign web authentication tokens.");
  }
  return secret;
}

export function createWebAuthToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyWebAuthToken(token) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest();
  const actualSignature = Buffer.from(signature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.sub || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data.sub;
  } catch {
    return null;
  }
}
