import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";

const secret = () => process.env.STAFF_PASSWORD || "";
const hmac = (p) => createHmac("sha256", secret()).update(p).digest("base64url");

export const sign = (name) => {
  const p = Buffer.from(JSON.stringify({ n: name, e: Date.now() + 12 * 3600e3 })).toString("base64url");
  return p + "." + hmac(p);
};

export const verify = (t) => {
  if (!t || !secret()) return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const a = Buffer.from(s), b = Buffer.from(hmac(p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    return d.e > Date.now() ? d.n : null;
  } catch { return null; }
};

export const newSalt = () => randomBytes(16).toString("hex");
export const hash = (pass, salt) => scryptSync(pass, salt, 32).toString("hex");
export const same = (x, y) => {
  const a = Buffer.from(x), b = Buffer.from(y);
  return a.length === b.length && timingSafeEqual(a, b);
};
