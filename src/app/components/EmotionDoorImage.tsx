import type { ComponentProps } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// Served from /public so the URLs are stable and can be preloaded directly from
// <head> in index.html, instead of waiting for this module to execute on JS
// boot. 500px-wide webps at q=70, ~78 KB each; used both as the visible door
// and as the CSS mask shape.
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

const highPriorityImageProps = {
  fetchpriority: "high",
} as unknown as ComponentProps<typeof ImageWithFallback>;

let doorWarmupStarted = false;
const warmedDoorImages: HTMLImageElement[] = [];

export function warmDoorImages() {
  if (doorWarmupStarted || typeof window === "undefined") return;
  doorWarmupStarted = true;

  Object.values(DOOR_IMAGE_SRC).forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.fetchPriority = "high";
    img.src = src;
    warmedDoorImages.push(img);
    // decode() warms the browser's decoded-pixel cache so when LandingPage
    // remounts on return-from-room, new <img> elements paint immediately
    // instead of blocking on fresh decodes. Without this, all 5 door imgs
    // race to decode on the main thread during mount and paint staggered.
    img.decode?.().catch(() => {});
  });
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
      decoding="sync"
      {...highPriorityImageProps}
      draggable={draggable}
      {...props}
    />
  );
}
