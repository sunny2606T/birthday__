/**
 * Renders the five planet rooms from data.
 * Each renderer is idempotent and adapts to any count of items.
 */
import { photos, videos, voice, timeline, reasons } from "../../assets/media.js";
import { audio } from "../engine/audioManager.js";

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// ---------- Memories ----------
export function renderMemories(openModal) {
  const grid = document.getElementById("memoriesGrid");
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

  items.forEach((item, i) => {
    const src = item.src;
    const cap = item.caption || "";
    const isVideo = !!item.isVideo;

    const card = el("figure", "polaroid");
    card.style.setProperty("--r", `${(Math.random() * 6 - 3).toFixed(2)}deg`);

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
}

// ---------- Voice ----------
export function renderVoice() {
  const grid = document.getElementById("voiceGrid");
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
  track.innerHTML = "";
  timeline.forEach((n) => {
    const node = el("div", "tl-node");
    node.appendChild(el("div", "tl-node__year", n.year));
    node.appendChild(el("div", "tl-node__title", n.title));
    node.appendChild(el("div", "tl-node__desc", n.desc));
    track.appendChild(node);
  });
}

// ---------- Reasons ----------
export function renderReasons() {
  const wrap = document.getElementById("reasonsTree");
  wrap.innerHTML = "";
  reasons.forEach((text, i) => {
    const leaf = el("div", "leaf");
    // leaf.appendChild(el("span", "leaf__num", `Reason #${String(i + 1).padStart(2, "0")}`));
    leaf.appendChild(document.createTextNode(text));
    wrap.appendChild(leaf);
  });
}
