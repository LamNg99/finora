interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
        {Math.min((page - 1) * pageSize + 1, total)}–
        {Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onChange(page - 1)} disabled={page === 1}>
          ‹
        </PageBtn>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-7 text-center text-xs"
              style={{ color: "var(--muted)" }}
            >
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              onClick={() => onChange(p as number)}
              active={p === page}
            >
              {p}
            </PageBtn>
          ),
        )}
        <PageBtn
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-sm text-xs font-mono font-semibold transition-colors disabled:opacity-30"
      style={{
        color: active ? "#fff" : "var(--muted)",
        backgroundColor: active ? "var(--accent)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
