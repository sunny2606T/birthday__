/**
 * Renders the five planet rooms from data.
 * Each renderer is idempotent and adapts to any count of items.
 */
import { photos, videos, voice, timeline, reasons } from "../../assets/media.js";
import { audio } from "../engine/audioManager.js";

const { gsap, Howl } = window;

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// ---------- Animation State Holders ----------
let memoriesInterval = null;
let memoriesFloatingTween = null;
let memoriesTransitionTween = null;

let journeyInterval = null;
let activeJourneyFloatingTween = null;

let reasonsInterval = null;
let reasonsFloatingTween = null;
let reasonsTransitionTween = null;

export function stopAllRoomAnimations() {
  if (memoriesInterval) {
    clearInterval(memoriesInterval);
    memoriesInterval = null;
  }
  if (memoriesFloatingTween) {
    memoriesFloatingTween.kill();
    memoriesFloatingTween = null;
  }
  if (memoriesTransitionTween) {
    memoriesTransitionTween.kill();
    memoriesTransitionTween = null;
  }

  if (journeyInterval) {
    clearInterval(journeyInterval);
    journeyInterval = null;
  }
  if (activeJourneyFloatingTween) {
    activeJourneyFloatingTween.kill();
    activeJourneyFloatingTween = null;
  }

  if (reasonsInterval) {
    clearInterval(reasonsInterval);
    reasonsInterval = null;
  }
  if (reasonsFloatingTween) {
    reasonsFloatingTween.kill();
    reasonsFloatingTween = null;
  }
  if (reasonsTransitionTween) {
    reasonsTransitionTween.kill();
    reasonsTransitionTween = null;
  }
}

// ---------- Memories ----------
export function renderMemories(openModal) {
  const grid = document.getElementById("memoriesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const photoItems = photos.map((item) =>
    typeof item === "string"
      ? { src: item, caption: "", isVideo: false }
      : { ...item, isVideo: false },
  );
  const videoItems = videos.map((item) =>
    typeof item === "string"
      ? { src: item, caption: "", isVideo: true }
      : { ...item, isVideo: true },
  );

  let items = [...photoItems, ...videoItems];

  if (!items.length) {
    items = Array.from({ length: 8 }).map((_, i) => ({
      src: "",
      caption: [
        "Golden hour",
        "The laugh",
        "A movie-like sunset",
        "Rainy window",
        "Somewhere quiet",
        "Us",
        "A silly video clip",
        "Home",
      ][i],
      isVideo: i === 2 || i === 6,
    }));
  }

  // --- Render traditional Grid Items ---
  items.forEach((item, i) => {
    const src = item.src;
    const cap = item.caption || "";
    const isVideo = !!item.isVideo;

    const card = el("figure", "polaroid");
    card.style.setProperty("--r", `${(Math.random() * 6 - 3).toFixed(2)}deg`);
    card.style.setProperty("--tape-r", `${(Math.random() * 8 - 4).toFixed(2)}deg`);

    const img = el("div", "polaroid__img");
    img.style.position = "relative";

    if (src) {
      if (isVideo && item.poster) {
        img.style.backgroundImage = `url(${item.poster})`;
      } else if (!isVideo) {
        img.style.backgroundImage = `url(${src})`;
      } else {
        img.style.background = "#12131a";
      }
    } else {
      img.style.background = `linear-gradient(135deg, hsl(${(i * 47) % 360},30%,25%), hsl(${(i * 47 + 80) % 360},25%,12%))`;
    }

    if (isVideo) {
      const playIcon = el("div", "polaroid__video-icon", "▶");
      playIcon.style.position = "absolute";
      playIcon.style.top = "50%";
      playIcon.style.left = "50%";
      playIcon.style.transform = "translate(-50%, -50%)";
      playIcon.style.width = "48px";
      playIcon.style.height = "48px";
      playIcon.style.background = "rgba(0,0,0,0.6)";
      playIcon.style.borderRadius = "50%";
      playIcon.style.display = "flex";
      playIcon.style.alignItems = "center";
      playIcon.style.justifyContent = "center";
      playIcon.style.color = "#d9b26a";
      playIcon.style.fontSize = "1.2rem";
      playIcon.style.paddingLeft = "4px";
      playIcon.style.boxShadow = "0 0 15px rgba(0,0,0,0.5)";
      img.appendChild(playIcon);
    }

    card.appendChild(img);
    card.appendChild(el("figcaption", "polaroid__cap", cap));

    card.addEventListener("click", () => {
      if (isVideo) {
        openModal(
          src
            ? `<video src="${src}" controls autoplay style="width:100%;max-height:70vh;"></video><p>${cap}</p>`
            : `<div style="aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center;max-width:600px;margin:0 auto;border-radius:6px;color:#d9b26a;padding:2rem;">[Placeholder Video]</div><p>${cap}</p>`,
        );
      } else {
        openModal(
          src
            ? `<img src="${src}" alt="${cap}"><p>${cap}</p>`
            : `<div style="aspect-ratio:1;background:${img.style.background};max-width:600px;margin:0 auto;border-radius:6px;"></div><p>${cap}</p>`,
        );
      }
    });

    grid.appendChild(card);
  });

  // --- Dynamic Mode Controls Setup ---
  const sceneEl = document.getElementById("memoriesScene");
  if (!sceneEl) return;

  let modesContainer = document.getElementById("memoriesModes");
  if (!modesContainer) {
    modesContainer = el("div", "room-modes");
    modesContainer.id = "memoriesModes";
    modesContainer.appendChild(el("button", "mode-btn active", "Cinematic Flow"));
    modesContainer.appendChild(el("button", "mode-btn", "Gallery Grid"));
    sceneEl.insertBefore(modesContainer, grid);
  }

  let slideshowContainer = document.getElementById("memoriesSlideshow");
  if (!slideshowContainer) {
    slideshowContainer = el("div", "slideshow-container");
    slideshowContainer.id = "memoriesSlideshow";
    sceneEl.appendChild(slideshowContainer);
  }

  let currentIndex = 0;
  let isPlaying = true;

  function renderActiveSlide() {
    slideshowContainer.innerHTML = "";

    const wrapper = el("div", "slideshow-card-wrapper");
    const item = items[currentIndex];
    const isVideo = !!item.isVideo;
    const src = item.src;
    const cap = item.caption || "";

    const card = el("figure", "slideshow-card");
    card.style.setProperty("--tape-r", `${(Math.random() * 8 - 4).toFixed(2)}deg`);

    const img = el("div", "slideshow-card__img");

    if (src) {
      if (isVideo) {
        const videoEl = document.createElement("video");
        videoEl.src = src;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.playsInline = true;
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
        img.appendChild(videoEl);
      } else {
        img.style.backgroundImage = `url(${src})`;
      }
    } else {
      img.style.background = `linear-gradient(135deg, hsl(${(currentIndex * 47) % 360},30%,25%), hsl(${(currentIndex * 47 + 80) % 360},25%,12%))`;
      if (isVideo) {
        const playIcon = el("div", "polaroid__video-icon", "▶");
        playIcon.style.position = "absolute";
        playIcon.style.top = "50%";
        playIcon.style.left = "50%";
        playIcon.style.transform = "translate(-50%, -50%)";
        playIcon.style.fontSize = "1.5rem";
        playIcon.style.color = "#d9b26a";
        img.appendChild(playIcon);
      }
    }

    card.appendChild(img);
    card.appendChild(el("figcaption", "slideshow-card__caption", cap));

    card.addEventListener("click", () => {
      if (isVideo) {
        openModal(
          src
            ? `<video src="${src}" controls autoplay style="width:100%;max-height:70vh;"></video><p>${cap}</p>`
            : `<div style="aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center;max-width:600px;margin:0 auto;border-radius:6px;color:#d9b26a;padding:2rem;">[Placeholder Video]</div><p>${cap}</p>`,
        );
      } else {
        openModal(
          src
            ? `<img src="${src}" alt="${cap}"><p>${cap}</p>`
            : `<div style="aspect-ratio:1;background:${img.style.background};max-width:600px;margin:0 auto;border-radius:6px;"></div><p>${cap}</p>`,
        );
      }
    });

    wrapper.appendChild(card);
    slideshowContainer.appendChild(wrapper);

    // Controls
    const controls = el("div", "slideshow-controls");
    const prevBtn = el("button", "slideshow-btn prev-btn", "◀");
    const playBtn = el("button", "slideshow-btn play-btn", isPlaying ? "❚❚" : "▶");
    const nextBtn = el("button", "slideshow-btn next-btn", "▶");

    controls.appendChild(prevBtn);
    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);
    slideshowContainer.appendChild(controls);

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateSlide(-1);
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateSlide(1);
    });
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? "❚❚" : "▶";
      if (isPlaying) {
        startAutoplay();
      } else {
        stopAutoplay();
      }
    });

    // Animate Card in
    memoriesTransitionTween = gsap.fromTo(
      card,
      { scale: 0.8, y: 150, rotation: 12, opacity: 0 },
      {
        scale: 1,
        y: 0,
        rotation: Math.random() * 6 - 3,
        opacity: 1,
        duration: 1.1,
        ease: "elastic.out(1, 0.75)",
        onComplete: () => {
          // Floating animation starts after transition completes
          memoriesFloatingTween = gsap.to(card, {
            y: "+=12",
            rotation: "+=2",
            duration: 3 + Math.random() * 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        },
      },
    );
  }

  function navigateSlide(dir) {
    if (memoriesTransitionTween) memoriesTransitionTween.kill();
    if (memoriesFloatingTween) memoriesFloatingTween.kill();

    const card = slideshowContainer.querySelector(".slideshow-card");
    if (card) {
      gsap.to(card, {
        x: dir > 0 ? -250 : 250,
        y: 80,
        rotation: dir > 0 ? -12 : 12,
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
          currentIndex = (currentIndex + dir + items.length) % items.length;
          renderActiveSlide();
          if (isPlaying) startAutoplay();
        },
      });
    } else {
      currentIndex = (currentIndex + dir + items.length) % items.length;
      renderActiveSlide();
    }
  }

  function startAutoplay() {
    stopAutoplay();
    memoriesInterval = setInterval(() => {
      navigateSlide(1);
    }, 3000);
  }

  function stopAutoplay() {
    if (memoriesInterval) {
      clearInterval(memoriesInterval);
      memoriesInterval = null;
    }
  }

  const buttons = modesContainer.querySelectorAll(".mode-btn");
  const flowBtn = buttons[0];
  const gridBtn = buttons[1];

  flowBtn.onclick = () => {
    flowBtn.classList.add("active");
    gridBtn.classList.remove("active");
    grid.classList.add("hidden");
    slideshowContainer.classList.remove("hidden");
    currentIndex = 0;
    renderActiveSlide();
    isPlaying = true;
    startAutoplay();
  };

  gridBtn.onclick = () => {
    gridBtn.classList.add("active");
    flowBtn.classList.remove("active");
    slideshowContainer.classList.add("hidden");
    grid.classList.remove("hidden");
    stopAllRoomAnimations();
  };

  // Set initial mode: flow
  flowBtn.classList.add("active");
  gridBtn.classList.remove("active");
  grid.classList.add("hidden");
  slideshowContainer.classList.remove("hidden");
  renderActiveSlide();
  startAutoplay();
}

// ---------- Voice ----------
export function renderVoice() {
  const grid = document.getElementById("voiceGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const items = voice.length
    ? voice
    : Array.from({ length: 4 }).map((_, i) => ({
        src: "",
        label: [
          "A late-night voice note",
          "The song you sang",
          "That silly recording",
          "I'm proud of you",
        ][i],
        duration: "—",
      }));
  const players = new Map();
  items.forEach((item) => {
    const src = typeof item === "string" ? item : item.src;
    const label = typeof item === "string" ? "Voice note" : item.label;
    const duration = typeof item === "string" ? "" : item.duration || "";
    const card = el("div", "cassette");
    card.appendChild(
      el("div", "cassette__reels", `<div class="reel"></div><div class="reel"></div>`),
    );
    card.appendChild(el("div", "cassette__label", label));
    card.appendChild(el("div", "cassette__meta", duration));
    let howl = null;
    card.addEventListener("click", () => {
      if (!src) {
        card.classList.toggle("playing");
        return;
      }
      if (!howl) {
        howl = new Howl({
          src: [src],
          html5: true,
          volume: 1,
          onplay: () => {
            audio.duck(0.2);
            card.classList.add("playing");
          },
          onend: () => {
            audio.unduck();
            card.classList.remove("playing");
          },
          onpause: () => {
            audio.unduck();
            card.classList.remove("playing");
          },
        });
        players.set(card, howl);
      }
      howl.playing() ? howl.pause() : howl.play();
    });
    grid.appendChild(card);
  });
}

// ---------- Timeline / My Journey ----------
export function renderTimeline() {
  const track = document.getElementById("journeyTrack") || document.getElementById("timelineTrack");
  if (!track) return;
  track.classList.remove("hidden");
  track.innerHTML = "";

  timeline.forEach((n) => {
    const node = el("div", "tl-node");
    node.appendChild(el("div", "tl-node__year", n.year));
    node.appendChild(el("div", "tl-node__title", n.title));
    node.appendChild(el("div", "tl-node__desc", n.desc));
    track.appendChild(node);
  });

  // Clean up any dynamic modes/motion containers that were previously created
  const modes = document.getElementById("journeyModes");
  if (modes) modes.remove();

  const motion = document.getElementById("journeyMotion");
  if (motion) motion.remove();
}

// ---------- Reasons ----------
export function renderReasons() {
  const wrap = document.getElementById("reasonsTree");
  if (!wrap) return;
  wrap.innerHTML = "";

  reasons.forEach((text, i) => {
    const leaf = el("div", "leaf");
    leaf.appendChild(el("span", "leaf__num", `Reason #${String(i + 1).padStart(2, "0")}`));
    leaf.appendChild(document.createTextNode(text));
    wrap.appendChild(leaf);
  });

  const sceneEl = document.getElementById("reasonsScene");
  if (!sceneEl) return;

  let modesContainer = document.getElementById("reasonsModes");
  if (!modesContainer) {
    modesContainer = el("div", "room-modes");
    modesContainer.id = "reasonsModes";
    modesContainer.appendChild(el("button", "mode-btn active", "Drifting Flow"));
    modesContainer.appendChild(el("button", "mode-btn", "View All"));
    sceneEl.insertBefore(modesContainer, wrap);
  }

  let motionContainer = document.getElementById("reasonsMotion");
  if (!motionContainer) {
    motionContainer = el("div", "reasons-motion-container");
    motionContainer.id = "reasonsMotion";
    sceneEl.appendChild(motionContainer);
  }

  let reasonsIndex = 0;
  let isReasonsPlaying = true;

  function renderActiveReason() {
    motionContainer.innerHTML = "";

    const wrapper = el("div", "reasons-leaf-wrapper");
    const text = reasons[reasonsIndex];

    const card = el("div", "reason-leaf-card");
    card.appendChild(
      el("span", "reason-leaf-num", `Reason #${String(reasonsIndex + 1).padStart(2, "0")}`),
    );
    card.appendChild(el("div", "reason-leaf-text", text));

    card.addEventListener("click", () => {
      navigateReasons(1);
    });

    wrapper.appendChild(card);
    motionContainer.appendChild(wrapper);

    // Controls
    const controls = el("div", "slideshow-controls");
    const prevBtn = el("button", "slideshow-btn prev-btn", "◀");
    const playBtn = el("button", "slideshow-btn play-btn", isReasonsPlaying ? "❚❚" : "▶");
    const nextBtn = el("button", "slideshow-btn next-btn", "▶");

    controls.appendChild(prevBtn);
    controls.appendChild(playBtn);
    controls.appendChild(nextBtn);
    motionContainer.appendChild(controls);

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateReasons(-1);
    });
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigateReasons(1);
    });
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isReasonsPlaying = !isReasonsPlaying;
      playBtn.textContent = isReasonsPlaying ? "❚❚" : "▶";
      if (isReasonsPlaying) {
        startReasonsAutoplay();
      } else {
        stopReasonsAutoplay();
      }
    });

    // Falling in
    reasonsTransitionTween = gsap.fromTo(
      card,
      { y: -300, x: -100, rotation: -45, opacity: 0, scale: 0.7 },
      {
        y: 0,
        x: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
          // Swaying / Floating starts after transition completes
          reasonsFloatingTween = gsap.to(card, {
            y: "+=12",
            x: "+=6",
            rotation: "+=3",
            duration: 3.5 + Math.random() * 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        },
      },
    );
  }

  function navigateReasons(dir) {
    if (reasonsTransitionTween) reasonsTransitionTween.kill();
    if (reasonsFloatingTween) reasonsFloatingTween.kill();

    const card = motionContainer.querySelector(".reason-leaf-card");
    if (card) {
      gsap.to(card, {
        y: 400,
        x: dir > 0 ? 150 : -150,
        rotation: dir > 0 ? 45 : -45,
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        ease: "power2.in",
        onComplete: () => {
          reasonsIndex = (reasonsIndex + dir + reasons.length) % reasons.length;
          renderActiveReason();
          if (isReasonsPlaying) startReasonsAutoplay();
        },
      });
    } else {
      reasonsIndex = (reasonsIndex + dir + reasons.length) % reasons.length;
      renderActiveReason();
    }
  }

  function startReasonsAutoplay() {
    stopReasonsAutoplay();
    reasonsInterval = setInterval(() => {
      navigateReasons(1);
    }, 5500);
  }

  function stopReasonsAutoplay() {
    if (reasonsInterval) {
      clearInterval(reasonsInterval);
      reasonsInterval = null;
    }
  }

  const buttons = modesContainer.querySelectorAll(".mode-btn");
  const flowBtn = buttons[0];
  const gridBtn = buttons[1];

  flowBtn.onclick = () => {
    flowBtn.classList.add("active");
    gridBtn.classList.remove("active");
    wrap.classList.add("hidden");
    motionContainer.classList.remove("hidden");
    reasonsIndex = 0;
    renderActiveReason();
    isReasonsPlaying = true;
    startReasonsAutoplay();
  };

  gridBtn.onclick = () => {
    gridBtn.classList.add("active");
    flowBtn.classList.remove("active");
    motionContainer.classList.add("hidden");
    wrap.classList.remove("hidden");
    stopAllRoomAnimations();
  };

  // Initial view: flow
  flowBtn.classList.add("active");
  gridBtn.classList.remove("active");
  wrap.classList.add("hidden");
  motionContainer.classList.remove("hidden");
  renderActiveReason();
  startReasonsAutoplay();
}
