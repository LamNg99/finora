import { useState, useRef, useEffect } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  multi?: boolean; // default true — allow selecting multiple values
  dropdown?: boolean; // render as a custom popover dropdown instead of pills
}

interface Props {
  groups: FilterGroup[];
  active: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
}

export default function FilterBar({
  groups,
  active,
  onChange,
  search,
  onSearch,
  searchPlaceholder,
}: Props) {
  const hasActiveFilter =
    Object.values(active).some((v) => v.length > 0) ||
    (search != null && search.length > 0);

  function reset() {
    groups.forEach((g) => onChange(g.key, []));
    onSearch?.("");
  }

  function toggle(key: string, value: string, multi = true) {
    const current = active[key] ?? [];
    if (!multi) {
      onChange(key, current.includes(value) ? [] : [value]);
    } else {
      onChange(
        key,
        current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      );
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface2)",
      }}
    >
      {/* Search */}
      {onSearch && (
        <>
          <div className="relative">
            <input
              type="text"
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder ?? "Search…"}
              className="text-xs px-2.5 py-1 rounded-sm border outline-none pr-6"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: search ? "var(--accent)" : "var(--border)",
                color: "var(--text)",
                width: 180,
              }}
            />
            {search && (
              <button
                onClick={() => onSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs leading-none"
                style={{ color: "var(--muted)" }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {groups.length > 0 && (
            <div
              className="w-px h-5 mx-2"
              style={{ backgroundColor: "var(--text)", opacity: 0.15 }}
            />
          )}
        </>
      )}

      {/* Filter groups */}
      {groups.map((g, gi) => {
        const selected = active[g.key] ?? [];
        const multi = g.multi !== false;

        return (
          <div key={g.key} className="flex items-center gap-1.5">
            {gi > 0 && (
              <div
                className="w-px h-5 mx-2"
                style={{ backgroundColor: "var(--text)", opacity: 0.15 }}
              />
            )}
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--muted)" }}
            >
              {g.label}
            </span>

            {g.dropdown ? (
              <DropdownFilter
                options={g.options}
                selected={selected}
                onChange={(vals) => onChange(g.key, vals)}
              />
            ) : (
              <div className="flex gap-0.5">
                {g.options.map((opt) => {
                  const isActive = selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggle(g.key, opt.value, multi)}
                      className="text-xs font-mono font-semibold px-2 py-0.5 rounded-sm transition-colors"
                      style={{
                        color: isActive ? "#fff" : "var(--muted)",
                        backgroundColor: isActive
                          ? "var(--accent)"
                          : "transparent",
                        border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Clear */}
      <div className="ml-auto">
        {hasActiveFilter && (
          <button
            onClick={reset}
            className="text-xs font-mono px-2 py-0.5 rounded-sm border transition-colors"
            style={{ color: "var(--muted)", borderColor: "var(--border)" }}
          >
            ✕ clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Custom dropdown ─────────────────────────────────────────────────────────

function DropdownFilter({
  options,
  selected,
  onChange,
}: {
  options: FilterOption[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const label =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  const isActive = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-sm transition-colors"
        style={{
          color: isActive ? "#fff" : "var(--muted)",
          backgroundColor: isActive ? "var(--accent)" : "transparent",
          border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            opacity: 0.7,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-sm border overflow-hidden"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            minWidth: "10rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(
                    isSelected
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value],
                  );
                }}
                className="w-full flex items-center justify-between gap-4 px-3 py-2 text-xs font-mono text-left transition-colors"
                style={{
                  color: isSelected ? "var(--accent)" : "var(--text)",
                  backgroundColor: isSelected
                    ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "var(--surface2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    isSelected
                      ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                      : "transparent";
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
