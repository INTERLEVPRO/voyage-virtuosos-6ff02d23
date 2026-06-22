import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  packageId: z.string().min(1).max(64).optional(),
  provider: z.string().min(1).max(32),
  url: z.string().url().max(2048),
});

export const Route = createFileRoute("/api/track-click")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const { packageId, provider, url } = parsed.data;
        // Only insert package_id if it looks like a uuid (DB-stored package).
        const isUuid = packageId && /^[0-9a-f-]{36}$/i.test(packageId);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("affiliate_clicks").insert({
          package_id: isUuid ? packageId : null,
          provider,
          url,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
