"use client";

import { useEffect, useRef, useState } from "react";
import { sitePath } from "@/lib/site-path";

export function SiteHeader({ active }: { active: "home" | "form-check" | "workouts" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    firstMenuLinkRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header" data-menu-open={menuOpen}>
      <div className="site-header-inner">
        <a href={sitePath("/")} className="site-brand" aria-label="Grt home">
          Grt
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a aria-current={active === "workouts" ? "page" : undefined} data-active={active === "workouts"} href={sitePath("/routines")}>Workouts</a>
          <a aria-current={active === "form-check" ? "page" : undefined} data-active={active === "form-check"} href={sitePath("/form-check")}>Form Check</a>
          <a href={sitePath("/#about")}>About</a>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className="site-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>
      {menuOpen ? (
        <nav id="mobile-navigation" className="site-mobile-menu" aria-label="Mobile navigation">
          <a ref={firstMenuLinkRef} aria-current={active === "workouts" ? "page" : undefined} href={sitePath("/routines")} onClick={closeMenu}>Workouts</a>
          <a aria-current={active === "form-check" ? "page" : undefined} href={sitePath("/form-check")} onClick={closeMenu}>Form Check</a>
          <a href={sitePath("/#about")} onClick={closeMenu}>About</a>
        </nav>
      ) : null}
    </header>
  );
}
