import { sitePath } from "@/lib/site-path";

export function SiteHeader({ active }: { active: "home" | "form-check" | "workouts" }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href={sitePath("/")} className="site-brand" aria-label="Grt home">
          Grt
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a data-active={active === "workouts"} href={sitePath("/routines")}>Workouts</a>
          <a data-active={active === "form-check"} href={sitePath("/form-check")}>Form Check</a>
          <a href={sitePath("/#about")}>About</a>
        </nav>
      </div>
    </header>
  );
}
