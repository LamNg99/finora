interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface Props {
  groups: FilterGroup[];
  active: Record<string, string>;
  onChange: (key: string, value: string) => void;
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
}

export default function FilterBar({ groups, active, onChange, search, onSearch, searchPlaceholder }: Props) {
  const hasActiveFilter = Object.values(active).some((v) => v !== "");

  function reset() {
    groups.forEach((g) => onChange(g.key, ""));
    onSearch?.("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface2)" }}>
      {onSearch && (
        <>
          <input
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder ?? "Search…"}
            className="text-xs px-2.5 py-1 rounded-sm border outline-none"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
              width: 160,
            }}
          />
          {groups.length > 0 && <div className="w-px h-4 mx-1" style={{ backgroundColor: "var(--border)" }} />}
        </>
      )}
      {groups.map((g, gi) => (
        <div key={g.key} className="flex items-center gap-1.5">
          {gi > 0 && <div className="w-px h-4 mx-1" style={{ backgroundColor: "var(--border)" }} />}
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            {g.label}
          </span>
          <div className="flex gap-0.5">
            {g.options.map((opt) => {
              const isActive = active[g.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange(g.key, isActive ? "" : opt.value)}
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded-sm transition-colors"
                  style={{
                    color: isActive ? "#fff" : "var(--muted)",
                    backgroundColor: isActive ? "var(--accent)" : "transparent",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {(hasActiveFilter || (search && search.length > 0)) && (
        <button
          onClick={reset}
          className="text-xs font-mono ml-auto"
          style={{ color: "var(--muted)" }}
        >
          ✕ clear
        </button>
      )}
    </div>
  );
}
