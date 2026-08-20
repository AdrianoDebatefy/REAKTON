/** Clip:Clap:Club desktop robot scene — preview behind env flag. */
export const CLUB_ROBOT_BG = "#9e1d23";

/** Local file: public/worlds/humanoid robot 3d model.glb */
export const CLUB_ROBOT_MODEL_FILE = "humanoid robot 3d model.glb";
export const CLUB_ROBOT_MODEL_PATH = `/worlds/${encodeURIComponent(CLUB_ROBOT_MODEL_FILE)}`;

export const CLUB_ROBOT_ENABLED = process.env.NEXT_PUBLIC_CLUB_ROBOT_PREVIEW === "true";

/** Seconds for world image fade once the club world is open. */
export const CLUB_ROBOT_IMAGE_FADE_S = 1.4;

/** Head look limits (radians). */
export const CLUB_ROBOT_MAX_YAW = 0.55;
export const CLUB_ROBOT_MAX_PITCH = 0.28;

/** Bone name fragments to search (Mixamo, Blender, humanoid rigs). */
export const CLUB_ROBOT_HEAD_BONE_HINTS = [
  "head",
  "neck",
  "mixamorighead",
  "mixamorigneck",
  "humanoid",
  "spine2",
  "chest",
];

export const CLUB_ROBOT_CAMERA = {
  position: [0, 1.05, 2.35] as const,
  fov: 36,
  lookAt: [0, 1.15, 0] as const,
};

export const CLUB_ROBOT_MODEL = {
  position: [0, -0.35, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1,
};
