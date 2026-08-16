/** Mobile column slide — matches landing enter (COLUMN_EXIT_S = 2). */
export const MOBILE_COLUMN_SLIDE_S = 2;

/** Return slide uses the same speed as enter. */
export const MOBILE_RETURN_SLIDE_S = MOBILE_COLUMN_SLIDE_S;

export const MOBILE_LABEL_OUT_MS = 720;
export const MOBILE_BACK_TEXT_MS = 1500;
export const MOBILE_COVER_FADE_S = 3;
export const MOBILE_BACK_TOTAL_MS = MOBILE_COVER_FADE_S * 1000;

export const MOBILE_OVERLAY_FADE_S = 0.45;

/** Post-slide reveal on return: 150 % longer than enter (×2.5). */
export const MOBILE_RETURN_REVEAL_FACTOR = 2.5;
export const MOBILE_RETURN_LABEL_IN_MS =
  MOBILE_LABEL_OUT_MS * MOBILE_RETURN_REVEAL_FACTOR;
export const MOBILE_RETURN_OVERLAY_FADE_S =
  MOBILE_OVERLAY_FADE_S * MOBILE_RETURN_REVEAL_FACTOR;
export const MOBILE_RETURN_REVEAL_MS = Math.max(
  MOBILE_RETURN_LABEL_IN_MS,
  MOBILE_RETURN_OVERLAY_FADE_S * 1000
);
