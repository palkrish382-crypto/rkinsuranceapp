import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.STAFF_PASSWORD || "";
const verify = (t) => {
  if (!t || !secret()) return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const a = Buffer.from(s), b = Buffer.from(createHmac("sha256", secret()).update(p).digest("base64url"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    return d.e > Date.now() ? d.n : null;
  } catch { return null; }
};
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (!process.env.STAFF_PASSWORD)
    return json({ error: "STAFF_PASSWORD is not set in Netlify environment variables" }, 500);
  const who = verify((req.headers.get("authorization") || "").replace("Bearer ", ""));
  if (!who) return json({ error: "Session expired. Please login again." }, 401);

  const store = getStore("rk");
  let list = (await store.get("customers", { type: "json" })) || [];

  if (req.method === "POST") {
    const r = await req.json();
    if (!r || !r.id || !r.n) return json({ error: "Bad record" }, 400);
    const i = list.findIndex((c) => String(c.id) === String(r.id));
    r.by = i >= 0 ? list[i].by : who;
    r.ub = who;
    if (i >= 0) list[i] = r; else list.push(r);
    await store.setJSON("customers", list);
    return json(r);
  }
  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    list = list.filter((c) => String(c.id) !== id);
    await store.setJSON("customers", list);
    return json({ ok: true });
  }
  return json(list);
};

export const config = { path: "/api/customers" };
