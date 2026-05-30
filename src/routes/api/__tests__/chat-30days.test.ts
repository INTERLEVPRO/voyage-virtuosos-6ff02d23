import { describe, it, expect } from "bun:test";

// We test the live /api/chat endpoint with a 30-day brief and verify
// exactly 30 itinerary days come back in every package.

const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:8080";

describe("/api/chat — 30-day trip", () => {
  it("returns 30 itinerary days in every package", async () => {
    const body = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "text",
              text:
                "Thailand, 30 Tage, 2 Personen, Budget 4000€, ab Frankfurt, im Juni, Strand & Kultur",
            },
          ],
        },
      ],
    };

    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(200);
    const text = await res.text();

    const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/);
    expect(jsonMatch).not.toBeNull();
    const payload = JSON.parse(jsonMatch![1]);

    expect(payload.status).toBe("packages_ready");
    expect(payload.packages).toHaveLength(3);

    for (const pkg of payload.packages) {
      expect(pkg.itinerary).toHaveLength(30);
      expect(pkg.itinerary[0].day).toBe(1);
      expect(pkg.itinerary[29].day).toBe(30);
      expect(pkg.duration).toBe("30 Tage");
      expect(pkg.destination.toLowerCase()).toContain("thailand");
      // Destination should NOT contain the whole brief
      expect(pkg.destination.length).toBeLessThan(40);
      expect(pkg.price).toBeGreaterThan(0);
    }
  }, 60_000);
});
