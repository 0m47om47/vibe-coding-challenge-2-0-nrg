// Signed browser uploads to Cloudinary, without the SDK.
// The browser uploads the file itself, so photos never pass through the backend or Vercel.
// Signing rule (Cloudinary docs): sort the params by name, join as k=v with &, append the API secret, SHA 1.
import crypto from "node:crypto";

export const PHOTO_FOLDER = "academy-desk/players";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

// Returns { cloudName, apiKey, apiSecret }, or null when Cloudinary is not set up.
export function cloudinaryConfig(env = process.env) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

// One fixed public id per player, so a new photo replaces the old one and nothing piles up.
export function createUploadTicket(playerId, cfg, nowMs = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000);
  const publicId = `${PHOTO_FOLDER}/${playerId}`;
  const signature = signParams(
    { allowed_formats: ALLOWED_FORMATS, invalidate: "true", overwrite: "true", public_id: publicId, timestamp },
    cfg.apiSecret
  );
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    apiKey: cfg.apiKey,
    timestamp,
    signature,
    publicId,
    overwrite: "true",
    invalidate: "true",
    allowedFormats: ALLOWED_FORMATS,
  };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only our own Cloudinary account, and only this player's own photo path, is accepted as a photoUrl.
export function isPlayerPhotoUrl(url, playerId, cloudName) {
  if (typeof url !== "string" || !cloudName) return false;
  const re = new RegExp(
    `^https://res\\.cloudinary\\.com/${escapeRe(cloudName)}/image/upload/(v\\d+/)?${escapeRe(PHOTO_FOLDER)}/${escapeRe(playerId)}(\\.(jpg|jpeg|png|webp))?$`
  );
  return re.test(url);
}
