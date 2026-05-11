// Deterministic per-user pill colors so the same requester always shows up
// in the same hue across queue, archived, and detail views.
//
// Pick from a 10-color palette using a stable hash of the user ID. Two
// requesters with the same hash bucket will collide — acceptable since
// only ~handful of requesters exist in any given admin's view at once.

const USER_PILL_CLASSES: readonly string[] = [
  "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
  "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
  "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200",
  "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  "bg-pink-100 text-pink-700 ring-1 ring-pink-200",
  "bg-fuchsia-100 text-fuchsia-700 ring-1 ring-fuchsia-200",
  "bg-lime-100 text-lime-700 ring-1 ring-lime-200",
] as const;

function hashStringToIndex(str: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Coerce to 32-bit signed int
  }
  return Math.abs(hash) % modulo;
}

export function pillColorForUser(userId: string | null | undefined): string {
  if (!userId) return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
  return USER_PILL_CLASSES[hashStringToIndex(userId, USER_PILL_CLASSES.length)];
}
