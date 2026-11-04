import { getStore } from "@netlify/blobs";

export default async (req) => {
  const pass = process.env.STAFF_PASSWORD;
  if (!pass || req.headers.get("x-pass") !== pass) {
    return new Response("[]", { status: 401 });
  }
  const store = getStore("rk");
  if (req.method === "PUT") {
    const data = await req.json();
    if (!Array.isArray(data)) return new Response("bad request", { status: 400 });
    await store.setJSON("customers", data);
    return Response.json(data);
  }
  const list = (await store.get("customers", { type: "json" })) || [];
  return Response.json(list);
};

export const config = { path: "/api/customers" };
