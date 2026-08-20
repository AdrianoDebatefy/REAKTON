import * as THREE from "three";
import { CLUB_ROBOT_HEAD_BONE_HINTS } from "@/lib/club-robot";

export function findLookBone(root: THREE.Object3D): THREE.Bone | null {
  const hints = CLUB_ROBOT_HEAD_BONE_HINTS.map((h) => h.toLowerCase());
  let match: THREE.Bone | null = null;

  root.traverse((child) => {
    if (match || !(child instanceof THREE.Bone)) return;
    const name = child.name.toLowerCase();
    if (hints.some((hint) => name.includes(hint))) {
      match = child;
    }
  });

  return match;
}

export function normalizeRobotMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      material.side = THREE.FrontSide;
      if ("metalness" in material && typeof material.metalness === "number") {
        material.metalness = Math.min(material.metalness, 0.85);
      }
      if ("roughness" in material && typeof material.roughness === "number") {
        material.roughness = Math.max(material.roughness, 0.35);
      }
    }
  });
}
