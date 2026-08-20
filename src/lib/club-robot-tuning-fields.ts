import type { ClubRobotTuning } from "@/types/content";

export type ClubRobotTuningSlider = {
  key: keyof ClubRobotTuning;
  label: string;
  min: number;
  max: number;
  step: number;
};

export const CLUB_ROBOT_TUNING_SLIDERS: ClubRobotTuningSlider[] = [
  { key: "modelX", label: "Position X", min: -1.5, max: 1.5, step: 0.01 },
  { key: "modelY", label: "Position Y", min: -1.5, max: 0.5, step: 0.01 },
  { key: "modelZ", label: "Position Z", min: -1, max: 1, step: 0.01 },
  { key: "modelScale", label: "Scale", min: 0.5, max: 2.5, step: 0.01 },
  { key: "modelRotY", label: "Rotation Y", min: -3.14, max: 3.14, step: 0.01 },
  { key: "cameraDistance", label: "Kamera Abstand", min: 0.6, max: 2.5, step: 0.01 },
  { key: "cameraPosY", label: "Kamera Hoehe", min: 0.8, max: 2.2, step: 0.01 },
  { key: "cameraLookAtY", label: "Blickpunkt Y", min: 0.8, max: 2.2, step: 0.01 },
  { key: "cameraFov", label: "FOV", min: 18, max: 50, step: 1 },
];
