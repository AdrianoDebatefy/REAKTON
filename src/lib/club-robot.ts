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
};

/** Full model is scaled, then shifted down so legs sit below the frame. */
export const CLUB_ROBOT_MODEL = {
  position: [0, -0.72, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1.18,
  targetHeight: 2.1,
};

/** Mouse look via safe wrapper rotation (no bone edits — avoids head stretch). */
export const CLUB_ROBOT_LOOK = {
  maxYaw: 0.22,
  maxPitch: 0.07,
  smooth: 0.1,
};
