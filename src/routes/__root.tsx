import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { FloatingIcons } from "@/components/FloatingIcons";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <p className="mt-4 text-muted-foreground">This destination doesn't exist on our map.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-primary">Something drifted off course</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google", content: "notranslate" },
      { title: "Weltweit Urlaub — Reise planen in 2 Minuten" },
      { name: "description", content: "Dein KI-Reiseberater erstellt in 2 Minuten 3 maßgeschneiderte Reisepakete — Basic, Medium, Premium. Flüge, Hotels und Aktivitäten inklusive." },
      { property: "og:title", content: "Weltweit Urlaub — Reise planen in 2 Minuten" },
      { property: "og:description", content: "Dein KI-Reiseberater erstellt in 2 Minuten 3 maßgeschneiderte Reisepakete — Basic, Medium, Premium. Flüge, Hotels und Aktivitäten inklusive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Weltweit Urlaub — Reise planen in 2 Minuten" },
      { name: "twitter:description", content: "Dein KI-Reiseberater erstellt in 2 Minuten 3 maßgeschneiderte Reisepakete — Basic, Medium, Premium. Flüge, Hotels und Aktivitäten inklusive." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bb723315-5689-4728-beb8-4894cfff4e1c/id-preview-3c1b37db--147e2305-7bd3-4741-b042-c86a2acf150d.lovable.app-1779176204821.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bb723315-5689-4728-beb8-4894cfff4e1c/id-preview-3c1b37db--147e2305-7bd3-4741-b042-c86a2acf150d.lovable.app-1779176204821.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" },
    ],
    scripts: [
      {
        type: "text/javascript",
        children: `
          if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
          }
          window.scrollTo(0, 0);
          
          window.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
              setTimeout(function() { window.scrollTo(0, 0); }, 10);
            }
          });
          window.addEventListener('pageshow', function() {
            setTimeout(function() { window.scrollTo(0, 0); }, 10);
          });
          window.addEventListener('focus', function() {
            setTimeout(function() { window.scrollTo(0, 0); }, 10);
          });
        `,
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-BYSENCWW5P",
        async: true,
      },
      {
        type: "text/javascript",
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-BYSENCWW5P');
        `,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" translate="no">
      <head><HeadContent /></head>
      <body className="notranslate bg-neutral-100 dark:bg-neutral-900">{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background relative overflow-x-hidden">
          <FloatingIcons />
          <Outlet />
        </div>
        <ClientOnly fallback={null}>
          <Toaster position="top-center" richColors />
        </ClientOnly>
      </AuthProvider>
    </QueryClientProvider>
  );
}
