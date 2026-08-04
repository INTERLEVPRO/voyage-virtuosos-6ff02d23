import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Konto erstellen — Urlaub ab Deutschland planen | Weltweiturlaub.de" },
      {
        name: "description",
        content:
          "Erstelle kostenlos ein Konto bei Weltweiturlaub.de und speichere deine individuellen Reisepakete für weltweite Reisen ab Deutschland.",
      },
      { property: "og:title", content: "Konto erstellen — Weltweiturlaub.de" },
      {
        property: "og:description",
        content: "Kostenlos registrieren und individuelle Reisepakete ab Deutschland speichern.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://weltweiturlaub.de/register" },
    ],
    links: [{ rel: "canonical", href: "https://weltweiturlaub.de/register" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Startseite", item: "https://weltweiturlaub.de/" },
            { "@type": "ListItem", position: 2, name: "Registrieren", item: "https://weltweiturlaub.de/register" },
          ],
        }),
      },
    ],
  }),
  component: RegisterPage,
});


function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Konto erstellt!");
      navigate({ to: "/" });
    } else {
      toast.success("Bitte bestätige deine E-Mail-Adresse.");
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google-Anmeldung fehlgeschlagen");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Registrieren</h1>
        <p className="mt-2 text-sm text-muted-foreground">Erstelle dein Konto in wenigen Sekunden.</p>

        <button
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Mit Google registrieren
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> oder <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Konto wird erstellt…" : "Konto erstellen"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Bereits ein Konto?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Anmelden</Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Zurück zur Startseite</Link>
        </p>
      </div>
    </div>
  );
}
