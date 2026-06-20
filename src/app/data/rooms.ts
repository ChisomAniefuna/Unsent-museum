import { DoorId, getDoorImageSrc } from "../components/EmotionDoorImage";

// Room fallback images, shown when the room video hasn't loaded yet. Served
// from /public so the URLs are stable and can be prefetched from index.html
// (browser fetches them at idle priority, after the doors and JS bundle but
// before the visitor hovers a door open).
const loveImage    = "/rooms/love.webp";
const hopeImage    = "/rooms/hope.webp";
const regretImage  = "/rooms/regret.webp";
const closureImage = "/rooms/closure.webp";
const griefImage   = "/rooms/grief.webp";

export interface RoomDef {
  id: string;
  name: string;
  label: string;
  tagline: string;
  description: string;
  door: DoorId;
  doorImage: string;
  fallbackImage: string | null;
  videoUrl: string;
  palette: {
    bg: string;
    accent: string;
    glow: string;
    text: string;
  };
  visitorCount: number;
  avatarSeeds: string[];
}

export const ROOMS: RoomDef[] = [
  {
    id: "love",
    name: "Love",
    label: "The Room of Love",
    tagline: "I almost said it. A hundred times.",
    description: "for the I love yous you carried home, still folded in your pocket.",
    door: "love",
    doorImage: getDoorImageSrc("love"),
    fallbackImage: loveImage,
    videoUrl: "https://res.cloudinary.com/dofuxlbmq/video/upload/v1781127346/love_zxrvf8.mp4",
    palette: { bg: "#0a0105", accent: "#820307", glow: "#ff6b7a", text: "#ffc088" },
    visitorCount: 128,
    avatarSeeds: ["A", "B", "C", "D", "E"],
  },
  {
    id: "grief",
    name: "Grief",
    label: "The Room of Grief",
    tagline: "I still set the table for two.",
    description: "for the goodbye that never landed, and the room that kept your shape.",
    door: "grief",
    doorImage: getDoorImageSrc("grief"),
    fallbackImage: griefImage,
    videoUrl: "https://res.cloudinary.com/dofuxlbmq/video/upload/v1781534819/Grief_video_hx8uwk.mp4",
    palette: { bg: "#0d0b12", accent: "#4a3d5e", glow: "#9b7ed9", text: "#d1c7dd" },
    visitorCount: 91,
    avatarSeeds: ["F", "G", "H", "I", "J"],
  },
  {
    id: "hope",
    name: "Hope",
    label: "The Room of Hope",
    tagline: "One day you'll read this and laugh.",
    description: "for the futures you whispered to yourself when no one else believed them yet.",
    door: "hope",
    doorImage: getDoorImageSrc("hope"),
    fallbackImage: hopeImage,
    videoUrl: "https://res.cloudinary.com/dofuxlbmq/video/upload/v1781215919/Hope_wv8avz.mp4",
    palette: { bg: "#060400", accent: "#8b5e14", glow: "#ffd166", text: "#ffe8a0" },
    visitorCount: 156,
    avatarSeeds: ["K", "L", "M", "N", "O"],
  },
  {
    id: "regret",
    name: "Regret",
    label: "The Room of Regret",
    tagline: "I should have picked up the phone.",
    description: "for the apology you rehearsed in the shower, and never sent.",
    door: "regret",
    doorImage: getDoorImageSrc("regret"),
    fallbackImage: regretImage,
    videoUrl: "https://res.cloudinary.com/dofuxlbmq/video/upload/v1781215901/Regret_axzl9b.mp4",
    palette: { bg: "#010308", accent: "#0e3a5c", glow: "#4a9abe", text: "#9fd4e8" },
    visitorCount: 74,
    avatarSeeds: ["P", "Q", "R", "S", "T"],
  },
  {
    id: "closure",
    name: "Closure",
    label: "The Room of Closure",
    tagline: "I forgive you. I forgive me.",
    description: "for the letters you finally stopped writing, because you didn't need to anymore.",
    door: "closure",
    doorImage: getDoorImageSrc("closure"),
    fallbackImage: closureImage,
    videoUrl: "https://res.cloudinary.com/dofuxlbmq/video/upload/v1781534772/Closure_video_xtmue4.mp4",
    palette: { bg: "#040a07", accent: "#0a7a5c", glow: "#2dd4a0", text: "#a8ffda" },
    visitorCount: 62,
    avatarSeeds: ["U", "V", "W", "X", "Y"],
  },
];

export const ROOM_MAP: Record<string, RoomDef> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
