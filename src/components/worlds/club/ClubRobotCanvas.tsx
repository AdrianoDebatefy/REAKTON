"use client";

import { Component, type ReactNode, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import {
  CLUB_ROBOT_BG,
  CLUB_ROBOT_CAMERA,
  CLUB_ROBOT_MODEL_PATH,
} from "@/lib/club-robot";
import { ClubRobotModel } from "@/components/worlds/club/ClubRobotModel";

class RobotErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ClubRobotScene() {
  return (
    <>
      <color attach="background" args={[CLUB_ROBOT_BG]} />
      <fog attach="fog" args={[CLUB_ROBOT_BG, 4, 14]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.35} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#ff8a8a" />
      <spotLight
        position={[0, 5, 1.5]}
        angle={0.45}
        penumbra={0.6}
        intensity={0.85}
        castShadow
      />
      <RobotErrorBoundary fallback={<ClubRobotModel modelPath="" />}>
        <Suspense fallback={null}>
          <ClubRobotModel modelPath={CLUB_ROBOT_MODEL_PATH} />
        </Suspense>
      </RobotErrorBoundary>
      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.55}
        scale={8}
        blur={2.2}
        far={4}
        color="#000000"
      />
      <Environment preset="city" />
    </>
  );
}

export function ClubRobotCanvas({ className = "" }: { className?: string }) {
  return (
    <div className={`h-full w-full ${className}`} style={{ background: CLUB_ROBOT_BG }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: CLUB_ROBOT_CAMERA.position,
          fov: CLUB_ROBOT_CAMERA.fov,
          near: 0.1,
          far: 50,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(...CLUB_ROBOT_CAMERA.lookAt);
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <ClubRobotScene />
      </Canvas>
    </div>
  );
}
