import { useEffect, useState } from "react";
import { NavLink, Routes, Route } from "react-router-dom";
import FortressPage from "@/pages/FortressPage";
import HistoryPage from "@/pages/HistoryPage";

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <header
        className="border-b sticky top-0 z-10 backdrop-blur-sm"
        style={{
          borderColor: "var(--border)",
          backgroundColor: dark
            ? "rgba(8,12,20,0.92)"
            : "rgba(240,244,250,0.92)",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <span
              className="font-mono font-bold text-base tracking-tight"
              style={{ color: "var(--accent)" }}
            >
              Finora
            </span>
            <nav className="flex gap-6">
              <HeaderLink to="/">Dashboard</HeaderLink>
              <HeaderLink to="/history">History</HeaderLink>
            </nav>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded flex items-center justify-center transition-colors"
            style={{ color: "var(--muted)" }}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<FortressPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}

function HeaderLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className="text-sm font-medium transition-colors"
      style={({ isActive }) => ({
        color: isActive ? "var(--text)" : "var(--muted)",
      })}
    >
      {children}
    </NavLink>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
