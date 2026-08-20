"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import {
  CLUB_ROBOT_MAX_PITCH,
  CLUB_ROBOT_MAX_YAW,
  CLUB_ROBOT_MODEL,
  CLUB_ROBOT_MODEL_PATH,
} from "@/lib/club-robot";
import { findLookBone, normalizeRobotMaterials } from "@/components/worlds/club/club-robot-utils";

function useMouseLookRef() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return mouse;
}

function PlaceholderBust() {
  const headRef = useRef<THREE.Group>(null);
  const mouse = useMouseLookRef();

  useFrame(() => {
    if (!headRef.current) return;
    headRef.current.rotation.y = THREE.MathUtils.lerp(
      headRef.current.rotation.y,
      mouse.current.x * CLUB_ROBOT_MAX_YAW,
      0.12
    );
    headRef.current.rotation.x = THREE.MathUtils.lerp(
      headRef.current.rotation.x,
      mouse.current.y * CLUB_ROBOT_MAX_PITCH,
      0.12
    );
  });

  return (
    <group position={[0, 0.2, 0]}>
      <group ref={headRef} position={[0, 0.55, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.62, 0.75, 24]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.65} roughness={0.4} />
      </mesh>
      <mesh position={[-0.28, -0.05, 0.08]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.22]} />
        <meshStandardMaterial color="#8e8e8e" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0.28, -0.05, 0.08]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.22, 0.55, 0.22]} />
        <meshStandardMaterial color="#8e8e8e" metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
}

function LoadedRobot({ url }: { url: string }) {
  const lookBoneRef = useRef<THREE.Bone | null>(null);
  const baseRotation = useRef(new THREE.Euler());
  const mouse = useMouseLookRef();
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Object3D;
    normalizeRobotMaterials(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    clone.position.y -= box.min.y;

    const targetHeight = 1.65;
    const scale = targetHeight / Math.max(size.y, 0.001);
    clone.scale.setScalar(scale * CLUB_ROBOT_MODEL.scale);

    lookBoneRef.current = findLookBone(clone);
    if (lookBoneRef.current) {
      baseRotation.current.copy(lookBoneRef.current.rotation);
    }

    return clone;
  }, [scene]);

  useFrame(() => {
    const bone = lookBoneRef.current;
    if (!bone) return;

    const targetYaw = mouse.current.x * CLUB_ROBOT_MAX_YAW;
    const targetPitch = mouse.current.y * CLUB_ROBOT_MAX_PITCH;

    bone.rotation.y = THREE.MathUtils.lerp(
      bone.rotation.y,
      baseRotation.current.y + targetYaw,
      0.12
    );
    bone.rotation.x = THREE.MathUtils.lerp(
      bone.rotation.x,
      baseRotation.current.x + targetPitch,
      0.12
    );
  });

  return (
    <group
      position={[...CLUB_ROBOT_MODEL.position]}
      rotation={[...CLUB_ROBOT_MODEL.rotation]}
    >
      <primitive object={model} />
    </group>
  );
}

export function ClubRobotModel({ modelPath = CLUB_ROBOT_MODEL_PATH }: { modelPath?: string }) {
  if (!modelPath) {
    return <PlaceholderBust />;
  }

  return (
    <Suspense fallback={<PlaceholderBust />}>
      <LoadedRobot url={modelPath} />
    </Suspense>
  );
}

useGLTF.preload(CLUB_ROBOT_MODEL_PATH);
