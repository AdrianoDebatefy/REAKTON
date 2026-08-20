import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CLUB_ROBOT_BG,
  CLUB_ROBOT_CAMERA,
  CLUB_ROBOT_MAX_PITCH,
  CLUB_ROBOT_MAX_YAW,
  CLUB_ROBOT_MODEL,
  CLUB_ROBOT_MODEL_PATH,
} from "@/lib/club-robot";
import {
  findLookBone,
  prepareGltfScene,
  refreshSkinnedMeshes,
  updateSkeletons,
  wrapAndFitModel,
} from "@/components/worlds/club/club-robot-utils";

function addPlaceholderBust(scene: THREE.Group) {
  const bust = new THREE.Group();
  bust.position.y = 0.2;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.35 })
  );
  head.position.y = 0.55;
  head.castShadow = true;
  bust.add(head);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.65, roughness: 0.4 })
  );
  torso.position.y = 0.05;
  torso.castShadow = true;
  bust.add(torso);

  scene.add(bust);
  return head;
}

export function mountClubRobotScene(container: HTMLElement): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CLUB_ROBOT_BG);
  scene.fog = new THREE.Fog(CLUB_ROBOT_BG, 4, 14);

  const camera = new THREE.PerspectiveCamera(
    CLUB_ROBOT_CAMERA.fov,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.1,
    50
  );
  camera.position.set(...CLUB_ROBOT_CAMERA.position);
  camera.lookAt(...CLUB_ROBOT_CAMERA.lookAt);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(2.5, 4, 3);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xff8a8a, 0.35);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  const rim = new THREE.SpotLight(0xffffff, 0.7, 20, 0.5, 0.55);
  rim.position.set(0, 4.5, 2);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.45 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const robotRoot = new THREE.Group();
  scene.add(robotRoot);

  let lookTarget: THREE.Object3D | null = null;
  let baseRotation = new THREE.Euler();
  const mouse = { x: 0, y: 0 };

  const onPointerMove = (event: PointerEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const loader = new GLTFLoader();
  loader.load(
    CLUB_ROBOT_MODEL_PATH,
    (gltf) => {
      prepareGltfScene(gltf);

      const wrapper = wrapAndFitModel(
        gltf.scene,
        1.65,
        CLUB_ROBOT_MODEL.scale,
        CLUB_ROBOT_MODEL.position,
        CLUB_ROBOT_MODEL.rotation
      );
      robotRoot.add(wrapper);

      const bone = findLookBone(gltf.scene);
      if (bone) {
        lookTarget = bone;
        baseRotation = bone.rotation.clone();
      }

      refreshSkinnedMeshes(wrapper, true);
    },
    undefined,
    (error) => {
      console.warn("[club-robot] model load failed:", error);
      lookTarget = addPlaceholderBust(robotRoot);
    }
  );

  let frameId = 0;
  const animate = () => {
    frameId = window.requestAnimationFrame(animate);

    if (lookTarget) {
      const targetYaw = mouse.x * CLUB_ROBOT_MAX_YAW;
      const targetPitch = mouse.y * CLUB_ROBOT_MAX_PITCH;
      lookTarget.rotation.y = THREE.MathUtils.lerp(
        lookTarget.rotation.y,
        baseRotation.y + targetYaw,
        0.12
      );
      lookTarget.rotation.x = THREE.MathUtils.lerp(
        lookTarget.rotation.x,
        baseRotation.x + targetPitch,
        0.12
      );
      updateSkeletons(robotRoot);
    }

    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  return () => {
    window.cancelAnimationFrame(frameId);
    window.removeEventListener("pointermove", onPointerMove);
    resizeObserver.disconnect();
    renderer.dispose();
    container.removeChild(renderer.domElement);
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) material.dispose();
      }
    });
  };
}
