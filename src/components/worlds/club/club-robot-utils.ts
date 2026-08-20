import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
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

export function listBoneNames(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Bone) names.push(child.name);
  });
  return names;
}

export function normalizeRobotMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
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

/** Keep skinned meshes intact — only transform a wrapper group. */
export function wrapAndFitModel(
  model: THREE.Object3D,
  targetHeight: number,
  scaleMultiplier: number,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number]
) {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  const height = Math.max(size.y, 0.001);
  const scale = (targetHeight / height) * scaleMultiplier;
  wrapper.scale.setScalar(scale);
  wrapper.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(wrapper);
  const center = fitted.getCenter(new THREE.Vector3());
  wrapper.position.set(-center.x + position[0], -fitted.min.y + position[1], -center.z + position[2]);
  wrapper.rotation.set(rotation[0], rotation[1], rotation[2]);
  wrapper.updateMatrixWorld(true);

  refreshSkinnedMeshes(wrapper, true);
  return wrapper;
}

export function refreshSkinnedMeshes(root: THREE.Object3D, resetPose = false) {
  root.traverse((child) => {
    if (!(child instanceof THREE.SkinnedMesh)) return;
    child.frustumCulled = false;
    if (resetPose) child.skeleton.pose();
    child.skeleton.update();
    child.updateMatrixWorld(true);
  });
}

export function updateSkeletons(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) child.skeleton.update();
  });
}

export function prepareGltfScene(gltf: GLTF) {
  gltf.scene.updateMatrixWorld(true);
  normalizeRobotMaterials(gltf.scene);

  if (process.env.NODE_ENV !== "production") {
    const bones = listBoneNames(gltf.scene);
    if (bones.length > 0) {
      console.info("[club-robot] rig bones:", bones.join(", "));
    }
  }
}
