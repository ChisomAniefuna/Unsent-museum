interface Props {
  count: number;
  accentColor?: string;
}

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

export function PresenceAvatars({ count, accentColor = "#9b7ed9" }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center select-none"
        style={{
          background: accentColor,
          border: "1.5px solid rgba(255,255,255,0.22)",
          color: "rgba(255,255,255,0.92)",
          boxShadow: `0 2px 8px ${accentColor}88`,
        }}
        title="You"
      >
        <PersonIcon />
      </div>
      {count > 1 && (
        <span
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 11,
            fontFamily: "'Cinzel', serif",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}
        >
          +{count - 1}
        </span>
      )}
    </div>
  );
}
