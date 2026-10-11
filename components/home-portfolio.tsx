"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Cards, type ListingResult } from "@/components/listings";

type Items = ListingResult["items"];

export function HomePortfolio({
  featured,
  latest,
}: {
  featured: Items;
  latest: Items;
}) {
  const [active, setActive] = useState<"featured" | "latest">("featured");
  const featuredTab = useRef<HTMLButtonElement>(null);
  const latestTab = useRef<HTMLButtonElement>(null);
  const selectedTab = active === "featured" ? "featured" : "latest";

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = active === "featured" ? "latest" : "featured";
    setActive(next);
    (next === "featured" ? featuredTab : latestTab).current?.focus();
  }

  const items = active === "featured" ? featured : latest;
  const title = active === "featured" ? "Öne çıkanlar" : "Yeni eklenenler";

  return (
    <div className="home-portfolio-switcher">
      <div
        className="home-portfolio-segments"
        role="tablist"
        aria-label="Portföy ilanları"
      >
        <button
          ref={featuredTab}
          id="home-featured-tab"
          type="button"
          role="tab"
          aria-selected={active === "featured"}
          aria-controls="home-portfolio-panel"
          tabIndex={active === "featured" ? 0 : -1}
          onClick={() => setActive("featured")}
          onKeyDown={onTabKeyDown}
        >
          Öne çıkanlar
          <span>{featured.length}</span>
        </button>
        <button
          ref={latestTab}
          id="home-latest-tab"
          type="button"
          role="tab"
          aria-selected={active === "latest"}
          aria-controls="home-portfolio-panel"
          tabIndex={active === "latest" ? 0 : -1}
          onClick={() => setActive("latest")}
          onKeyDown={onTabKeyDown}
        >
          Yeni eklenenler
          <span>{latest.length}</span>
        </button>
      </div>
      <div
        id="home-portfolio-panel"
        className="home-portfolio-panel"
        role="tabpanel"
        aria-labelledby={
          selectedTab === "featured" ? "home-featured-tab" : "home-latest-tab"
        }
        tabIndex={0}
      >
        {items.length ? (
          <Cards items={items} />
        ) : (
          <p className="quiet home-listings-empty">
            {active === "featured"
              ? "Öne çıkarılan ilanlar burada görünecek."
              : "Yeni ilanlar eklendikçe burada görünecek."}
          </p>
        )}
        <div className="home-portfolio-more">
          <Link
            href={active === "featured" ? "/ilanlar?featured=true" : "/ilanlar"}
          >
            {title} ilanların tümünü gör <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
