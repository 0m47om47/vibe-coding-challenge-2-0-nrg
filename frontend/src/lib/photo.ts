import { api, USE_MOCKS } from "@/lib/api";
import type { PlayerStats } from "@/types";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export class PhotoError extends Error {}

/**
 * Picture URL sized for where it is shown. Cloudinary crops and compresses on its side
 * (c_fill with automatic focus, f_auto, q_auto). Any other URL, such as a demo data URL, is returned as is.
 */
export function photoSrc(url: string | undefined, width: number, height: number): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/);
  return m ? `${m[1]}c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/${m[2]}` : url;
}

// Redraws the picture smaller as JPEG. Phones take 5 MB photos; the app needs about 150 KB.
async function shrink(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // applies the camera's rotation
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("This browser cannot prepare the picture. Try another browser.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white instead of black
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new PhotoError("The picture could not be prepared. Try another one."))),
      "image/jpeg",
      quality
    )
  );
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new PhotoError("The picture could not be read."));
    r.readAsDataURL(blob);
  });

export async function prepareImage(file: File, maxSide = 1200, quality = 0.85): Promise<Blob> {
  if (!OK_TYPES.includes(file.type)) throw new PhotoError("Choose a JPG, PNG or WebP picture.");
  if (file.size > MAX_INPUT_BYTES) throw new PhotoError("That picture is over 15 MB. Choose a smaller one.");
  try {
    return await shrink(file, maxSide, quality);
  } catch (e) {
    if (e instanceof PhotoError) throw e;
    throw new PhotoError("That file could not be read as a picture. Try another one.");
  }
}

/**
 * Uploads a player's photo and saves it on their profile. Returns the updated player.
 * Live: backend signs, the browser uploads straight to Cloudinary, the backend saves the URL.
 * Demo (mocks on): the shrunken picture is stored in the browser instead.
 */
export async function uploadPlayerPhoto(playerId: string, file: File): Promise<PlayerStats> {
  if (USE_MOCKS) {
    const small = await prepareImage(file, 480, 0.8);
    const { player } = await api.players.update(playerId, { photoUrl: await readAsDataUrl(small) });
    return player;
  }

  const blob = await prepareImage(file);
  const { ticket } = await api.players.photoSignature(playerId);

  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  form.append("api_key", ticket.apiKey);
  form.append("timestamp", String(ticket.timestamp));
  form.append("signature", ticket.signature);
  form.append("public_id", ticket.publicId);
  form.append("overwrite", ticket.overwrite);
  form.append("invalidate", ticket.invalidate);
  form.append("allowed_formats", ticket.allowedFormats);

  let res: Response;
  try {
    res = await fetch(ticket.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new PhotoError("Could not reach the photo service. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !data?.secure_url) {
    throw new PhotoError(data?.error?.message ? `Upload failed. ${data.error.message}` : "Upload failed. Try again.");
  }

  const { player } = await api.players.update(playerId, { photoUrl: data.secure_url });
  return player;
}
