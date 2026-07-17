import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Story of Us — An Interactive Cinematic Experience" },
      {
        name: "description",
        content:
          "A premium interactive cinematic birthday experience — memories, voice notes, reasons and a final letter, told as one continuous world.",
      },
      { property: "og:title", content: "The Story of Us" },
      {
        property: "og:description",
        content: "An interactive cinematic birthday experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060a] px-6 text-center text-[#f4efe6]">
      <div className="max-w-xl">
        <p className="mb-6 text-[0.7rem] uppercase tracking-[0.4em] text-[#d9b26a]">
          A cinematic experience
        </p>
        <h1
          className="mb-6 text-6xl font-light leading-none"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          The Story of Us
        </h1>
        <p className="mb-10 text-sm text-white/60">
          An interactive cinematic birthday experience — built with HTML, CSS,
          JavaScript, Three.js, GSAP and Howler.js.
        </p>
        <a
          href="/story/index.html"
          className="inline-block rounded-full border border-[#d9b26a] px-8 py-3 text-xs uppercase tracking-[0.35em] text-[#d9b26a] transition-all hover:bg-[#d9b26a] hover:text-[#1a1408]"
        >
          Enter
        </a>
      </div>
    </div>
  );
}
