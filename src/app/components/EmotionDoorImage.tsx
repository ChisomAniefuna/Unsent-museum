import type { ComponentProps } from "react";
// Optimized 900px webp (~240 KB) instead of the 1340px PNGs (2.4–3.8 MB each).
// Same art + alpha; used both as the visible door and as the CSS mask shape.
import griefDoor from "../../imports/grief_door.webp";
import closureDoor from "../../imports/Closure_door.webp";
import loveDoor from "../../imports/Love_door.webp";
import hopeDoor from "../../imports/Hope_door.webp";
import regretDoor from "../../imports/Regret_door.webp";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export type DoorId = "love" | "grief" | "hope" | "regret" | "closure";

export const DOOR_IMAGE_SRC: Record<DoorId, string> = {
  love: loveDoor,
  grief: griefDoor,
  hope: hopeDoor,
  regret: regretDoor,
  closure: closureDoor,
};

export function getDoorImageSrc(door: DoorId) {
  return DOOR_IMAGE_SRC[door];
}

// Preload every door the instant this module is imported (it loads early, via
// rooms.ts) at high priority, so the photographic doors are fetched + decoded
// before they paint. Visitors should never catch the colour-arch placeholder on
// a (re)load, the real doors are the landing page.
if (typeof document !== "undefined") {
  for (const href of Object.values(DOOR_IMAGE_SRC)) {
    if (document.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
  }
}

type DoorImageProps = Omit<ComponentProps<typeof ImageWithFallback>, "src"> & {
  door: DoorId;
};

export function EmotionDoorImage({ door, alt, loading = "eager", draggable = false, ...props }: DoorImageProps) {
  return (
    <ImageWithFallback
      src={DOOR_IMAGE_SRC[door]}
      alt={alt ?? ""}
      loading={loading}
      draggable={draggable}
      {...props}
    />
  );
}
