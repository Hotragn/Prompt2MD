/**
 * Story index for a section, e.g. "[ 02 / 06 ]  THE MECHANISM". Borrowed
 * structurally from bracket step-counters and all-caps chapter eyebrows seen
 * in current devtool/robotics sites — reworked as our own numbering so the
 * landing page reads as one narrative arc instead of a stack of feature
 * sections.
 */
export function Chapter({ n, total, label }: { n: number; total: number; label: string }) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return (
    <p className="chapter">
      <span className="chapter-index">
        [ {pad(n)} / {pad(total)} ]
      </span>
      <span className="chapter-label">{label}</span>
    </p>
  );
}
