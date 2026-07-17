/**
 * Cross-fading audio manager built on Howler.
 * Gracefully no-ops when a track URL is empty (dev without assets).
 */
const FADE_MS = 1800;

class AudioManager {
  constructor() {
    this.current = null;
    this.currentKey = null;
    this.muted = false;
    this.volume = 0.55;
    this.cache = new Map();
  }

  _load(src) {
    if (!src) return null;
    if (this.cache.has(src)) return this.cache.get(src);
    if (typeof Howl === "undefined") return null;
    const h = new Howl({ src: [src], loop: true, volume: 0 });
    this.cache.set(src, h);
    return h;
  }

  play(key, src) {
    if (this.currentKey === key) return;
    this.currentKey = key;
    const next = this._load(src);
    const prev = this.current;

    if (prev) {
      prev.fade(prev.volume(), 0, FADE_MS);
      setTimeout(() => {
        // Prevent race condition: only pause if this track is still not the current track
        if (prev && prev !== this.current) {
          prev.pause();
        }
      }, FADE_MS + 50);
    }

    if (next) {
      if (!next.playing()) {
        next.volume(0);
        next.play();
      }
      next.fade(next.volume(), this.muted ? 0 : this.volume, FADE_MS);
    }
    this.current = next;
  }

  stop() {
    this.currentKey = null;
    const prev = this.current;
    if (prev) {
      prev.fade(prev.volume(), 0, FADE_MS);
      setTimeout(() => {
        if (prev && prev !== this.current) {
          prev.pause();
        }
      }, FADE_MS + 50);
    }
    this.current = null;
  }

  duck(factor = 0.3) {
    if (!this.current) return;
    this.current.fade(this.current.volume(), this.volume * factor, 400);
  }
  unduck() {
    if (!this.current) return;
    this.current.fade(this.current.volume(), this.muted ? 0 : this.volume, 800);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.current) this.current.fade(this.current.volume(), this.muted ? 0 : this.volume, 400);
    return this.muted;
  }
}

export const audio = new AudioManager();
