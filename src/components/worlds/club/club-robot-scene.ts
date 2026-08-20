import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CLUB_ROBOT_BG,
  CLUB_ROBOT_CAMERA,
  CLUB_ROBOT_LOOK,
  CLUB_ROBOT_MODEL,
  CLUB_ROBOT_MODEL_PATH,
} from "@/lib/club-robot";
import {
  findHeadBone,
  HeadLookRig,
  placeCameraForBust,
  prepareGltfScene,
  refreshSkinnedMeshes,
  wrapAndFitModel,
} from "@/components/worlds/club/club-robot-utils";

function addPlaceholderBust(parent: THREE.Group) {
  const bust = new THREE.Group();
  bust.position.y = 0.55;

  const head = new THREE.Group();
  head.position.y = 0.55;
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.35 })
  );
  headMesh.castShadow = true;
  head.add(headMesh);
  bust.add(head);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 0.75, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.65, roughness: 0.4 })
  );
  torso.position.y = 0.05;
  torso.castShadow = true;
  bust.add(torso);

  parent.add(bust);
  return head;
}

export function mountClubRobotScene(container: HTMLElement): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CLUB_ROBOT_BG);

  const camera = new THREE.PerspectiveCamera(
    CLUB_ROBOT_CAMERA.fov,
    Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
    0.1,
    50
  );
  placeCameraForBust(
    camera,
    CLUB_ROBOT_CAMERA.position,
    CLUB_ROBOT_CAMERA.lookAt,
    CLUB_ROBOT_CAMERA.distanceMultiplier
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  keyLight.position.set(1.5, 2.5, 2.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffb4b4, 0.28);
  fillLight.position.set(-2, 1.8, 1.5);
  scene.add(fillLight);

  const rim = new THREE.DirectionalLight(0xffffff, 0.45);
  rim.position.set(0, 2.2, -1.5);
  scene.add(rim);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let headLook: HeadLookRig | null = null;
  let placeholderHead: THREE.Group | null = null;

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
        CLUB_ROBOT_MODEL.targetHeight,
        CLUB_ROBOT_MODEL.scale,
        CLUB_ROBOT_MODEL.position,
        CLUB_ROBOT_MODEL.rotation
      );
      modelRoot.add(wrapper);
      refreshSkinnedMeshes(wrapper, true);

      const headBone = findHeadBone(gltf.scene);
      if (headBone) {
        headLook = new HeadLookRig(headBone, gltf.scene);
      }
    },
    undefined,
    (error) => {
      console.warn("[club-robot] model load failed:", error);
      placeholderHead = addPlaceholderBust(modelRoot);
    }
  );

  let frameId = 0;
  const animate = () => {
    frameId = window.requestAnimationFrame(animate);

    const yaw = mouse.x * CLUB_ROBOT_LOOK.maxYaw;
    const pitch = mouse.y * CLUB_ROBOT_LOOK.maxPitch;

    if (headLook) {
      headLook.apply(yaw, pitch, CLUB_ROBOT_LOOK.smooth);
    } else if (placeholderHead) {
      placeholderHead.rotation.y = THREE.MathUtils.lerp(
        placeholderHead.rotation.y,
        yaw,
        CLUB_ROBOT_LOOK.smooth
      );
      placeholderHead.rotation.x = THREE.MathUtils.lerp(
        placeholderHead.rotation.x,
        pitch,
        CLUB_ROBOT_LOOK.smooth
      );
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
