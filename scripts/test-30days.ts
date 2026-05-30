/**
 * Automated check: 30-Tage Anfrage soll 30 itinerary days zurückgeben.
 * Run:  bun run scripts/test-30days.ts
 * Env:  TEST_BASE_URL (default http://127.0.0.1:8080)
 */

const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:8080";

const body = {
  messages: [
    {
      id: "u1",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Thailand, 30 Tage, 2 Personen, Budget 4000€, ab Frankfurt, im Juni, Strand & Kultur",
        },
      ],
    },
  ],
};

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exit(1);
  }
}

const res = await fetch(`${BASE}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

assert(res.status === 200, `HTTP ${res.status}`);
const raw = await res.text();

// UI message stream uses SSE-like "data: {json}\n\n" lines. Concatenate text-delta chunks.
let text = "";
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^data:\s*(.+)$/);
  if (!m) continue;
  try {
    const evt = JSON.parse(m[1]);
    if (evt?.type === "text-delta" && typeof evt.delta === "string") text += evt.delta;
  } catch {}
}
if (!text) text = raw; // fallback

const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/);
assert(jsonMatch, `no json block in response. Raw start: ${raw.slice(0, 300)}`);
const payload = JSON.parse(jsonMatch![1]);

assert(payload.status === "packages_ready", `status=${payload.status}`);
assert(payload.packages?.length === 3, `expected 3 packages, got ${payload.packages?.length}`);

for (const pkg of payload.packages) {
  assert(pkg.itinerary?.length === 30, `${pkg.type}: itinerary days=${pkg.itinerary?.length} (expected 30)`);
  assert(pkg.itinerary[0].day === 1, `${pkg.type}: first day must be 1`);
  assert(pkg.itinerary[29].day === 30, `${pkg.type}: last day must be 30`);
  assert(pkg.duration === "30 Tage", `${pkg.type}: duration=${pkg.duration}`);
  assert(pkg.destination?.toLowerCase().includes("thailand"), `${pkg.type}: destination='${pkg.destination}'`);
  assert(pkg.destination.length < 40, `${pkg.type}: destination too long ('${pkg.destination}')`);
  assert(pkg.price > 0, `${pkg.type}: price=${pkg.price} (must be >0)`);
}

console.log("✅ 30-day test passed — all 3 packages have 30 itinerary days, destination=Thailand, price>0");
