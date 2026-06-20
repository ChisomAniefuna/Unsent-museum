import type { ComponentProps } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// Served from /public so the URLs are stable and can be preloaded directly from
// <head> in index.html, instead of waiting for this module to execute on JS
// boot. Same art + alpha as before, just relocated. 700px-wide webps at q=72,
// ~150 KB each; used both as the visible door and as the CSS mask shape.
export type DoorId = "love" | "grief" | "hope" | "regret" | "closure";

export const DOOR_IMAGE_SRC: Record<DoorId, string> = {
  love: "/doors/love.webp",
  grief: "/doors/grief.webp",
  hope: "/doors/hope.webp",
  regret: "/doors/regret.webp",
  closure: "/doors/closure.webp",
};

export function getDoorImageSrc(door: DoorId) {
  return DOOR_IMAGE_SRC[door];
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
