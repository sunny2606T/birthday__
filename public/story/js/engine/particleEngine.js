/**
 * Ambient star-field on a single persistent Three.js scene.
 * Camera drifts slowly and reacts to pointer for a "breathing" universe.
 */
import * as THREE from "three";

export function createUniverse(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.0015);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 0, 220);

  // --- Stars ---
  const starCount = 1400;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xd9b26a),
    new THREE.Color(0xa89ad6),
    new THREE.Color(0xf2c6d1),
  ];
  for (let i = 0; i < starCount; i++) {
    const r = 400 + Math.random() * 600;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi) - 200;
    const c = palette[(Math.random() * palette.length) | 0];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(geom, mat);
  scene.add(stars);

  // --- Floating dust (closer, softer) ---
  const dustCount = 300;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 400;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 300;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeom,
    new THREE.PointsMaterial({
      size: 0.9,
      color: 0xd9b26a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  // --- Sizing ---
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // --- Pointer parallax ---
  const target = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 30;
    target.y = (e.clientY / window.innerHeight - 0.5) * 30;
  });

  // --- Loop ---
  const clock = new THREE.Clock();
  let warp = 0;
  let isFlying = false;
  function tick() {
    const dt = clock.getDelta();
    stars.rotation.y += dt * 0.008;
    stars.rotation.x += dt * 0.003;
    dust.rotation.y -= dt * 0.02;
    dust.rotation.z += dt * 0.01;

    if (!isFlying) {
      camera.position.x += (target.x - camera.position.x) * 0.02;
      camera.position.y += (-target.y - camera.position.y) * 0.02;

      if (warp > 0.001) {
        camera.position.z -= warp * dt * 200;
        warp *= 0.94;
        if (camera.position.z < -400) camera.position.z = 220;
      } else {
        camera.position.z += (220 - camera.position.z) * 0.02;
      }
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    warp: (amount = 1) => {
      warp = amount;
    },
    setFog: (density) => {
      scene.fog.density = density;
    },
    flyToCenter: (duration) => {
      isFlying = true;
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 30,
        duration: duration,
        ease: "power2.inOut",
      });
    },
    resetCamera: () => {
      isFlying = false;
      camera.position.set(0, 0, 220);
    },
  };
}
