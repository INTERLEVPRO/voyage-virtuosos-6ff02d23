import { Link } from "@tanstack/react-router";
import { Mail, Phone, MessageCircle, Facebook, Instagram } from "lucide-react";
import { ConsentSettingsButton } from "@/components/ConsentBanner";

export function Footer() {
  return (
    <footer className="bg-[#1a2e4a] text-white py-8 px-6 sm:py-12 sm:px-10 border-t border-white/10 pb-16 sm:pb-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
        {/* Column 1 */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-4 uppercase">INTERLEV GmbH</h3>

          <div className="flex flex-col sm:flex-col gap-3 sm:gap-4">
            <div>
              <p className="font-semibold text-xs sm:text-sm">Innovation Park Leverkusen</p>
              <p className="text-[11px] sm:text-sm text-gray-300">Hemmelrather Weg 201, 51377 Leverkusen</p>
            </div>
          </div>

          {/* E-Mail ist bestätigt und aktiv. Telefon, WhatsApp und die
              Social-Profile bleiben sichtbar, aber bewusst ohne Ziel — es
              werden keine Nummern oder Profile erfunden. */}
          <div className="flex items-center gap-3 pt-2 sm:pt-4">
            <a
              href="mailto:contact@interlev.com"
              aria-label="E-Mail an contact@interlev.com"
              className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center bg-[#EA4335] hover:bg-[#d33c30] transition"
            >
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </a>
            <a
              href="mailto:contact@interlev.com"
              className="text-xs sm:text-sm text-gray-300 hover:text-white transition"
            >
              contact@interlev.com
            </a>
          </div>

          <div className="flex items-center gap-3">
            {[
              { Icon: Phone, bg: "bg-[#0d9e4f]", label: "Telefon folgt" },
              { Icon: MessageCircle, bg: "bg-[#25D366]", label: "WhatsApp folgt" },
              { Icon: Facebook, bg: "bg-[#1877F2]", label: "Facebook folgt" },
              { Icon: Instagram, bg: "bg-[#C13584]", label: "Instagram folgt" },
            ].map(({ Icon, bg, label }) => (
              <span
                key={label}
                role="img"
                aria-label={label}
                title={label}
                aria-disabled="true"
                className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center opacity-50 cursor-default ${bg}`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Telefon, WhatsApp und Social-Media-Profile folgen in Kürze.
          </p>
        </div>

        {/* Column 2 */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-4 uppercase">META-NAVIGATION</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:block sm:space-y-4">
            <li>
              <a
                href="mailto:contact@interlev.com"
                className="text-xs sm:text-sm font-semibold text-white hover:text-gray-300 transition"
              >
                Kontakt
              </a>
            </li>
            <li>
              <Link
                to="/impressum"
                className="text-xs sm:text-sm font-semibold text-white hover:text-gray-300 transition"
              >
                Impressum
              </Link>
            </li>
            <li>
              <Link
                to="/impressum"
                hash="datenschutz"
                className="text-xs sm:text-sm font-semibold text-white hover:text-gray-300 transition"
              >
                Datenschutz
              </Link>
            </li>
            <li>
              <ConsentSettingsButton className="text-xs sm:text-sm font-semibold text-white hover:text-gray-300 transition" />
            </li>
          </ul>

          {/* Social-Icons werden erst wieder angezeigt, wenn echte Profil-Links
              vorliegen — Links auf Plattform-Startseiten wären irreführend. */}
        </div>
      </div>
    </footer>
  );
}
