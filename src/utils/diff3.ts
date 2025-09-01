/**
 * Basic 3-way merge utility for text content.
 * If only one side diverges from base, returns the diverged version.
 * If both diverge but are equal, returns that value.
 * Otherwise returns a conflict-marked text similar to Git merge markers.
 * Comments are written in English as required.
 */
export interface MergeResult {
  text: string;
  hadConflict: boolean;
}

function isEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "") === (b ?? "");
}

export function merge3(
  base: string | null | undefined,
  theirs: string | null | undefined,
  yours: string | null | undefined,
  options?: { labelTheirs?: string; labelYours?: string }
): MergeResult {
  const baseText = base ?? "";
  const theirsText = theirs ?? "";
  const yoursText = yours ?? "";

  // Fast paths
  if (isEqual(theirsText, baseText) && !isEqual(yoursText, baseText)) {
    return { text: yoursText, hadConflict: false };
  }
  if (isEqual(yoursText, baseText) && !isEqual(theirsText, baseText)) {
    return { text: theirsText, hadConflict: false };
  }
  if (isEqual(theirsText, yoursText)) {
    return { text: yoursText, hadConflict: false };
  }

  // Conflict case: mark with conflict markers
  const leftLabel = options?.labelYours ?? "yours";
  const rightLabel = options?.labelTheirs ?? "theirs";
  const conflictText = [
    "<<<<<<< " + leftLabel,
    yoursText,
    "=======",
    theirsText,
    ">>>>>>> " + rightLabel,
  ].join("\n");
  return { text: conflictText, hadConflict: true };
}


