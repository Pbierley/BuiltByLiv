export const PHASE_COUNT = 4;
export const WEEKS_PER_PHASE = 3;

export function programProgress(startedAt: string | null | undefined, now = Date.now()) {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  const elapsed = Number.isNaN(start) ? 0 : now - start;
  const days = Math.max(0, Math.floor(elapsed / 86_400_000));
  const week = Math.floor(days / 7) + 1;
  const phase = Math.min(PHASE_COUNT, Math.floor((week - 1) / WEEKS_PER_PHASE) + 1);
  return { week, phase };
}

export function phaseWeekRange(position: number) {
  const start = (position - 1) * WEEKS_PER_PHASE + 1;
  return { start, end: start + WEEKS_PER_PHASE - 1 };
}

export function memberLocked(
  phasePosition: number | null | undefined,
  viewer: { role: string; currentPhase: number },
) {
  return (
    viewer.role !== "admin" &&
    phasePosition != null &&
    phasePosition > viewer.currentPhase
  );
}
