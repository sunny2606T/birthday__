/**
 * The Story of Us — orchestrator.
 * Wires scenes, audio, universe canvas and interactions.
 */
import config, { unlockQuestions, surprisePhotos, friendWishes } from "../config.js";
import { music, finalVideo } from "../assets/media.js";
import { audio } from "./engine/audioManager.js";
import { scenes } from "./engine/sceneManager.js";
import { createUniverse } from "./engine/particleEngine.js";
import {
  renderMemories,
  renderVoice,
  renderTimeline,
  renderReasons,
  stopAllRoomAnimations,
} from "./scenes/rooms.js";

const $ = (sel) => document.querySelector(sel);

// ---------- Universe (persistent canvas) ----------
const universe = createUniverse(document.getElementById("worldCanvas"));

// ---------- Modal helper ----------
const modal = $("#modal");
const modalContent = $("#modalContent");
function openModal(html) {
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" });
  const media = modalContent.querySelector("video");
  if (media) media.play?.().catch(() => {});
}
function closeModal() {
  gsap.to(modal, {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      modal.classList.add("hidden");
      modalContent.innerHTML = "";
    },
  });
}
modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.dataset.close !== undefined) closeModal();
});
$(".modal__close").addEventListener("click", closeModal);

// ---------- Prerender all rooms ----------
renderMemories(openModal);
renderVoice();
renderTimeline();
renderReasons();

// ---------- HUD ----------
const hud = $("#hud");
const progressText = $("#progressText");
const PLANETS = ["memories", "voice", "journey", "reasons", "surprise"];

const PLANET_NAMES = {
  memories: "Memories",
  voice: "Voice",
  journey: "My Journey",
  reasons: "Reasons",
  surprise: "Surprise",
};

const completedPlanets = new Set();
const unlockedPlanets = new Set(["memories"]);

function saveState() {
  // Progress is kept in-memory only so it resets when the page is reloaded or restarted
}

function updatePlanetDOM() {
  PLANETS.forEach((p) => {
    const el = document.querySelector(`.planet[data-planet="${p}"]`);
    if (!el) return;

    if (unlockedPlanets.has(p)) {
      el.classList.remove("locked");
    } else {
      el.classList.add("locked");
    }

    if (completedPlanets.has(p)) {
      el.classList.add("visited");
    } else {
      el.classList.remove("visited");
    }
  });

  progressText.textContent = `${completedPlanets.size} / ${PLANETS.length} Worlds`;
}

// Initial update of planet DOM classes
updatePlanetDOM();

// ---------- Music mapping per scene ----------
const musicMap = {
  introScene: ["intro", music.intro],
  passwordScene: ["intro", music.intro],
  birthScene: ["birth", music.birth],
  galaxyScene: ["galaxy", music.galaxy],
  memoriesScene: ["memories", music.memories],
  voiceScene: ["voice", music.voice],
  journeyScene: ["journey", music.timeline],
  reasonsScene: ["reasons", music.reasons],
  surpriseScene: ["surprise", music.final],
};

let surpriseSequenceRunning = false;
let surpriseMusicTimeout = null;

scenes.onChange((el) => {
  if (!el) return;

  // Stop any active slideshows, carousels, or page transitions when changing scenes
  stopAllRoomAnimations();

  if (surpriseMusicTimeout) {
    clearTimeout(surpriseMusicTimeout);
    surpriseMusicTimeout = null;
  }

  const map = musicMap[el.id];
  if (map) {
    if (el.id === "surpriseScene") {
      audio.stop(); // Stop previous music immediately
    } else {
      audio.play(map[0], map[1]);
    }
  }

    if (el.id === "memoriesScene") {
    renderMemories(openModal);
  } else if (el.id === "journeyScene") {
    renderTimeline();
  } else if (el.id === "reasonsScene") {
    renderReasons();
  }

  if (el.id === "galaxyScene") {
    hud.classList.remove("hidden");
    document.body.style.pointerEvents = "auto";
    surpriseSequenceRunning = false;
  }
});

// ---------- Enter ----------
$("#enterBtn").addEventListener("click", async () => {
  await scenes.goto("introScene");
  runIntro();
});

// ---------- Intro sequence ----------
function runIntro() {
  const lines = document.querySelectorAll("#introScene .intro__line");
  const tl = gsap.timeline({
    onComplete: () => setTimeout(() => scenes.goto("passwordScene"), 1400),
  });
  lines.forEach((line) => {
    tl.to(line, { opacity: 1, y: 0, duration: 2.2, ease: "power2.out" }).to(
      line,
      { opacity: 0, y: -15, duration: 1.8, ease: "power2.in" },
      "+=1.6",
    );
  });
}

// ---------- Password ----------
const pwInput = $("#pwInput");
const pwError = $("#pwError");
function tryPassword() {
  const val = pwInput.value.trim().toLowerCase();
  const correct = (config.password || "").toLowerCase();
  if (val && val === correct) {
    pwError.classList.remove("show");
    doWarpToGalaxy();
  } else {
    pwError.textContent = "The universe doesn't remember that word.";
    pwError.classList.add("show");
    gsap.fromTo(pwInput, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
    setTimeout(() => pwError.classList.remove("show"), 2600);
  }
}
$("#pwBtn").addEventListener("click", tryPassword);
pwInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryPassword();
});

// ---------- Warp → birth → galaxy ----------
async function doWarpToGalaxy() {
  universe.warp(1.8);
  await new Promise((r) => setTimeout(r, 1600));
  await scenes.goto("birthScene");
  const lines = document.querySelectorAll("#birthScene .birth__line");
  const tl = gsap.timeline();
  lines.forEach((line) => {
    tl.to(line, { opacity: 1, duration: 1.8, ease: "power2.out" }).to(
      line,
      { opacity: 0, duration: 1.4, ease: "power2.in" },
      "+=1.8",
    );
  });
  tl.call(() => scenes.goto("galaxyScene"));
}

// ---------- Galaxy planets ----------
document.querySelectorAll(".planet[data-planet]").forEach((planet) => {
  planet.addEventListener("click", () => {
    const key = planet.dataset.planet;

    if (unlockedPlanets.has(key)) {
      if (key === "surprise") {
        startSurpriseSequence();
      } else {
        scenes.goto(`${key}Scene`);
      }
      return;
    }

    const index = PLANETS.indexOf(key);
    if (index > 0) {
      const prevKey = PLANETS[index - 1];
      if (completedPlanets.has(prevKey)) {
        showQuestionPopup(key);
      } else {
        const prevName = PLANET_NAMES[prevKey] || prevKey;
        showQuestionPopup(
          null,
          true,
          `This world is still sleeping.\nComplete '${prevName}' first to awaken it. ❤️`,
        );
      }
    }
  });
});

document.querySelectorAll("[data-back]").forEach((b) => {
  b.addEventListener("click", () => {
    const currentSceneId = scenes.current?.id;
    if (currentSceneId) {
      const planetKey = currentSceneId.replace("Scene", "");
      if (PLANETS.includes(planetKey)) {
        completedPlanets.add(planetKey);
        saveState();
        updatePlanetDOM();
      }
    }
    scenes.goto("galaxyScene");
  });
});

// ---------- Question popup & verification logic ----------
const questionPopup = $("#questionPopup");
const questionText = $("#questionText");
const questionInput = $("#questionInput");
const questionSubmitBtn = $("#questionSubmitBtn");
const questionError = $("#questionError");
const questionCloseBtn = $("#questionCloseBtn");
let currentUnlockingPlanet = null;

function showQuestionPopup(planetKey, isHintOnly = false, hintMessage = "") {
  currentUnlockingPlanet = isHintOnly ? null : planetKey;

  if (isHintOnly) {
    questionText.textContent = hintMessage;
    questionInput.classList.add("hidden");
    questionSubmitBtn.classList.add("hidden");
  } else {
    const qConfig = unlockQuestions[planetKey];
    if (!qConfig) {
      unlockPlanet(planetKey);
      return;
    }
    questionText.textContent = qConfig.question;
    questionInput.value = "";
    questionInput.classList.remove("hidden");
    questionSubmitBtn.classList.remove("hidden");
  }

  questionError.textContent = "";
  questionError.classList.remove("show");

  questionPopup.classList.remove("hidden");
  gsap.fromTo(
    questionPopup,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" },
  );
}

function closeQuestionPopup() {
  gsap.to(questionPopup, {
    opacity: 0,
    scale: 0.9,
    duration: 0.4,
    onComplete: () => {
      questionPopup.classList.add("hidden");
      currentUnlockingPlanet = null;
      // Reset input/button visibility for subsequent standard uses
      questionInput.classList.remove("hidden");
      questionSubmitBtn.classList.remove("hidden");
    },
  });
}

function submitAnswer() {
  if (!currentUnlockingPlanet) return;
  const qConfig = unlockQuestions[currentUnlockingPlanet];
  if (!qConfig) return;

  const userAnswer = questionInput.value.trim().toLowerCase();
  const correctAnswer = qConfig.answer.trim().toLowerCase();

  if (userAnswer === correctAnswer) {
    questionError.classList.remove("show");
    closeQuestionPopup();
    unlockPlanet(currentUnlockingPlanet);
  } else {
    questionError.textContent = "Oops... Try Again ❤️";
    questionError.classList.add("show");

    gsap.fromTo(questionInput, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
    setTimeout(() => {
      questionError.classList.remove("show");
    }, 2600);
  }
}

questionSubmitBtn.addEventListener("click", submitAnswer);
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});
questionCloseBtn.addEventListener("click", closeQuestionPopup);

function unlockPlanet(planetKey) {
  unlockedPlanets.add(planetKey);
  saveState();

  const planetEl = document.querySelector(`.planet[data-planet="${planetKey}"]`);
  if (planetEl) {
    const orb = planetEl.querySelector(".planet__orb");

    const tl = gsap.timeline({
      onComplete: () => {
        updatePlanetDOM();
      },
    });

    tl.to(planetEl, {
      filter: "grayscale(0)",
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    })
      .to(
        orb,
        {
          scale: 1.3,
          boxShadow: "0 0 80px rgba(217, 178, 106, 0.9)",
          duration: 0.6,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
        },
        "-=0.4",
      )
      .to(planetEl, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });
  } else {
    updatePlanetDOM();
  }
}

// ---------- Surprise Cinematic Sequence & Ending ----------
let surpriseCanvas, ctx;
let particles = [];
let animationFrameId = null;
let surpriseCanvasActive = false;
let currentParticleMode = "swirl"; // swirl, float, explode
let shootingStar = null;
let confettiList = [];
let floatingMemoriesTimer = null;

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2 + 1;
    this.color = `rgba(217, 178, 106, ${Math.random() * 0.7 + 0.3})`;
    this.alpha = Math.random() * 0.5 + 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 2 + 0.5;
    this.distance = Math.random() * 400 + 100;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }

  update() {
    if (currentParticleMode === "swirl") {
      this.angle += this.rotSpeed;
      this.distance -= 0.6;
      if (this.distance < 5) this.distance = Math.random() * 400 + 300;
      this.x = window.innerWidth / 2 + Math.cos(this.angle) * this.distance;
      this.y = window.innerHeight / 2 + Math.sin(this.angle) * this.distance;
    } else if (currentParticleMode === "float") {
      this.y -= this.speed * 0.4;
      this.x += Math.sin(this.angle) * 0.3;
      this.angle += 0.02;
      if (this.y < -20) {
        this.y = window.innerHeight + 20;
        this.x = Math.random() * window.innerWidth;
      }
    } else if (currentParticleMode === "explode") {
      this.x += this.vx * 3;
      this.y += this.vy * 3;
      this.alpha -= 0.015;
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#d9b26a";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = -20;
    this.size = Math.random() * 4.5 + 1.5;
    this.color = Math.random() > 0.5 ? "#d9b26a" : "#f2c6d1";
    this.speed = Math.random() * 1.8 + 1.0;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = Math.random() * 0.08 - 0.04;
    this.alpha = Math.random() * 0.4 + 0.6;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }
  update() {
    this.y += this.speed;
    this.x += Math.sin(this.angle) * 0.4;
    this.angle += this.spin;
    this.twinklePhase += 0.05;
    if (this.y > window.innerHeight + 10) {
      this.y = -20;
      this.x = Math.random() * window.innerWidth;
    }
  }
  draw() {
    ctx.save();
    const currentAlpha = this.alpha * (0.7 + Math.sin(this.twinklePhase) * 0.3);
    ctx.globalAlpha = currentAlpha;
    ctx.shadowBlur = this.size * 2.5;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- Celebration Stage Canvas Engine ----------
let celebrationCanvas = null;
let celCtx = null;
let celParticles = [];
let celShockwaves = [];
let celEmitters = [];
let celCanvasActive = false;
let celAnimationFrameId = null;
let celGlowRadius = 0; // Grows during anticipation
let celGlowCenter = { x: 0, y: 0 };

class CelParticle {
  constructor(x, y, role = "blast", options = {}) {
    this.x = x;
    this.y = y;
    this.role = role; // "blast", "fountain", "vortex", "ambient"

    // Core physics
    const angle = options.angle !== undefined ? options.angle : Math.random() * Math.PI * 2;
    const speed = options.speed !== undefined ? options.speed : Math.random() * 8 + 2;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = options.gravity !== undefined ? options.gravity : 0.05;
    this.friction = options.friction !== undefined ? options.friction : 0.98;
    this.alpha = 1.0;
    this.decay = options.decay !== undefined ? options.decay : Math.random() * 0.015 + 0.008;

    // Aesthetic properties
    this.size = options.size !== undefined ? options.size : Math.random() * 3 + 1.2;
    this.baseSize = this.size;

    // Beautiful color palette: warm gold, glowing yellow, sparkling white, rose gold
    const colors = [
      "#ffd700", // Bright gold
      "#d9b26a", // Soft vintage gold
      "#fffaf0", // Warm cream white
      "#f2c6d1", // Champagne pink
      "#ffbe76", // Peach orange glow
      "#ffffff", // Pure diamond white
    ];
    this.color = options.color || colors[Math.floor(Math.random() * colors.length)];

    // Twinkle & Pulsation
    this.twinkleSpeed = Math.random() * 0.15 + 0.05;
    this.twinklePhase = Math.random() * Math.PI * 2;

    // Determine if it should be a majestic 4-point star flare
    this.isFlare =
      options.isFlare !== undefined ? options.isFlare : Math.random() > 0.85 && role === "blast";

    // Vortex-specific fields
    if (role === "vortex") {
      this.targetX = options.targetX;
      this.targetY = options.targetY;
      this.orbitRadius = Math.random() * 120 + 80;
      this.orbitAngle = Math.random() * Math.PI * 2;
      this.orbitSpeed = (Math.random() * 0.08 + 0.04) * (Math.random() > 0.5 ? 1 : -1);
      this.decay = 0.02; // disappear as they reach center
      this.alpha = 0; // fade in
    }
  }

  update() {
    this.twinklePhase += this.twinkleSpeed;

    if (this.role === "vortex") {
      // Spiral inwards toward target
      this.orbitAngle += this.orbitSpeed;
      this.orbitRadius *= 0.96; // pull inwards
      this.x = this.targetX + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = this.targetY + Math.sin(this.orbitAngle) * this.orbitRadius;

      if (this.alpha < 1.0 && this.orbitRadius > 10) {
        this.alpha += 0.08;
      } else if (this.orbitRadius <= 10) {
        this.alpha -= 0.15;
      }
      this.size = (1.0 - this.orbitRadius / 200) * this.baseSize + 0.5;
    } else {
      // Standard ballistic movement
      this.x += this.vx;
      this.y += this.vy;

      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;

      this.alpha -= this.decay;

      // Let size pulsate slightly
      this.size = this.baseSize * (1.0 + Math.sin(this.twinklePhase) * 0.25);
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Premium glow shadow
    ctx.shadowBlur = this.size * 2.5;
    ctx.shadowColor = this.color;

    // Twinkle bright flash effect
    const currentAlpha = Math.sin(this.twinklePhase) > 0.7 ? 1.0 : this.alpha;
    ctx.globalAlpha = currentAlpha;

    if (this.isFlare) {
      // Draw a stunning 4-point magic star flare
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size * 2.8);
      ctx.quadraticCurveTo(this.x, this.y, this.x + this.size * 2.8, this.y);
      ctx.quadraticCurveTo(this.x, this.y, this.x, this.y + this.size * 2.8);
      ctx.quadraticCurveTo(this.x, this.y, this.x - this.size * 2.8, this.y);
      ctx.quadraticCurveTo(this.x, this.y, this.x, this.y - this.size * 2.8);
      ctx.fillStyle = "#ffffff"; // diamond core
      ctx.fill();
    } else {
      // Draw standard beautiful glowing circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    ctx.restore();
  }
}

class CelShockwave {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.radius = options.startRadius || 5;
    this.maxRadius = options.maxRadius || Math.max(window.innerWidth, window.innerHeight) * 0.8;
    this.alpha = 1.0;
    this.speed = options.speed || 12;
    this.lineWidth = options.lineWidth || 4;
    this.color = options.color || "rgba(217, 178, 106, 0.4)";
  }

  update() {
    this.radius += this.speed;
    this.speed *= 0.98; // slight decay in expansion speed
    this.alpha = 1.0 - this.radius / this.maxRadius;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.5, this.lineWidth * this.alpha);
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(217, 178, 106, 0.6)";

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class CelEmitter {
  constructor(x, y, type = "fountain", options = {}) {
    this.x = x;
    this.y = y;
    this.type = type; // "fountain", "ambient"
    this.active = true;
    this.ticks = 0;
    this.duration = options.duration || 180; // duration in frames (3 seconds at 60fps)
    this.rate = options.rate || 2; // how many particles per frame
  }

  update(particlesList) {
    if (!this.active) return;
    this.ticks++;

    if (this.ticks > this.duration) {
      this.active = false;
      return;
    }

    if (this.type === "fountain") {
      // Shoot cold firework stardust upwards
      for (let i = 0; i < this.rate; i++) {
        const spreadAngle = -Math.PI / 2 + (Math.random() * 0.4 - 0.2); // pointing upwards with slight spread
        const speed = Math.random() * 6 + 3;
        particlesList.push(
          new CelParticle(this.x, this.y, "fountain", {
            angle: spreadAngle,
            speed: speed,
            gravity: 0.12, // stronger gravity pulls them down beautifully
            friction: 0.985,
            decay: Math.random() * 0.02 + 0.015,
            size: Math.random() * 2.2 + 0.8,
          }),
        );
      }
    } else if (this.type === "ambient") {
      // Spawns soft background drift rising from the bottom
      if (Math.random() < 0.15) {
        particlesList.push(
          new CelParticle(Math.random() * window.innerWidth, window.innerHeight + 20, "ambient", {
            angle: -Math.PI / 2 + (Math.random() * 0.2 - 0.1),
            speed: Math.random() * 0.6 + 0.2,
            gravity: 0,
            friction: 1.0,
            decay: Math.random() * 0.003 + 0.001,
            size: Math.random() * 1.5 + 0.5,
            color: "rgba(217, 178, 106, 0.25)",
          }),
        );
      }
    }
  }
}

function initCelebrationCanvas() {
  celebrationCanvas = document.getElementById("celebrationCanvas");
  if (!celebrationCanvas) return;

  celCtx = celebrationCanvas.getContext("2d");
  resizeCelebrationCanvas();
  window.addEventListener("resize", resizeCelebrationCanvas);

  celParticles = [];
  celShockwaves = [];
  celEmitters = [];
  celCanvasActive = true;
  celGlowRadius = 0;

  // Set up ambient background floating stars emitter
  celEmitters.push(new CelEmitter(0, 0, "ambient", { duration: 999999, rate: 1 }));

  animateCelebrationCanvas();
}

function resizeCelebrationCanvas() {
  if (!celebrationCanvas) return;
  celebrationCanvas.width = window.innerWidth;
  celebrationCanvas.height = window.innerHeight;
}

function animateCelebrationCanvas() {
  if (!celCanvasActive || !celCtx) return;

  celCtx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);

  // Set additive blending for glowing magic stardust!
  celCtx.globalCompositeOperation = "screen";

  // Draw growing anticipation flare glow
  if (celGlowRadius > 0.1) {
    celCtx.save();
    const grad = celCtx.createRadialGradient(
      celGlowCenter.x,
      celGlowCenter.y,
      0,
      celGlowCenter.x,
      celGlowCenter.y,
      celGlowRadius,
    );
    grad.addColorStop(0, "rgba(255, 230, 160, 0.65)");
    grad.addColorStop(0.3, "rgba(217, 178, 106, 0.35)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    celCtx.fillStyle = grad;
    celCtx.shadowBlur = celGlowRadius * 0.4;
    celCtx.shadowColor = "#d9b26a";
    celCtx.beginPath();
    celCtx.arc(celGlowCenter.x, celGlowCenter.y, celGlowRadius, 0, Math.PI * 2);
    celCtx.fill();
    celCtx.restore();
  }

  // Update and draw emitters
  celEmitters.forEach((e) => e.update(celParticles));

  // Update and draw shockwaves
  celShockwaves = celShockwaves.filter((s) => {
    s.update();
    s.draw(celCtx);
    return s.alpha > 0;
  });

  // Update and draw particles
  celParticles = celParticles.filter((p) => {
    p.update();
    p.draw(celCtx);
    return p.alpha > 0;
  });

  celAnimationFrameId = requestAnimationFrame(animateCelebrationCanvas);
}

function triggerCelebrationAnticipation(centerX, centerY) {
  celGlowCenter = { x: centerX, y: centerY };

  const proxy = { glow: 0 };
  gsap.to(proxy, {
    glow: 90,
    duration: 1.8,
    ease: "sine.in",
    onUpdate: () => {
      celGlowRadius = proxy.glow;
    },
  });

  const spiralInterval = setInterval(() => {
    if (!celCanvasActive) {
      clearInterval(spiralInterval);
      return;
    }
    for (let i = 0; i < 8; i++) {
      celParticles.push(
        new CelParticle(0, 0, "vortex", {
          targetX: centerX,
          targetY: centerY,
          size: Math.random() * 2.5 + 1.2,
          baseSize: Math.random() * 2.5 + 1.2,
        }),
      );
    }
  }, 50);

  setTimeout(() => {
    clearInterval(spiralInterval);
  }, 1800);
}

function triggerPremiumCelebrationBlast(centerX, centerY) {
  gsap.to(window, {
    duration: 0.2,
    onComplete: () => {
      celGlowRadius = 0;
    },
  });

  const blastCount = 280;
  for (let i = 0; i < blastCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 2;
    celParticles.push(
      new CelParticle(centerX, centerY, "blast", {
        angle: angle,
        speed: speed,
        gravity: 0.05,
        friction: 0.975,
        decay: Math.random() * 0.012 + 0.005,
        size: Math.random() * 4.5 + 1.5,
        isFlare: Math.random() > 0.82,
      }),
    );
  }

  celShockwaves.push(
    new CelShockwave(centerX, centerY, {
      speed: 10,
      lineWidth: 5,
      maxRadius: window.innerWidth * 0.7,
    }),
  );
  setTimeout(() => {
    if (celCanvasActive) {
      celShockwaves.push(
        new CelShockwave(centerX, centerY, {
          speed: 15,
          lineWidth: 2,
          maxRadius: window.innerWidth * 0.9,
        }),
      );
    }
  }, 180);
  setTimeout(() => {
    if (celCanvasActive) {
      celShockwaves.push(
        new CelShockwave(centerX, centerY, {
          speed: 7,
          lineWidth: 3,
          maxRadius: window.innerWidth * 0.6,
        }),
      );
    }
  }, 350);

  celEmitters.push(new CelEmitter(centerX, centerY - 20, "fountain", { duration: 210, rate: 3 }));
  celEmitters.push(
    new CelEmitter(centerX - 40, centerY - 10, "fountain", { duration: 160, rate: 2 }),
  );
  celEmitters.push(
    new CelEmitter(centerX + 40, centerY - 10, "fountain", { duration: 160, rate: 2 }),
  );

  const flash = document.createElement("div");
  flash.setAttribute(
    "style",
    `
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(217,178,106,0.9) 40%, rgba(0,0,0,0) 80%);
    opacity: 0;
    z-index: 99;
    pointer-events: none;
  `,
  );
  document.getElementById("celebrationStage").appendChild(flash);

  gsap
    .timeline()
    .to(flash, { opacity: 0.9, duration: 0.12, ease: "power2.out" })
    .to(flash, {
      opacity: 0,
      duration: 1.2,
      ease: "power3.inOut",
      onComplete: () => flash.remove(),
    });
}

function initSurpriseParticles() {
  surpriseCanvas = document.getElementById("surpriseCanvas");
  ctx = surpriseCanvas.getContext("2d");
  resizeSurpriseCanvas();
  window.addEventListener("resize", resizeSurpriseCanvas);

  particles = [];
  confettiList = [];
  currentParticleMode = "swirl";
  surpriseCanvasActive = true;

  for (let i = 0; i < 500; i++) {
    particles.push(
      new Particle(Math.random() * window.innerWidth, Math.random() * window.innerHeight),
    );
  }

  animateSurpriseParticles();
}

function resizeSurpriseCanvas() {
  if (!surpriseCanvas) return;
  surpriseCanvas.width = window.innerWidth;
  surpriseCanvas.height = window.innerHeight;
}

function animateSurpriseParticles() {
  if (!surpriseCanvasActive) return;

  ctx.clearRect(0, 0, surpriseCanvas.width, surpriseCanvas.height);

  drawBackgroundMagic();

  particles.forEach((p, idx) => {
    p.update();
    p.draw();
    if (currentParticleMode === "explode" && p.alpha <= 0) {
      particles[idx] = new Particle(Math.random() * window.innerWidth, window.innerHeight + 10);
      particles[idx].speed = Math.random() * 1.5 + 0.5;
    }
  });

  animationFrameId = requestAnimationFrame(animateSurpriseParticles);
}

let drawBackgroundMagic = () => {
  ctx.save();
  ctx.globalAlpha = 0.12;
  const time = Date.now() * 0.0005;
  for (let i = 0; i < 5; i++) {
    const x = (Math.sin(time + i) * 0.5 + 0.5) * window.innerWidth;
    const y = (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * window.innerHeight;
    const r = 80 + Math.sin(time + i) * 30;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "#d9b26a");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

function triggerExplosion() {
  currentParticleMode = "explode";
  particles.forEach((p) => {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 8 + 4;
    p.vx = Math.cos(angle) * force;
    p.vy = Math.sin(angle) * force;
    p.alpha = 1;
  });
  setTimeout(() => {
    currentParticleMode = "float";
  }, 1000);
}

async function startSurpriseSequence() {
  if (surpriseSequenceRunning) return;
  surpriseSequenceRunning = true;

  document.body.style.pointerEvents = "none";
  hud.classList.add("hidden");

  const surprisePlanet = document.querySelector('.planet[data-planet="surprise"]');
  const orb = surprisePlanet.querySelector(".planet__orb");

  universe.flyToCenter(4);

  gsap.to(surprisePlanet, {
    scale: 2.2,
    y: "-=50",
    duration: 4,
    ease: "power2.inOut",
  });

  gsap.to(orb, {
    scale: 60,
    boxShadow: "0 0 150px 120px rgba(255, 255, 255, 1)",
    duration: 4.2,
    ease: "power3.in",
    onComplete: async () => {
      const whiteFlash = document.getElementById("whiteFlash");
      whiteFlash.style.opacity = "1";
      whiteFlash.style.pointerEvents = "auto";

      await scenes.goto("surpriseScene", { instant: true });

      gsap.set(surprisePlanet, { scale: 1, y: 0 });
      gsap.set(orb, { scale: 1, boxShadow: "" });

      setTimeout(() => {
        playHeartbeatSound();
      }, 200);

      await new Promise((r) => setTimeout(r, 600));

      gsap.to(whiteFlash, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
          whiteFlash.style.pointerEvents = "none";
        },
      });

      initSurpriseParticles();
      await runSurpriseTextSequence();
    },
  });
}

function playHeartbeatSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playThump = (time) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(65, time);
      osc.frequency.exponentialRampToValueAtTime(10, time + 0.2);

      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

      osc.start(time);
      osc.stop(time + 0.21);
    };

    const now = audioCtx.currentTime;
    playThump(now);
    playThump(now + 0.28);
  } catch (err) {
    console.warn("Heartbeat synthesis error:", err);
  }
}

const surpriseTitle = document.getElementById("surpriseTextTitle");
const surpriseDesc = document.getElementById("surpriseTextDesc");
let typingInterval = null;

async function runSurpriseTextSequence() {
  const slides = [
    { title: "For Someone Truly Special...", desc: "" },
    { title: "This universe wasn't built with code.", desc: "" },
    { title: "It was built with memories.", desc: "" },
    { title: "It was built with laughter.", desc: "" },
    { title: "It was built with dreams.", desc: "" },
    { title: "It was built for you.", desc: "" },
  ];

  for (const slide of slides) {
    await showSlideText(slide.title, slide.desc);
    await new Promise((r) => setTimeout(r, 2200));
    await hideSlideText();
    await new Promise((r) => setTimeout(r, 800));
  }

  triggerExplosion();
  startSurpriseSlideshow();
}

function showSlideText(titleText, descText, isHandwritten = false) {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  const textContainer = document.getElementById("surpriseTextContainer");
  return new Promise((res) => {
    surpriseTitle.textContent = "";
    surpriseDesc.innerHTML = descText;

    if (isHandwritten) {
      surpriseDesc.classList.add("surprise-text-handwritten");
      if (textContainer) textContainer.classList.add("quote-card");
    } else {
      surpriseDesc.classList.remove("surprise-text-handwritten");
      if (textContainer) textContainer.classList.remove("quote-card");
    }

    surpriseTitle.style.opacity = "1";
    surpriseDesc.style.opacity = "1";

    if (textContainer) {
      gsap.fromTo(
        textContainer,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: "power2.out" },
      );
    }

    if (!titleText) {
      res();
      return;
    }

    let idx = 0;
    typingInterval = setInterval(() => {
      if (idx < titleText.length) {
        surpriseTitle.textContent += titleText[idx];
        idx++;
      } else {
        clearInterval(typingInterval);
        typingInterval = null;
        res();
      }
    }, 55);
  });
}

function hideSlideText() {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  const textContainer = document.getElementById("surpriseTextContainer");
  return new Promise((res) => {
    if (textContainer) {
      gsap.to(textContainer, {
        opacity: 0,
        scale: 0.95,
        duration: 1.0,
        ease: "power2.inOut",
        onComplete: () => {
          surpriseTitle.textContent = "";
          surpriseDesc.innerHTML = "";
          surpriseDesc.classList.remove("surprise-text-handwritten");
          textContainer.classList.remove("quote-card");
          res();
        },
      });
    } else {
      gsap.to([surpriseTitle, surpriseDesc], {
        opacity: 0,
        duration: 1.2,
        onComplete: () => {
          surpriseTitle.textContent = "";
          surpriseDesc.innerHTML = "";
          surpriseDesc.classList.remove("surprise-text-handwritten");
          res();
        },
      });
    }
  });
}

async function startSurpriseSlideshow() {
  // Start the final music precisely when the photos start displaying
  audio.play("surprise", music.final);

  const slideshow = document.getElementById("surpriseSlideshow");
  const imgEl = document.getElementById("surprisePhotoImg");
  const captionEl = document.getElementById("surprisePhotoCaption");

  slideshow.style.opacity = "1";
  slideshow.style.pointerEvents = "auto";

  const photosList = surprisePhotos.length
    ? surprisePhotos
    : [
        { src: "", caption: "The beautiful day that changed everything." },
        { src: "", caption: "That quiet, shared moment where time stood still." },
        { src: "", caption: "Your beautiful laugh that lights up my whole world." },
        { src: "", caption: "The promise of more starry skies together." },
      ];

  const effects = ["zoom-in", "zoom-out", "pan-left", "pan-right", "rotate", "float", "fade-zoom"];

  let lastEffectIdx = -1;

  for (let i = 0; i < photosList.length; i++) {
    const photo = photosList[i];

    let effectIdx;
    do {
      effectIdx = Math.floor(Math.random() * effects.length);
    } while (effectIdx === lastEffectIdx && effects.length > 1);
    lastEffectIdx = effectIdx;
    const effect = effects[effectIdx];

    if (photo.src) {
      imgEl.style.background = `url("${photo.src}") no-repeat center / cover`;
    } else {
      imgEl.style.backgroundImage = "";
      imgEl.style.background = `linear-gradient(145deg, hsl(${(i * 73) % 360}, 20%, 15%), #05060a)`;
    }

    captionEl.textContent = photo.caption || "";
    captionEl.style.opacity = "0";

    gsap.set(imgEl, { scale: 1, x: 0, y: 0, rotation: 0 });
    gsap.set(slideshow, { opacity: 0 });

    gsap.to(slideshow, { opacity: 1, duration: 1.5, ease: "power2.out" });

    const duration = 5.5;
    if (effect === "zoom-in") {
      gsap.to(imgEl, { scale: 1.15, duration, ease: "power1.out" });
    } else if (effect === "zoom-out") {
      gsap.set(imgEl, { scale: 1.15 });
      gsap.to(imgEl, { scale: 1, duration, ease: "power1.out" });
    } else if (effect === "pan-left") {
      gsap.set(imgEl, { scale: 1.1, x: 15 });
      gsap.to(imgEl, { x: -15, duration, ease: "power1.out" });
    } else if (effect === "pan-right") {
      gsap.set(imgEl, { scale: 1.1, x: -15 });
      gsap.to(imgEl, { x: 15, duration, ease: "power1.out" });
    } else if (effect === "rotate") {
      const rot = Math.random() > 0.5 ? 2 : -2;
      gsap.set(imgEl, { scale: 1.05 });
      gsap.to(imgEl, { rotation: rot, duration, ease: "power1.out" });
    } else if (effect === "float") {
      gsap.set(imgEl, { scale: 1.05 });
      gsap.to(imgEl, { y: -10, duration, ease: "sine.inOut" });
    } else if (effect === "fade-zoom") {
      gsap.set(imgEl, { scale: 0.9 });
      gsap.to(imgEl, { scale: 1.1, duration, ease: "power1.out" });
    }

    gsap.to(captionEl, { opacity: 1, duration: 1.2, delay: 1, ease: "power2.out" });

    await new Promise((r) => setTimeout(r, 4500));

    await new Promise((res) => {
      gsap.to(slideshow, {
        opacity: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: res,
      });
    });
  }

  startSurpriseEnding();
}

async function startSurpriseEnding() {
  const slideshow = document.getElementById("surpriseSlideshow");
  slideshow.style.display = "none";

  triggerShootingStar();
  await new Promise((r) => setTimeout(r, 1500));

  await showSlideText("✨ Happy Birthday Nirmita ✨", "");
  await new Promise((r) => setTimeout(r, 3500));
  await hideSlideText();
  await new Promise((r) => setTimeout(r, 800));

  // --- Display Friends' Wishes ---
  const wishes = friendWishes || [];
  if (wishes.length > 0) {
    await showSlideText(
      "Wishes From Your Loved Ones ✨",
      "A few beautiful words from the people who hold you close in their hearts...",
    );
    await new Promise((r) => setTimeout(r, 4500));
    await hideSlideText();
    await new Promise((r) => setTimeout(r, 800));

    for (let i = 0; i < wishes.length; i++) {
      const wish = wishes[i];
      const formattedWish = `“${wish.message}”\n\n<span class="surprise-text-author">— by ${wish.by}</span>`;
      await showSlideText("", formattedWish, true); // true sets handwritten style font

      const wordsCount = wish.message.split(/\s+/).length;
      const readTime = Math.max(6500, wordsCount * 350 + 1500); // Plenty of reading time!

      await new Promise((r) => setTimeout(r, readTime));
      await hideSlideText();
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // --- Display Interactive Beautiful Letter Envelope ---
  await showSlideText(
    "A Personal Note For You... ✉",
    "Take all the time you need to read this sweet letter.",
  );
  await new Promise((r) => setTimeout(r, 4500));
  await hideSlideText();
  await new Promise((r) => setTimeout(r, 1000));

  const letterOverlay = document.getElementById("surpriseLetterOverlay");
  const letterCard = document.getElementById("surpriseLetterCard");
  const letterScroll = document.getElementById("surpriseLetterScroll");
  const closeBtn = document.getElementById("closeLetterBtn");
  const skipBtn = document.getElementById("skipTypingBtn");

  // Create content spans for typewriter effect
  letterScroll.innerHTML =
    '<span id="surpriseLetterContent"></span><span class="typewriter-caret"></span>';
  const letterContentSpan = document.getElementById("surpriseLetterContent");

  // Reset button states
  closeBtn.style.opacity = "0";
  closeBtn.style.pointerEvents = "none";
  gsap.set(closeBtn, { y: 10 });

  // Reveal letter card beautifully with scale and slide-up GSAP transitions
  letterOverlay.style.pointerEvents = "auto";
  gsap.to(letterOverlay, { opacity: 1, duration: 1.5, ease: "power2.out" });
  gsap.to(letterCard, { scale: 1, y: 0, duration: 1.5, ease: "power3.out" });

  const letterText = config.letter || "Happy Birthday Nirmita!";
  let typingIdx = 0;
  let letterInterval = null;

  // Show skip button
  if (skipBtn) {
    skipBtn.style.display = "block";
    skipBtn.style.opacity = "1";
  }

  // Auto-scroll function
  const scrollLetter = () => {
    letterScroll.scrollTop = letterScroll.scrollHeight;
  };

  const finishTyping = () => {
    if (letterInterval) {
      clearInterval(letterInterval);
      letterInterval = null;
    }
    letterContentSpan.innerHTML = letterText.replace(/\n/g, "<br>");
    scrollLetter();

    // Remove blinking caret indicator
    const caret = letterScroll.querySelector(".typewriter-caret");
    if (caret) caret.remove();

    // Hide skip button
    if (skipBtn) {
      gsap.to(skipBtn, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          skipBtn.style.display = "none";
        },
      });
    }

    // Elegant reveal of the "With Love ♥" button
    closeBtn.style.pointerEvents = "auto";
    gsap.to(closeBtn, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" });
  };

  // Start typewriter ticking
  letterInterval = setInterval(() => {
    if (typingIdx < letterText.length) {
      const char = letterText[typingIdx];
      if (char === "\n") {
        letterContentSpan.innerHTML += "<br>";
      } else {
        letterContentSpan.innerHTML += char;
      }
      typingIdx++;

      // Auto-scroll down smoothly as we type
      if (typingIdx % 3 === 0) {
        scrollLetter();
      }
    } else {
      finishTyping();
    }
  }, 25);

  if (skipBtn) {
    skipBtn.onclick = () => {
      finishTyping();
    };
  }

  // Await close button click, giving her infinite reading time
  await new Promise((resolve) => {
    closeBtn.onclick = () => {
      if (letterInterval) {
        clearInterval(letterInterval);
        letterInterval = null;
      }
      gsap.to(closeBtn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });

      gsap.to(letterOverlay, {
        opacity: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          letterOverlay.style.pointerEvents = "none";
          resolve();
        },
      });
      gsap.to(letterCard, { scale: 0.9, y: 30, duration: 1.2, ease: "power2.inOut" });
    };
  });

  startGrandBirthdayCelebration();
}

function triggerShootingStar() {
  shootingStar = {
    x: window.innerWidth * 0.1,
    y: window.innerHeight * 0.1,
    length: 120,
    speed: 15,
    angle: Math.PI / 6,
    opacity: 1,
  };

  const drawStar = () => {
    if (!shootingStar) return;

    const endX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length;
    const endY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length;

    const grad = ctx.createLinearGradient(shootingStar.x, shootingStar.y, endX, endY);
    grad.addColorStop(0, `rgba(255, 230, 150, ${shootingStar.opacity})`);
    grad.addColorStop(1, "rgba(255, 230, 150, 0)");

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shootingStar.x, shootingStar.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();

    shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
    shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;

    if (shootingStar.x > window.innerWidth || shootingStar.y > window.innerHeight) {
      shootingStar = null;
    } else {
      requestAnimationFrame(drawStar);
    }
  };

  drawStar();
}

function startFloatingMemories() {
  const container = document.getElementById("surpriseScene");

  const memoriesPool = [
    "Your beautiful smile",
    "The way you say my name",
    "Our starry sky conversation",
    "The sweet morning voice note",
    "Laughter in the quiet streets",
    "A perfect ordinary day",
    "The dreams we talked about",
    "Your kindness, your heart",
  ];

  const spawnMemory = () => {
    if (!surpriseCanvasActive) return;

    const div = document.createElement("div");
    div.className = "floating-memory";
    div.textContent = memoriesPool[Math.floor(Math.random() * memoriesPool.length)];

    div.style.position = "absolute";
    div.style.bottom = "-50px";
    div.style.left = `${Math.random() * 80 + 10}%`;
    div.style.fontFamily = "var(--f-display)";
    div.style.fontStyle = "italic";
    div.style.fontSize = `${Math.random() * 0.3 + 1.1}rem`;
    div.style.color = "var(--c-gold-soft)";
    div.style.opacity = "0";
    div.style.pointerEvents = "none";
    div.style.zIndex = "2";
    container.appendChild(div);

    const duration = Math.random() * 8 + 6;
    const rot = Math.random() * 30 - 15;

    gsap
      .timeline({
        onComplete: () => div.remove(),
      })
      .to(div, {
        opacity: Math.random() * 0.1 + 0.12,
        duration: 2,
        ease: "power2.out",
      })
      .to(
        div,
        {
          y: -window.innerHeight - 100,
          rotation: rot,
          duration: duration,
          ease: "linear",
        },
        0,
      )
      .to(
        div,
        {
          opacity: 0,
          duration: 2,
          delay: duration - 2,
          ease: "power2.in",
        },
        0,
      );
  };

  floatingMemoriesTimer = setInterval(spawnMemory, 2000);
  for (let k = 0; k < 4; k++) {
    setTimeout(spawnMemory, Math.random() * 4000);
  }
}

function spawnCelebrationPaperSlip(containerId = "celebrationStage") {
  const stage = document.getElementById(containerId);
  if (!stage) return;

  if (
    containerId === "celebrationStage" &&
    (stage.style.opacity === "0" || window.getComputedStyle(stage).opacity === "0")
  )
    return;

  if (
    containerId === "countdownScene" &&
    (!stage.classList.contains("is-active") || stage.style.display === "none")
  )
    return;

  const slip = document.createElement("div");
  slip.className = "celebration-paper-slip";

  // Hand-written short messages for the cute banners
  const phrases = [
    "Resilient Mind 🧠",
    "Gentle Soul 🌸",
    "Brilliant Wisdom 📚",
    "Quiet Strength 💪",
    "Kindness is Legacy 🕊️",
    "Grace Under Pressure ✨",
    "Inspiring Journey 🧭",
    "Purest Heart 💛",
    "Eloquent Spirit ✒️",
    "Infinite Radiance ☀️",
    "Bold & Dignified 👑",
    "Empowered Queen 👑",
    "Poetic Thinker 💭",
    "An Unstoppable Force 💫",
    "Elegance Personified 🏛️",
  ];

  slip.textContent = phrases[Math.floor(Math.random() * phrases.length)];

  // Elegant transparent bubble style with thin golden border and glow
  slip.setAttribute(
    "style",
    `
    position: absolute;
    bottom: -100px;
    left: ${Math.random() * 80 + 10}%;
    background-color: rgba(217, 178, 106, 0.03);
    border: 1px solid rgba(217, 178, 106, 0.18);
    color: var(--c-gold-soft);
    padding: 8px 18px;
    font-family: var(--f-handwritten);
    font-size: clamp(1rem, 2.1vh, 1.3rem);
    font-weight: 500;
    white-space: nowrap;
    border-radius: 30px;
    box-shadow: 0 0 15px rgba(217, 178, 106, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(4px);
    opacity: 0;
    pointer-events: none;
    z-index: 1;
    text-shadow: 0 0 8px rgba(217, 178, 106, 0.35);
  `,
  );

  stage.appendChild(slip);

  const duration = Math.random() * 12 + 14; // Ultra slow, elegant float of 14-26 seconds
  const swayWidth = Math.random() * 80 - 40;

  gsap
    .timeline({
      onComplete: () => slip.remove(),
    })
    .to(slip, {
      opacity: Math.random() * 0.25 + 0.35, // Very soft opacity so they stay in the background
      duration: 3,
      ease: "power2.out",
    })
    .to(
      slip,
      {
        y: -window.innerHeight - 200,
        x: `+=${swayWidth}`,
        rotation: Math.random() * 20 - 10,
        duration: duration,
        ease: "none",
      },
      0,
    )
    .to(
      slip,
      {
        opacity: 0,
        duration: 3,
        delay: duration - 3,
        ease: "power1.in",
      },
      0,
    );
}

function spawnCelebrationFloatingText(containerId = "celebrationStage") {
  const stage = document.getElementById(containerId);
  if (!stage) return;

  if (
    containerId === "celebrationStage" &&
    (stage.style.opacity === "0" || window.getComputedStyle(stage).opacity === "0")
  )
    return;

  if (
    containerId === "countdownScene" &&
    (!stage.classList.contains("is-active") || stage.style.display === "none")
  )
    return;

  const text = document.createElement("div");
  text.className = "celebration-floating-text";

  const goldenPhrases = [
    "YOUR INNER STRENGTH IS AN UNBREAKABLE ANCHOR",
    "A BEAUTIFUL MIND THAT LIGHTS UP THE DARKEST NIGHTS",
    "THE DEPTH OF YOUR CHARACTER IS A PRICELESS LEGACY",
    "MAY YOUR INTEGRITY AND WISDOM ALWAYS GUIDE YOUR WAY",
    "YOU DESERVE A LIFE AS VIBRANT AND RICH AS YOUR SOUL",
    "SO PROUD OF THE REMARKABLE WOMAN YOU CONTINUOUSLY BECOME",
    "YOUR GENTLE KINDNESS LEAVES A LASTING MARK ON EVERY SOUL",
    "A TESTAMENT TO GRACE, INTELLECT, AND EXTRAORDINARY COURAGE",
    "NEVER FORGET THE TRANSFORMATIVE POWER INSIDE YOU",
    "YOUR LEGACY IS IN THE HEARTS YOU SO GRACEFULLY TOUCH",
  ];

  text.textContent = goldenPhrases[Math.floor(Math.random() * goldenPhrases.length)];

  text.setAttribute(
    "style",
    `
    position: absolute;
    bottom: -60px;
    left: ${Math.random() * 80 + 10}%;
    font-family: var(--f-display);
    font-weight: 300;
    font-size: clamp(0.7rem, 1.4vh, 0.95rem);
    letter-spacing: 0.15em;
    color: var(--c-gold-soft);
    text-shadow: 0 0 12px rgba(217, 178, 106, 0.4);
    opacity: 0;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1;
  `,
  );

  stage.appendChild(text);

  const duration = Math.random() * 12 + 12; // 12-24s slow ascent
  const sway = Math.random() * 80 - 40;

  gsap
    .timeline({
      onComplete: () => text.remove(),
    })
    .to(text, {
      opacity: Math.random() * 0.15 + 0.1,
      duration: 3.5,
      ease: "power2.out",
    })
    .to(
      text,
      {
        y: -window.innerHeight - 120,
        x: `+=${sway}`,
        duration: duration,
        ease: "linear",
      },
      0,
    )
    .to(
      text,
      {
        opacity: 0,
        duration: 3.5,
        delay: duration - 3.5,
        ease: "power2.in",
      },
      0,
    );
}

function startGrandBirthdayCelebration() {
  // Clear any existing ambient background timers to focus completely on final celebration
  if (typeof floatingMemoriesTimer !== "undefined" && floatingMemoriesTimer) {
    clearInterval(floatingMemoriesTimer);
  }

  const stage = document.getElementById("celebrationStage");
  const celebrantImgEl = document.getElementById("celebrationImg");
  const cakeContainer = document.getElementById("birthdayCakeContainer");
  const greeting = document.getElementById("celebrationGreeting");
  const sub = document.getElementById("celebrationSub");
  const prompt = document.getElementById("celebrationPrompt");
  const flames = document.querySelectorAll(".candle-flame");
  const wicks = document.querySelectorAll(".candle-wick");

  // Load her photograph dynamically - fully configurable
  const photoUrl =
    config.celebrationPhoto ||
    (surprisePhotos && surprisePhotos.length > 0 && surprisePhotos[0].src) ||
    "assets/photos/IMG-20251231-WA0029.jpg";
  celebrantImgEl.style.backgroundImage = `url('${photoUrl}')`;

  // Reveal celebration stage & activate celebration canvas
  stage.style.pointerEvents = "auto";
  initCelebrationCanvas();
  gsap.to(stage, { opacity: 1, duration: 1.8, ease: "power2.out" });

  // Start background paper slips and ambient golden text loops
  const slipInterval = setInterval(spawnCelebrationPaperSlip, 2500);
  const textInterval = setInterval(spawnCelebrationFloatingText, 4500);

  // Spawn initial set of background elements immediately for cinematic richness
  for (let i = 0; i < 4; i++) {
    setTimeout(spawnCelebrationPaperSlip, Math.random() * 2000);
    setTimeout(spawnCelebrationFloatingText, Math.random() * 3500);
  }

  // Elegant entry float of Polaroid picture and Cake
  gsap.fromTo(
    "#celebrationFrame",
    { rotation: -15, scale: 0.8, y: 50, opacity: 0 },
    { rotation: -1, scale: 1, y: 0, opacity: 1, duration: 1.8, ease: "back.out(1.5)" },
  );
  gsap.fromTo(
    cakeContainer,
    { scale: 0.5, y: 40, opacity: 0 },
    { scale: 0.68, y: 0, opacity: 1, duration: 1.8, ease: "back.out(1.2)", delay: 0.3 },
  );
  gsap.fromTo(prompt, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, delay: 1.2 });

  let candlesBlown = false;

  const handleCakeClick = (e) => {
    if (!candlesBlown) {
      candlesBlown = true;

      const rect = cakeContainer.getBoundingClientRect();
      const cakeCenterX = rect.left + rect.width / 2;
      const cakeCenterY = rect.top + rect.height / 3;

      // 1. Build up Phase (Anticipation Sensation) - 1.8 seconds
      // Vibrate the cake and photo frame with increasing intensity
      gsap.to(cakeContainer, {
        x: "random(-4, 4)",
        y: "random(-2, 2)",
        duration: 0.05,
        repeat: 35,
        yoyo: true,
        ease: "none",
      });
      gsap.to("#celebrationFrame", {
        x: "random(-2, 2)",
        y: "random(-1, 1)",
        duration: 0.05,
        repeat: 35,
        yoyo: true,
        ease: "none",
      });

      // Wildly flicker and intensify the candle flames
      flames.forEach((flame) => {
        gsap.to(flame, {
          scale: 1.6,
          duration: 0.15,
          repeat: 11,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      // Trigger the swirl vortex stardust drawing inwards
      triggerCelebrationAnticipation(cakeCenterX, cakeCenterY);

      // Fade out current helper prompt
      gsap.to(prompt, { opacity: 0, duration: 0.4 });

      // 2. The Grand Explosion Phase (Occurs after 1.8s build-up)
      setTimeout(() => {
        // Blow out flames physically
        flames.forEach((flame) => {
          gsap.to(flame, { scale: 0, opacity: 0, duration: 0.4, ease: "power2.in" });
        });
        wicks.forEach((wick) => {
          wick.style.backgroundColor = "#222";
        });

        // Continuous falling background stardust (replaces square paper confetti)
        startConfetti();

        // Trigger the spectacular premium radial supernova stardust explosion and fountains
        triggerPremiumCelebrationBlast(cakeCenterX, cakeCenterY);

        // Update helper message
        prompt.innerHTML = "Tap the cake for more magical stardust! ✨🎂";
        gsap.to(prompt, { opacity: 0.85, duration: 1, delay: 1.5 });

        // Reveal grand celebratory title
        gsap.to(greeting, {
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: "elastic.out(1, 0.6)",
        });

        // Reveal soft emotional sub
        gsap.to(sub, {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: "power2.out",
          delay: 0.3,
        });

        // Cascade shooting stars
        for (let s = 0; s < 3; s++) {
          setTimeout(triggerShootingStar, s * 400);
        }
      }, 1800);
    } else {
      // Cake clicked again: launch extra stardust!
      const rect = cakeContainer.getBoundingClientRect();
      const cakeCenterX = rect.left + rect.width / 2;
      const cakeCenterY = rect.top + rect.height / 3;

      // Launch extra stardust particles on the celebration canvas
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 1.5;
        celParticles.push(
          new CelParticle(cakeCenterX, cakeCenterY, "blast", {
            angle: angle,
            speed: speed,
            gravity: 0.06,
            friction: 0.98,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 3.5 + 1.2,
          }),
        );
      }

      // Small secondary shockwave
      celShockwaves.push(
        new CelShockwave(cakeCenterX, cakeCenterY, { speed: 8, lineWidth: 2, maxRadius: 250 }),
      );

      // Soft cake punch recoil
      gsap.fromTo(
        cakeContainer,
        { scale: 0.61 },
        { scale: 0.68, duration: 0.4, ease: "elastic.out(1, 0.3)" },
      );
    }
  };

  cakeContainer.onclick = handleCakeClick;
}

function triggerCakeExplosion(centerX, centerY) {
  triggerPremiumCelebrationBlast(centerX, centerY);
}

function startConfetti() {
  confettiList = [];
  for (let i = 0; i < 150; i++) {
    confettiList.push(new ConfettiParticle());
  }

  const oldDraw = drawBackgroundMagic;
  drawBackgroundMagic = () => {
    oldDraw();
    confettiList = confettiList.filter((c) => {
      c.update();
      c.draw();
      return c.alpha === undefined || c.alpha > 0;
    });
  };
}

async function showConfettiAndEnding() {
  startConfetti();

  await showSlideText(
    "Every star in this little universe tells a story.",
    "Thank you for being the brightest one.",
  );

  surpriseTitle.style.opacity = "1";
  surpriseDesc.style.opacity = "1";
}

// ---------- Mute ----------
$("#muteBtn").addEventListener("click", () => {
  const muted = audio.toggleMute();
  $("#muteBtn").textContent = muted ? "♪̷" : "♪";
});

// ---------- Countdown Management & High-Fidelity Canvas Effects ----------
let countdownMuted = true;
let countdownInterval = null;
let countdownSlipsInterval = null;
let countdownTextsInterval = null;

let countdownCanvas = null;
let cdCtx = null;
let cdParticles = [];
let cdBlastParticles = [];
let cdShockwaves = [];
let cdCanvasActive = false;
let cdAnimationFrameId = null;

function updateCountdownMuteButton() {
  const cdUnmuteIcon = document.getElementById("cdUnmuteIcon");
  const cdUnmuteText = document.getElementById("cdUnmuteText");
  if (countdownMuted) {
    if (cdUnmuteIcon) cdUnmuteIcon.textContent = "🔊";
    if (cdUnmuteText) cdUnmuteText.textContent = "PLAY AMBIENT MUSIC";
  } else {
    if (cdUnmuteIcon) cdUnmuteIcon.textContent = "🔇";
    if (cdUnmuteText) cdUnmuteText.textContent = "MUTE AMBIENT MUSIC";
  }
}

class CDStarParticle {
  constructor(x, y, isBlast = false, angle = 0, speed = 0) {
    this.x = x;
    this.y = y;
    this.isBlast = isBlast;

    if (isBlast) {
      this.size = Math.random() * 4.0 + 1.2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = 0.04;
      this.friction = 0.965;
      this.alpha = 1.0;
      this.decay = Math.random() * 0.009 + 0.005;
      this.color =
        Math.random() > 0.45
          ? `hsla(${(Math.random() * 25 + 35) % 360}, 95%, 75%, 1)` // Gold shimmer
          : `hsla(${(Math.random() * 15 + 345) % 360}, 100%, 85%, 1)`; // Silver-pink sparkle
    } else {
      // Background drifting particles
      this.size = Math.random() * 1.6 + 0.4;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = -(Math.random() * 0.4 + 0.12);
      this.alpha = Math.random() * 0.4 + 0.15;
      this.color = `rgba(217, 178, 106, ${this.alpha})`;
      this.swaySpeed = Math.random() * 0.012 + 0.004;
      this.swayAmt = Math.random() * 0.4 + 0.15;
      this.angle = Math.random() * Math.PI * 2;
    }
  }

  update() {
    if (this.isBlast) {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.alpha -= this.decay;
    } else {
      this.y += this.vy;
      this.x += this.vx + Math.sin(this.angle) * this.swayAmt;
      this.angle += this.swaySpeed;
      if (this.y < -15) {
        this.y = window.innerHeight + 15;
        this.x = Math.random() * window.innerWidth;
      }
    }
  }

  draw() {
    if (this.alpha <= 0) return;
    cdCtx.save();
    cdCtx.globalAlpha = this.alpha;
    if (this.isBlast) {
      cdCtx.shadowBlur = Math.random() > 0.5 ? 14 : 7;
      cdCtx.shadowColor = this.color;
      cdCtx.fillStyle = "#ffffff"; // Diamond core brightness
    } else {
      cdCtx.fillStyle = this.color;
    }
    cdCtx.beginPath();
    cdCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    cdCtx.fill();
    cdCtx.restore();
  }
}

class CDShockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.95;
    this.alpha = 1.0;
    this.speed = 14;
    this.width = 4;
  }

  update() {
    this.radius += this.speed;
    this.speed *= 0.985;
    this.alpha = 1.0 - this.radius / this.maxRadius;
    this.width = Math.max(0.5, 5 * this.alpha);
  }

  draw() {
    if (this.alpha <= 0) return;
    cdCtx.save();
    cdCtx.globalAlpha = this.alpha;
    cdCtx.strokeStyle = `rgba(217, 178, 106, ${this.alpha * 0.7})`;
    cdCtx.lineWidth = this.width;
    cdCtx.shadowBlur = 25;
    cdCtx.shadowColor = "rgba(217, 178, 106, 0.55)";
    cdCtx.beginPath();
    cdCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    cdCtx.stroke();
    cdCtx.restore();
  }
}

function initCountdownCanvas() {
  countdownCanvas = document.getElementById("countdownCanvas");
  if (!countdownCanvas) return;

  cdCtx = countdownCanvas.getContext("2d");
  resizeCountdownCanvas();
  window.addEventListener("resize", resizeCountdownCanvas);

  cdParticles = [];
  cdBlastParticles = [];
  cdShockwaves = [];
  cdCanvasActive = true;

  // Populate background stardust
  for (let i = 0; i < 90; i++) {
    cdParticles.push(
      new CDStarParticle(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight,
        false,
      ),
    );
  }

  animateCountdownCanvas();
}

function resizeCountdownCanvas() {
  if (!countdownCanvas) return;
  countdownCanvas.width = window.innerWidth;
  countdownCanvas.height = window.innerHeight;
}

function animateCountdownCanvas() {
  if (!cdCanvasActive || !cdCtx) return;

  cdCtx.clearRect(0, 0, countdownCanvas.width, countdownCanvas.height);

  // Update background stars
  cdParticles.forEach((p) => {
    p.update();
    p.draw();
  });

  // Update and draw blast particles
  cdBlastParticles = cdBlastParticles.filter((p) => {
    p.update();
    p.draw();
    return p.alpha > 0;
  });

  // Update and draw shockwaves
  cdShockwaves = cdShockwaves.filter((s) => {
    s.update();
    s.draw();
    return s.alpha > 0;
  });

  cdAnimationFrameId = requestAnimationFrame(animateCountdownCanvas);
}

function triggerCountdownSupernova() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 1. Fire multi-layered expanding shockwaves
  cdShockwaves.push(new CDShockwave(centerX, centerY));
  setTimeout(() => {
    if (cdCanvasActive) cdShockwaves.push(new CDShockwave(centerX, centerY));
  }, 200);
  setTimeout(() => {
    if (cdCanvasActive) cdShockwaves.push(new CDShockwave(centerX, centerY));
  }, 420);

  // 2. Blast 220 shimmering golden sparks radially
  const starCount = 220;
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 2.5;
    cdBlastParticles.push(new CDStarParticle(centerX, centerY, true, angle, speed));
  }

  // 3. Ignite screen flash overlay
  const flash = document.createElement("div");
  flash.setAttribute(
    "style",
    `
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(217,178,106,0.95) 45%, rgba(0,0,0,0) 80%);
    opacity: 0;
    z-index: 99;
    pointer-events: none;
  `,
  );
  document.getElementById("countdownScene").appendChild(flash);

  gsap
    .timeline()
    .to(flash, { opacity: 0.95, duration: 0.15, ease: "power2.out" })
    .to(flash, {
      opacity: 0,
      duration: 1.4,
      ease: "power3.inOut",
      onComplete: () => flash.remove(),
    });
}

function initCountdown() {
  const countdownScene = document.getElementById("countdownScene");
  const enterScene = document.getElementById("enterScene");

  if (!config.countdownTarget) {
    // No target set, skip countdown entirely
    countdownScene?.remove();
    scenes.current = enterScene;
    return;
  }

  const targetTime = new Date(config.countdownTarget).getTime();
  const now = Date.now();

  if (isNaN(targetTime) || targetTime <= now) {
    // Target date has already passed, skip countdown
    countdownScene?.remove();
    scenes.current = enterScene;
    return;
  }

  // Countdown is in the future: activate countdown mode!
  countdownScene.classList.add("is-active");
  enterScene.classList.remove("is-active");
  scenes.current = countdownScene;

  // Initialize gorgeous particle canvas
  initCountdownCanvas();

  // Start the background ambient elements for the countdown screen
  countdownSlipsInterval = setInterval(() => spawnCelebrationPaperSlip("countdownScene"), 2800);
  countdownTextsInterval = setInterval(() => spawnCelebrationFloatingText("countdownScene"), 4800);

  // Spawn initial set of elements for visual richness
  for (let i = 0; i < 4; i++) {
    setTimeout(() => spawnCelebrationPaperSlip("countdownScene"), Math.random() * 2500);
    setTimeout(() => spawnCelebrationFloatingText("countdownScene"), Math.random() * 4000);
  }

  const daysEl = document.getElementById("cd-days");
  const hoursEl = document.getElementById("cd-hours");
  const minutesEl = document.getElementById("cd-minutes");
  const secondsEl = document.getElementById("cd-seconds");

  function updateCountdown() {
    const current = Date.now();
    const diff = targetTime - current;

    if (diff <= 0) {
      clearInterval(countdownInterval);
      clearInterval(countdownSlipsInterval);
      clearInterval(countdownTextsInterval);
      triggerCountdownBlast();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);

  // Attach countdown unmute/sound activation click
  const cdUnmuteBtn = document.getElementById("cdUnmuteBtn");

  if (cdUnmuteBtn) {
    cdUnmuteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (countdownMuted) {
        audio.play("countdown", config.countdownMusic || music.countdown);
        countdownMuted = false;
      } else {
        audio.stop();
        countdownMuted = true;
      }
      updateCountdownMuteButton();
    });
  }
  updateCountdownMuteButton();
}

function triggerCountdownBlast() {
  const countdownScene = document.getElementById("countdownScene");
  const enterScene = document.getElementById("enterScene");

  // Play background song or a festive audio track for the transition
  audio.stop();
  // Trigger a spectacular radial supernova canvas blast with shockwaves!
  triggerCountdownSupernova();

  // Shake the entire countdown scene and zoom it out!
  gsap
    .timeline()
    .to(countdownScene, {
      x: () => Math.random() * 24 - 12,
      y: () => Math.random() * 24 - 12,
      duration: 0.05,
      repeat: 22,
      yoyo: true,
    })
    .to(
      countdownScene,
      {
        scale: 1.25,
        filter: "blur(12px)",
        opacity: 0,
        duration: 1.8,
        ease: "power3.inOut",
      },
      0.8,
    )
    .call(
      () => {
        // Stop canvas rendering to release CPU resources
        cdCanvasActive = false;
        if (cdAnimationFrameId) cancelAnimationFrame(cdAnimationFrameId);

        countdownScene.classList.remove("is-active");
        enterScene.classList.add("is-active");
        scenes.current = enterScene;

        countdownScene.style.display = "none";

        gsap.fromTo(
          ".enter__inner",
          { scale: 0.85, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.4, ease: "power2.out" },
        );
      },
      null,
      1.3,
    );
}

// ---------- Kick off with the enter or countdown overlay ----------
initCountdown();

function playDefaultStartingMusic() {
  const currentSceneId = scenes.current?.id;
  if (
    // currentSceneId === "enterScene" ||
    currentSceneId === "introScene" ||
    currentSceneId === "passwordScene"
  ) {
    audio.play("intro", music.intro);
  } else if (currentSceneId === "countdownScene") {
    audio.play("countdown", config.countdownMusic || music.countdown || music.intro);
    countdownMuted = false;
    updateCountdownMuteButton();
  }
}

// Start playing starting music as default on initial user interaction (bypass browser autoplay limits)
const startMusicOnInteraction = () => {
  playDefaultStartingMusic();
  window.removeEventListener("click", startMusicOnInteraction);
  window.removeEventListener("touchstart", startMusicOnInteraction);
};
window.addEventListener("click", startMusicOnInteraction);
window.addEventListener("touchstart", startMusicOnInteraction);

// Try immediate autoplay
try {
  playDefaultStartingMusic();
} catch (e) {
  console.log("Autoplay blocked:", e);
}
