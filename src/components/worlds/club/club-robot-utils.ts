import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CLUB_ROBOT_HEAD_BONE_EXCLUDE,
  CLUB_ROBOT_HEAD_BONE_PATTERNS,
} from "@/lib/club-robot";

export function listBoneNames(root: THREE.Object3D): string[] {
  const names: string[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Bone) names.push(child.name);
  });
  return names;
}

export function findHeadBone(root: THREE.Object3D): THREE.Bone | null {
  const bones: THREE.Bone[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Bone) bones.push(child);
  });

  for (const pattern of CLUB_ROBOT_HEAD_BONE_PATTERNS) {
    const match = bones.find(
      (bone) => pattern.test(bone.name) && !CLUB_ROBOT_HEAD_BONE_EXCLUDE.test(bone.name)
    );
    if (match) return match;
  }

  return (
    bones.find((bone) => /head/i.test(bone.name) && !CLUB_ROBOT_HEAD_BONE_EXCLUDE.test(bone.name)) ??
    null
  );
}

export class HeadLookRig {
  private readonly headBone: THREE.Bone;
  private readonly skinnedMeshes: THREE.SkinnedMesh[] = [];
  private readonly restRotation: THREE.Euler;
  private readonly yawQuat = new THREE.Quaternion();
  private readonly pitchQuat = new THREE.Quaternion();
  private readonly targetQuat = new THREE.Quaternion();

  constructor(headBone: THREE.Bone, root: THREE.Object3D) {
    this.headBone = headBone;
    root.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) this.skinnedMeshes.push(child);
    });
    this.headBone.updateMatrixWorld(true);
    this.restRotation = this.headBone.rotation.clone();

    if (process.env.NODE_ENV !== "production") {
      console.info("[club-robot] head bone:", this.headBone.name);
    }
  }

  apply(yaw: number, pitch: number, smooth: number) {
    this.yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.pitchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    this.targetQuat
      .setFromEuler(this.restRotation)
      .multiply(this.yawQuat)
      .multiply(this.pitchQuat);

    this.headBone.quaternion.slerp(this.targetQuat, smooth);
    this.headBone.updateMatrixWorld(true);

    for (const mesh of this.skinnedMeshes) {
      mesh.skeleton.update();
    }
  }
}

export function placeCameraForBust(
  camera: THREE.PerspectiveCamera,
  position: readonly [number, number, number],
  lookAt: readonly [number, number, number],
  distanceMultiplier: number
) {
  const target = new THREE.Vector3(...lookAt);
  const base = new THREE.Vector3(...position);
  const offset = base.clone().sub(target);
  const distance = offset.length() * distanceMultiplier;
  camera.position.copy(target).add(offset.normalize().multiplyScalar(distance));
  camera.lookAt(target);
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
