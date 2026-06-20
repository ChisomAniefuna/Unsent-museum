import type { CSSProperties, ReactNode } from "react";

type LandingMuseumBackgroundProps = {
  children: ReactNode;
  className?: string;
};

// Served from /public so the URL is stable and can be preloaded from index.html.
export const LANDING_MUSEUM_IMAGE_SRC = "/landing-hero.webp";

// The photo sits on top; a hall-like gradient sits beneath it as the fallback, so
// if the background image is still loading or fails, the page still reads as a lit
// museum hall (cream wall → warm stone floor) instead of a flat tan band.
const BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `url(${LANDING_MUSEUM_IMAGE_SRC}), linear-gradient(180deg, #e8e0d2 0%, #ddd0b9 40%, #cdbd9f 70%, #c4b393 100%)`,
  backgroundSize: "cover, cover",
  backgroundPosition: "center top, center top",
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundColor: "#cdbd9f",
};

export function LandingMuseumBackground({ children, className = "" }: LandingMuseumBackgroundProps) {
  return (
    <main className={`relative min-h-full w-full overflow-hidden ${className}`} style={BACKGROUND_STYLE}>
      {children}
    </main>
  );
}
