import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { packageSchema } from "@/lib/package-schema";

const inputSchema = z.object({
  travelPackage: packageSchema,
});

function renderEmailHtml(pkg: z.infer<typeof packageSchema>) {
  const itinerary = pkg.itinerary
    .map(
      (d) =>
        `<li style="margin-bottom:10px"><strong>Tag ${d.day} — ${d.title}</strong><br/><span style="color:#555">${d.description}</span></li>`,
    )
    .join("");
  const activities = pkg.activities.map((a) => `<li>${a}</li>`).join("");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">
  <h1 style="color:#1e40af">${pkg.title}</h1>
  <p style="color:#555">${pkg.destination} · ${pkg.duration} · € ${pkg.price.toLocaleString("de-DE")}</p>
  <p>${pkg.summary}</p>
  <h2>Hotel</h2><p>${pkg.hotel}</p>
  <h2>Flug</h2><p>${pkg.flight}</p>
  <h2>Tag für Tag</h2><ol>${itinerary}</ol>
  <h2>Aktivitäten</h2><ul>${activities}</ul>
  <p style="margin-top:32px;color:#888;font-size:12px">Weltweiturlaub.de — Dein KI-Reiseassistent</p>
  </body></html>`;
}

export const sendPlanEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes?.user?.email;
    if (!email) {
      return { success: false, message: "Keine E-Mail-Adresse gefunden." };
    }

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) {
      return { success: false, message: "E-Mail-Dienst nicht konfiguriert." };
    }

    const html = renderEmailHtml(data.travelPackage);
    const subject = `Dein Reiseplan: ${data.travelPackage.title}`;

    try {
      const res = await fetch("https://api.lovable.app/emails/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("[send-plan] email send failed", res.status, errText);
        return {
          success: false,
          message:
            "E-Mail konnte nicht gesendet werden. Bitte richte zuerst eine E-Mail-Domain in den Cloud-Einstellungen ein.",
        };
      }
      return { success: true, message: `E-Mail wurde an ${email} gesendet.` };
    } catch (err) {
      console.error("[send-plan] error", err);
      return { success: false, message: "Verbindung fehlgeschlagen." };
    }
  });
