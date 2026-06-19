import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import museumLandingImage from "../../imports/museum_hall_opt.jpg";

type LandingMuseumBackgroundProps = {
  children: ReactNode;
  className?: string;
};

// The photo sits on top; a hall-like gradient sits beneath it as the fallback, so
// if the (large) background image is still loading or fails, the page still reads
// as a lit museum hall (cream wall → warm stone floor) instead of a flat tan band.
const BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: `url(${museumLandingImage}), linear-gradient(180deg, #e8e0d2 0%, #ddd0b9 40%, #cdbd9f 70%, #c4b393 100%)`,
  backgroundSize: "cover, cover",
  backgroundPosition: "center top, center top",
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundColor: "#cdbd9f",
};

export const LANDING_MUSEUM_IMAGE_SRC = museumLandingImage;

export function LandingMuseumBackground({ children, className = "" }: LandingMuseumBackgroundProps) {
  useEffect(() => {
    const existingPreload = document.querySelector<HTMLLinkElement>(
      `link[rel="preload"][href="${museumLandingImage}"]`
    );

    if (existingPreload) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = museumLandingImage;
    document.head.appendChild(link);

    // Keep this preload link in place after leaving the landing page so returning
    // from a room can reuse the already-prioritized museum background.
  }, []);

  return (
    <main className={`relative min-h-full w-full overflow-hidden ${className}`} style={BACKGROUND_STYLE}>
      {children}
    </main>
  );
}
