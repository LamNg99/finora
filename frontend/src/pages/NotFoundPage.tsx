import { Link } from "react-router-dom";

const CHART_W = 300;
const CHART_H = 80;

// A line that rises briefly then crashes to zero — delisted stock
const points: [number, number][] = [
  [0, 55],
  [30, 48],
  [60, 38],
  [90, 42],
  [120, 30],
  [150, 35],
  [180, 20],
  [210, 28],
  [240, 10],
  [270, 32],
  [300, 80],
];

function toPath(pts: [number, number][]) {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
}

function toArea(pts: [number, number][]) {
  return `${toPath(pts)} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
}

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Stock card */}
      <div
        className="rounded-sm border w-full mb-10 overflow-hidden"
        style={{
          maxWidth: 360,
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        {/* Card header */}
        <div className="px-5 pt-5 pb-4 text-left">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span
                className="font-mono font-bold text-2xl tracking-tight"
                style={{ color: "var(--reject)" }}
              >
                ERRR
              </span>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Page Not Found Corp. · NYSE
              </p>
            </div>
            <span
              className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm mt-1"
              style={{
                color: "var(--reject)",
                backgroundColor:
                  "color-mix(in srgb, var(--reject) 12%, transparent)",
              }}
            >
              DELISTED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-3">
            <span
              className="font-mono text-3xl font-bold tabular-nums"
              style={{ color: "var(--text)" }}
            >
              $0.00
            </span>
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: "var(--reject)" }}
            >
              −100.00%
            </span>
          </div>
        </div>

        {/* Flatline chart */}
        <div
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--reject) 4%, var(--surface))",
          }}
        >
          <svg
            width="100%"
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            style={{ display: "block", height: 80 }}
          >
            <defs>
              <linearGradient id="crash-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--reject)"
                  stopOpacity="0.15"
                />
                <stop offset="100%" stopColor="var(--reject)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={toArea(points)} fill="url(#crash-fill)" />
            <path
              d={toPath(points)}
              fill="none"
              stroke="var(--reject)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-3 divide-x divide-[var(--border)] px-0 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {[
            { label: "Market Cap", value: "$0" },
            { label: "Volume", value: "0" },
            { label: "52W High", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-1">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {label}
              </span>
              <span
                className="font-mono text-sm font-semibold tabular-nums mt-0.5"
                style={{ color: "var(--text)" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h1
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--text)" }}
      >
        This page has been delisted
      </h1>
      <p
        className="text-sm mb-8"
        style={{ color: "var(--muted)", maxWidth: 280 }}
      >
        The security you requested no longer trades on this exchange.
      </p>

      <Link
        to="/"
        className="text-sm font-semibold px-5 py-2 rounded-sm transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--accent)", color: "#fff" }}
      >
        Return to Market →
      </Link>
    </div>
  );
}
