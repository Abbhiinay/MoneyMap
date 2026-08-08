"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CARD_GAP = 24;
const SWIPE_THRESHOLD = 50;
const CARD_WIDTH_DESKTOP = 320;
const CARD_MIN_WIDTH = 280;

const reviews = [
  {
    name: "Praveen Mudavath",
    role: "Student",
    review: "Spendora helped me track my expenses easily.",
    avatar: "/avatars/user1.jpg",
  },
  {
    name: "Aditya",
    role: "Software Engineer",
    review: "Clean UI and powerful insights. Love the analytics.",
    avatar: "/avatars/user2.jpg",
  },
  {
    name: "Vaishali",
    role: "Developer",
    review: "One of the best expense trackers I've used.",
    avatar: "/avatars/user3.jpg",
  },
  {
    name: "Hasini",
    role: "Designer",
    review: "Beautiful design and very easy to use.",
    avatar: "/avatars/user4.jpg",
  },
];

function getInitials(name: string, role: string) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return role.slice(0, 2).toUpperCase();
}

export default function ReviewsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex(() => (index + reviews.length) % reviews.length);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const cardWidth =
    containerWidth > 0 && containerWidth < 400
      ? Math.max(CARD_MIN_WIDTH, containerWidth - 48)
      : CARD_WIDTH_DESKTOP;

  const translateX =
    containerWidth > 0
      ? containerWidth / 2 -
        (activeIndex * (cardWidth + CARD_GAP) + cardWidth / 2)
      : 0;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden py-4 md:py-8"
      style={{ minHeight: 280 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-start gap-6 transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {reviews.map((r, i) => {
          const isActive = i === activeIndex;
          const isLeft = i < activeIndex;
          const isRight = i > activeIndex;

          let scale = 0.8;
          let opacity = 0.5;
          let rotateY = 0;
          let zIndex = 0;
          let shadow = "";

          if (isActive) {
            scale = 1;
            opacity = 1;
            zIndex = 10;
            shadow = "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(16,185,129,0.1)";
          } else if (isLeft) {
            rotateY = 12;
          } else if (isRight) {
            rotateY = -12;
          }

          return (
            <div
              key={i}
              className="flex flex-shrink-0 items-stretch transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                width: cardWidth,
                transform: `scale(${scale}) perspective(800px) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
                boxShadow: shadow,
              }}
            >
              <div
                className="flex w-full flex-col items-center rounded-2xl border border-white/20 bg-white/70 p-6 text-center shadow-xl transition-all duration-300 hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/5 dark:border-slate-700/50 dark:bg-slate-800/60 dark:backdrop-blur-xl"
                style={{ minHeight: 240 }}
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white/50 dark:bg-slate-700 dark:ring-slate-600/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = el.nextElementSibling;
                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                    }}
                  />
                  <span
                    className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-slate-600 dark:text-slate-300"
                    aria-hidden
                    style={{ display: "none" }}
                  >
                    {getInitials(r.name, r.role)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {r.name || r.role}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.role}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  &ldquo;{r.review}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots for mobile / indicator */}
      <div className="mt-6 flex justify-center gap-2">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to review ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 bg-emerald-500"
                : "w-2 bg-slate-300 dark:bg-slate-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
