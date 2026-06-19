import { useEffect, useState } from "react";

interface Props {
  seeds: string[];
  count: number;
  accentColor?: string;
}

const AVATAR_COLORS = [
  "#c0392b", // crimson
  "#8e44ad", // violet
  "#2471a3", // cobalt
  "#117a65", // teal
  "#d4ac0d", // gold
  "#ca6f1e", // amber
  "#1a5276", // deep blue
  "#6c3483", // plum
];

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6.5" r="3.2" fill="currentColor" opacity="0.9" />
      <path
        d="M3.5 18c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function PresenceAvatars({ seeds, count, accentColor = "#9b7ed9" }: Props) {
  const [liveCount, setLiveCount] = useState(count);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((c) => Math.max(1, c + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const shown = seeds.slice(0, 2);
  const remaining = Math.max(0, liveCount - shown.length);

  return (
    <div className="flex -space-x-2 items-center">
      {shown.map((_, i) => (
        <div
          key={i}
          className="w-8 h-8 rounded-full flex items-center justify-center select-none"
          style={{
            background: AVATAR_COLORS[i % AVATAR_COLORS.length],
            border: "1.5px solid rgba(255,255,255,0.22)",
            color: "rgba(255,255,255,0.92)",
            zIndex: 3 - i,
            boxShadow: `0 2px 8px ${AVATAR_COLORS[i % AVATAR_COLORS.length]}88`,
          }}
          title="Anonymous Visitor"
        >
          <PersonIcon />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="flex items-center justify-center select-none"
          style={{
            height: 32,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontFamily: "'Cinzel', serif",
            fontWeight: 600,
            letterSpacing: "0.03em",
            zIndex: 0,
          }}
          title={`${remaining} more visitors`}
        >
          +{remaining > 99 ? "99" : remaining}
        </div>
      )}
    </div>
  );
}
