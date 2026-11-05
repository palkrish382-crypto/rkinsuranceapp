import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";

const secret = () => process.env.STAFF_PASSWORD || "";
const hmac = (p) => createHmac("sha256", secret()).update(p).digest("base64url");
const sign = (name) => {
  const p = Buffer.from(JSON.stringify({ n: name, e: Date.now() + 12 * 3600e3 })).toString("base64url");
  return p + "." + hmac(p);
};
const hash = (pass, salt) => scryptSync(pass, salt, 32).toString("hex");
const same = (x, y) => {
  const a = Buffer.from(x), b = Buffer.from(y);
  return a.length === b.length && timingSafeEqual(a, b);
};
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (!process.env.STAFF_PASSWORD)
    return json({ error: "STAFF_PASSWORD is not set in Netlify environment variables" }, 500);

  const store = getStore("rk");
  const profiles = (await store.get("profiles", { type: "json" })) || [];
  if (req.method === "GET") return json(profiles.map((p) => p.name));

  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const pass = String(b.pass || "");

  if (b.action === "create") {
    if (b.setup !== process.env.STAFF_PASSWORD) return json({ error: "Wrong setup code" }, 401);
    if (name.length < 2 || name.length > 30) return json({ error: "Name must be 2 to 30 characters" }, 400);
    if (pass.length < 4) return json({ error: "Passcode must be at least 4 characters" }, 400);
    if (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return json({ error: "This name already exists" }, 409);
    const salt = randomBytes(16).toString("hex");
    profiles.push({ name, salt, hash: hash(pass, salt) });
    await store.setJSON("profiles", profiles);
    return json({ name, token: sign(name) });
  }

  const p = profiles.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!p || !same(hash(pass, p.salt), p.hash)) return json({ error: "Wrong passcode" }, 401);
  return json({ name: p.name, token: sign(p.name) });
};

export const config = { path: "/api/auth" };
