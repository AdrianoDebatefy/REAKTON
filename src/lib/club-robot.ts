/** Clip:Clap:Club desktop robot scene — preview behind env flag. */
export const CLUB_ROBOT_BG = "#9e1d23";

/** Local file: public/worlds/reakton_hires_Robot_Modell.glb */
export const CLUB_ROBOT_MODEL_FILE = "reakton_hires_Robot_Modell.glb";
export const CLUB_ROBOT_MODEL_PATH = `/worlds/${encodeURIComponent(CLUB_ROBOT_MODEL_FILE)}`;

export const CLUB_ROBOT_ENABLED = process.env.NEXT_PUBLIC_CLUB_ROBOT_PREVIEW === "true";

/** Seconds for world image fade once the club world is open. */
export const CLUB_ROBOT_IMAGE_FADE_S = 1.4;

/** Bust framing — upper body like reference (chest up, ~10% screen margin). */
export const CLUB_ROBOT_CAMERA = {
  position: [0, 1.52, 1.02] as const,
  fov: 30,
  lookAt: [0, 1.58, 0] as const,
  /** Pull camera away from lookAt (1.3 = 30% further back). */
  distanceMultiplier: 1.3,
};

/** Full model is scaled, then shifted down so legs sit below the frame. */
export const CLUB_ROBOT_MODEL = {
  position: [0, -0.72, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1.18,
  targetHeight: 2.1,
};

/** Head-only look (upper body stays fixed). */
export const CLUB_ROBOT_LOOK = {
  maxYaw: 0.38,
  maxPitch: 0.16,
  smooth: 0.12,
};

/** Head bone name patterns — most specific first. */
export const CLUB_ROBOT_HEAD_BONE_PATTERNS = [
  /^mixamorighead$/i,
  /^mixamorig:head$/i,
  /head$/i,
  /^head_/i,
  /_head$/i,
];

export const CLUB_ROBOT_HEAD_BONE_EXCLUDE = /neck|spine|chest|humanoid|hips|root|arm|hand|leg|foot|shoulder/i;
