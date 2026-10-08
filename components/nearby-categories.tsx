"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { nearbyCategories } from "@/lib/nearby";
export function NearbyCategories({
  category,
  onSelect,
}: {
  category: string;
  onSelect: (category: string) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    overflow: false,
    left: false,
    right: false,
  });
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const update = () =>
      setEdges({
        overflow: node.scrollWidth > node.clientWidth + 2,
        left: node.scrollLeft > 2,
        right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
      });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, []);
  const move = (direction: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(120, node.clientWidth * 0.75),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  return (
    <div
      className={`nearby-category-nav${edges.overflow ? " has-overflow" : ""}`}
    >
      <button
        type="button"
        className="nearby-scroll-arrow"
        aria-label="Kategorileri sola kaydır"
        disabled={!edges.left}
        onClick={() => move(-1)}
      >
        <ChevronLeft size={20} />
      </button>
      <div
        className="nearby-tabs"
        ref={track}
        aria-label="Yakın çevre kategorileri"
      >
        {nearbyCategories.map((x) => (
          <button
            type="button"
            key={x}
            aria-pressed={category === x}
            onClick={() => onSelect(x)}
            onFocus={(e) => {
              const node = track.current,
                button = e.currentTarget;
              if (!node) return;
              const a = button.getBoundingClientRect(),
                b = node.getBoundingClientRect();
              if (a.left < b.left) node.scrollBy({ left: a.left - b.left });
              else if (a.right > b.right)
                node.scrollBy({ left: a.right - b.right });
            }}
          >
            {x}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="nearby-scroll-arrow"
        aria-label="Kategorileri sağa kaydır"
        disabled={!edges.right}
        onClick={() => move(1)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
