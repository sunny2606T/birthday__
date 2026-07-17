/**
 * Scene manager — cinematic transitions between full-screen scenes.
 * All scenes live as siblings in the DOM; we cross-fade opacity
 * with GSAP so the camera (canvas) can persist behind them.
 */
const TRANSITION = 1.1;

class SceneManager {
  constructor() {
    this.current = null;
    this.listeners = new Set();
    this.visited = new Set();
  }

  onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  _emit() { this.listeners.forEach((cb) => cb(this.current)); }

  async goto(id, { instant = false } = {}) {
    const next = document.getElementById(id);
    if (!next) return;
    if (this.current === next) return;

    const prev = this.current;
    if (prev) {
      await new Promise((res) => {
        gsap.to(prev, {
          opacity: 0,
          duration: instant ? 0.01 : TRANSITION * 0.7,
          ease: "power2.inOut",
          onComplete: () => {
            prev.classList.remove("is-active");
            res();
          },
        });
      });
    }

    next.classList.add("is-active");
    gsap.fromTo(
      next,
      { opacity: 0 },
      { opacity: 1, duration: instant ? 0.01 : TRANSITION, ease: "power2.out" }
    );

    this.current = next;
    this.visited.add(id);
    this._emit();
  }
}

export const scenes = new SceneManager();
