const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 32 random bytes, base64url without padding. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const SLUG_LENGTH = 6;

/** Random base62 slug. Bytes of 248 and above are dropped so every character is equally likely. */
export function randomSlug(): string {
  let slug = "";
  while (slug.length < SLUG_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(SLUG_LENGTH * 2))) {
      if (byte < 248 && slug.length < SLUG_LENGTH) slug += BASE62[byte % 62];
    }
  }
  return slug;
}

export function isSlug(value: string): boolean {
  return /^[0-9A-Za-z]{6}$/.test(value);
}
