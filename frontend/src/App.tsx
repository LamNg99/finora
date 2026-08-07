import { useEffect, useRef, useState } from "react";
import { NavLink, Routes, Route } from "react-router-dom";
import FortressPage from "@/pages/FortressPage";
import HistoryPage from "@/pages/HistoryPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
  const [infoOpen, setInfoOpen] = useState(false);
  const [totalVisits, setTotalVisits] = useState<number | null>(null);

  useEffect(() => {
    const visited = sessionStorage.getItem("finora_visited");
    const ping = visited
      ? Promise.resolve()
      : fetch("/api/visit", { method: "POST" }).then(() =>
          sessionStorage.setItem("finora_visited", "1"),
        );
    ping
      .then(() => fetch("/api/visits"))
      .then((r) => r.json())
      .then((d) => setTotalVisits(d.total))
      .catch(() => {});
  }, []);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInfoOpen(true)}
              aria-label="Glossary"
              className="w-8 h-8 rounded flex items-center justify-center transition-colors"
              style={{ color: "var(--muted)" }}
            >
              <InfoIcon />
            </button>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded flex items-center justify-center transition-colors"
              style={{ color: "var(--muted)" }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<FortressPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer
        className="mt-16"
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6">
          {/* Brand · credit · visitors */}
          <div className="flex items-center justify-between py-6">
            <span
              className="font-mono font-bold text-sm tracking-tight"
              style={{ color: "var(--accent)" }}
            >
              Finora
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Engineered by{" "}
              <a
                href="https://ngtlam.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:opacity-70 transition-opacity"
                style={{ color: "var(--text)" }}
              >
                Lam
              </a>
            </span>
            {totalVisits !== null ? (
              <span
                className="flex items-center gap-1.5 text-xs font-mono tabular-nums"
                style={{ color: "var(--muted)" }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: "var(--pass)" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: "var(--pass)" }}
                  />
                </span>
                {totalVisits.toLocaleString()}{" "}
                {totalVisits === 1 ? "visitor" : "visitors"}
              </span>
            ) : (
              <span />
            )}
          </div>

          {/* Disclosure */}
          <div
            className="py-5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p
              className="text-xs leading-relaxed"
              style={{
                color: "var(--muted)",
                textAlign: "justify",
                opacity: 0.75,
              }}
            >
              <span
                className="font-mono font-semibold uppercase tracking-widest"
                style={{ opacity: 0.6, marginRight: "0.5rem" }}
              >
                Disclosure —
              </span>
              Nothing here constitutes financial advice or a recommendation to
              buy or sell any security. Fair value estimates, moat ratings, and
              AI-generated theses are experimental outputs — always do your own
              research and consult a qualified adviser before making investment
              decisions.
            </p>
          </div>
        </div>
      </footer>

      {infoOpen && <InfoDialog onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

// ── Info Dialog ───────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "How Finora Works",
    items: [
      {
        term: "Quant Filter",
        def: "The automated math check that runs first. Finora checks whether a stock has a reasonable price-to-earnings ratio, some dividend income, positive free cash flow, and manageable debt. Think of it as a bouncer at the door — only stocks that pass the basic checks move on to the AI.",
      },
      {
        term: "AI Moat Analysis",
        def: "After the quant filter, Finora reads the company's annual report (10-K) filed with the SEC and sends it to an AI. The AI rates the company's durability, management quality, and competitive position — then decides if it belongs in your Inbox.",
      },
      {
        term: "Watchlist",
        def: "Some companies (like new IPOs) don't have enough financial history for the quant filter. They skip straight to the AI analysis and land here, so you can still get an opinion even without the math.",
      },
    ],
  },
  {
    title: "Valuation — Is the Price Right?",
    items: [
      {
        term: "Fair Value",
        def: "An estimate of what a stock is actually worth, based on the cash it generates. If the market price is below fair value, the stock may be a bargain. Finora calculates fair value three ways and averages them.",
      },
      {
        term: "Margin of Safety (MoS)",
        def: "The gap between fair value and the current price, expressed as a percentage. Like buying a $500k house for $400k — that $100k buffer (20%) protects you if your estimate was a little off. Finora considers ≥ 20% undervalued, ≥ −15% fair, and anything worse overvalued.",
      },
      {
        term: "DCF — Discounted Cash Flow",
        def: "A dollar today is worth more than a dollar in 10 years (you could invest it). DCF asks: if this company generates cash every year for the next 10 years, what is all of that cash worth in today's money? Finora projects 10 years at a 9% discount rate.",
      },
      {
        term: "P/FCF × 20",
        def: "If the stock trades at more than 20 times its free cash flow per share, it's historically expensive. Finora uses 20× as a fair multiple — so fair value = 20 × free cash flow per share. Simple but effective.",
      },
      {
        term: "Graham Number",
        def: "Named after Benjamin Graham, Warren Buffett's mentor. A conservative estimate of max fair price using only earnings and book value: √(22.5 × EPS × Book Value per Share). Anything below this price is considered in value territory.",
      },
    ],
  },
  {
    title: "Key Metrics",
    items: [
      {
        term: "P/E Ratio",
        def: "Price-to-Earnings. If a café earns $100k/year and sells for $1.5M, the P/E is 15 — you're paying 15 years of earnings. A high P/E means investors expect fast future growth. A very high P/E can mean the stock is expensive relative to what the company actually earns today.",
      },
      {
        term: "FCF / Free Cash Flow per Share",
        def: "After paying all bills and reinvesting in the business, the cash left over is free cash flow. Per share tells you how much of that falls to each unit of stock. It's the cleanest measure of real profitability — harder to fake than accounting earnings.",
      },
      {
        term: "Dividend Yield",
        def: "The annual dividend payment as a percentage of the stock price. Like a rental yield on an apartment — if a $100 stock pays $4/year, the yield is 4%. A yield that's too high can signal distress (the market thinks the dividend will be cut).",
      },
      {
        term: "D/E — Debt to Equity",
        def: "How much debt a company carries relative to its own capital. If you bought a house with $50k of your money and $150k borrowed, your D/E is 3. High debt is fine in good times but dangerous if business slows down. Finora flags anything above 5× as too risky.",
      },
    ],
  },
  {
    title: "Moat Ratings",
    items: [
      {
        term: "Wide Moat",
        def: "The company has durable competitive advantages that are very hard to erode — a dominant brand, a network effect (think Visa, Google), patented technology, or decades of switching costs. These are the businesses Finora is hunting for.",
      },
      {
        term: "Narrow Moat",
        def: "Real advantages, but less durable or limited in scope. Maybe a regional leader, a niche product, or an advantage that competitors are slowly closing in on.",
      },
      {
        term: "No Moat",
        def: "Competing mainly on price in a crowded market with nothing unique protecting them. Profits are under constant pressure. The AI will likely reject these regardless of how attractive the numbers look today.",
      },
    ],
  },
];

function InfoDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="relative rounded-sm border w-full flex flex-col"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          maxWidth: 680,
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text)" }}
            >
              Glossary
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Plain-English explanations for every term Finora uses.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center"
            style={{ color: "var(--muted)" }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-7">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p
                className="text-xs font-mono font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--accent)" }}
              >
                {section.title}
              </p>
              <div className="flex flex-col gap-4">
                {section.items.map((item) => (
                  <div key={item.term}>
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--text)" }}
                    >
                      {item.term}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.def}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

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

// ── Icons ─────────────────────────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line
        x1="12"
        y1="8"
        x2="12"
        y2="8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
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
