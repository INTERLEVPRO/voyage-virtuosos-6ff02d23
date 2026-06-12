import { useEffect, useState } from "react";
import { Plane, Map, Compass, Globe, Luggage, Sun, Umbrella, Camera, Palmtree, MapPin } from "lucide-react";

/* ── Premium outline travel icons ── */
const ICONS = [Plane, Map, Compass, Globe, Luggage, Sun, Umbrella, Camera, Palmtree, MapPin];

interface FloatingIcon {
  id: number;
  IconComponent: React.ElementType;
  left: number;       // % from left
  size: number;       // px
  duration: number;   // seconds
  delay: number;      // seconds
  opacity: number;
  drift: number;      // horizontal sway px
}

function generateIcons(count: number): FloatingIcon[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    IconComponent: ICONS[Math.floor(Math.random() * ICONS.length)],
    left: Math.random() * 100,
    size: 24 + Math.random() * 40,
    duration: 18 + Math.random() * 30,
    delay: -(Math.random() * 40),
    opacity: 0.05 + Math.random() * 0.1,    // very subtle glass-like
    drift: 30 + Math.random() * 60,
  }));
}

export function FloatingIcons({ count = 20 }: { count?: number }) {
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
        <div
          key={icon.id}
          className="floating-icon absolute block select-none text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
          style={{
            left: `${icon.left}%`,
            opacity: icon.opacity,
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
            ["--drift" as string]: `${icon.drift}px`,
          }}
        >
          <icon.IconComponent size={icon.size} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
}
