export function Placeholder({
  title,
  description,
  params,
}: {
  title: string;
  description?: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="text-micro uppercase tracking-widest text-[var(--text-disabled)]">
        TicketFlow
      </span>
      <h1 className="text-heading-1 text-[var(--text-primary)]">{title}</h1>
      {description ? (
        <p className="max-w-md text-body text-[var(--text-secondary)]">{description}</p>
      ) : null}
      {params && Object.keys(params).length > 0 ? (
        <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] px-3 py-2 font-mono text-mono text-[var(--text-secondary)]">
          {Object.entries(params).map(([key, value]) => (
            <div key={key}>
              {key}: {value ?? "—"}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
