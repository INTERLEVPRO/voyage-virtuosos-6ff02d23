import { useEffect, useState } from "react";

/* ── Elegant & abstract travel/premium icons ── */
const TRAVEL_ICONS = [
  "✧", "✦", "✨", "✈", "☁", "☼", "⋆", "∘",
  "🪩", "⭐", "💫", "💎", "✈️", "🤍", "🪶"
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
    size: 0.5 + Math.random() * 0.8, // Much smaller sizes for subtlety
    duration: 20 + Math.random() * 40, // Slower, more elegant animation
    delay: -(Math.random() * 40),
    opacity: 0.1 + Math.random() * 0.2, // Slightly more visible since they are smaller
    drift: 20 + Math.random() * 40, // Less drastic horizontal drift
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
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
            ["--base-opacity" as string]: icon.opacity,
            ["--drift" as string]: `${icon.drift}px`,
          }}
        >
          {icon.emoji}
        </span>
      ))}
    </div>
  );
}
