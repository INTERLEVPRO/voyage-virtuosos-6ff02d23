import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/impressum")({
  component: Impressum,
});

function Impressum() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-[#1a2e4a] backdrop-blur-lg py-4 px-6 sm:px-10 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white">Weltweiturlaub.de</Link>
        <Link to="/" className="text-sm font-medium text-white/80 hover:text-white transition">← Zurück zur Startseite</Link>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 py-12">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-12">
          <h1 className="text-3xl font-semibold text-foreground">Impressum</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Link to="/" className="hover:text-foreground hover:underline transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </Link> 
            <span>›</span> 
            <span>Impressum</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Image Side */}
          <div className="w-full">
            <div className="aspect-[3/2] overflow-hidden rounded-xl shadow-sm bg-muted relative">
              <img 
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200&h=800" 
                alt="Office Conference Room" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-white/20"></div>
            </div>
          </div>

          {/* Text Side */}
          <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
            <div>
              <p className="font-semibold text-foreground mb-1">Impressum</p>
              <p>Angaben gemäß § 5 TMG</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">INTERLEV GmbH</p>
              <p>Hemmelrather Weg 201</p>
              <p>51377 Leverkusen</p>
            </div>

            <div>
              <p>Handelsregister: HRB 79189</p>
              <p>Registergericht: Amtsgericht Köln</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Vertreten durch:</p>
              <p>Kanagasabapathy Kapilan</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Kontakt</p>
              <p>Telefon: +49 (0) 214 96 000 120</p>
              <p>E-Mail: contact@interlev.com</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Umsatzsteuer-ID</p>
              <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
              <p>DE260597679</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Verbraucherstreitbeilegung/Universalschlichtungsstelle</p>
              <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </div>

            <div>
              <p className="font-semibold text-foreground">Quelle:</p>
              <p>eRecht24</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
