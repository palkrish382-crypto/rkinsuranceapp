import { getStore } from "@netlify/blobs";

// Roz subah 9:00 AM India time par chalta hai
export default async () => {
  const store = getStore("rk");
  const list = (await store.get("customers", { type: "json" })) || [];
  const today = new Date(Date.now() + 5.5 * 3600e3);
  today.setUTCHours(0, 0, 0, 0);

  const due = list.filter((c) => {
    const days = Math.round((new Date(c.d + "T00:00:00Z") - today) / 864e5);
    return days >= 0 && days <= 5;
  });
  if (!due.length) return;

  const text =
    "RK Insurance: policies expiring within 5 days\n" +
    due.map((c) => `${c.n} | ${c.v || "-"} | ${c.i} | ${c.d} | ${c.p}`).join("\n");

  const url =
    "https://api.callmebot.com/whatsapp.php?phone=" +
    encodeURIComponent(process.env.WA_PHONE) +
    "&text=" + encodeURIComponent(text) +
    "&apikey=" + encodeURIComponent(process.env.CALLMEBOT_KEY);
  const r = await fetch(url);
  console.log("WhatsApp alert status:", r.status);
};

export const config = { schedule: "30 3 * * *" };
