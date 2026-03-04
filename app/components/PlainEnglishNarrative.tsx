type Props = {
  narrative: string;
};

export function PlainEnglishNarrative({ narrative }: Props) {
  return (
    <section className="px-5 py-3" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
      <div
        className="text-[13px] leading-relaxed"
        style={{
          color: "var(--text-sec)",
          borderLeft: "2px solid var(--color-accent)",
          paddingLeft: "var(--space-sm)",
        }}
      >
        {narrative}
      </div>
    </section>
  );
}
