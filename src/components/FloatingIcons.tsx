import { useEffect, useState } from "react";

/* ── Travel emoji set ── */
const TRAVEL_ICONS = [
  "✈️", "🌍", "🏝️", "🧳", "🗺️", "⛵", "🏔️", "🌴",
  "🎒", "🚀", "🏖️", "🧭", "🌅", "🐚", "☀️", "🦩",
];

interface FloatingIcon {
  id: number;
  emoji: string;
  left: number;       // % from left
  size: number;       // rem
  duration: number;   // seconds
  delay: number;      // seconds
  opacity: number;
  drift: number;      // horizontal sway px
}

function generateIcons(count: number): FloatingIcon[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: TRAVEL_ICONS[Math.floor(Math.random() * TRAVEL_ICONS.length)],
    left: Math.random() * 100,
    size: 1 + Math.random() * 1.8,
    duration: 18 + Math.random() * 30,
    delay: -(Math.random() * 40),            // negative = already mid-animation
    opacity: 0.08 + Math.random() * 0.12,    // very subtle
    drift: 30 + Math.random() * 60,
  }));
}

export function FloatingIcons({ count = 22 }: { count?: number }) {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    setIcons(generateIcons(count));
  }, [count]);

  if (icons.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {icons.map((icon) => (
        <span
          key={icon.id}
          className="floating-icon absolute block select-none"
          style={{
            left: `${icon.left}%`,
            fontSize: `${icon.size}rem`,
            opacity: icon.opacity,
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
            ["--drift" as string]: `${icon.drift}px`,
          }}
        >
          {icon.emoji}
        </span>
      ))}
    </div>
  );
}
