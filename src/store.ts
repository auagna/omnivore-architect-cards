import type { BungaeProject } from "./types";

const KEY = "omnivore-bungae-list-v1";

export function loadBungaeList(): BungaeProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as BungaeProject[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveBungaeList(list: BungaeProject[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota — large base64 backgrounds across many projects */
  }
}

/** Sort by event date ascending (then by name). */
export function sortByDate(list: BungaeProject[]): BungaeProject[] {
  return [...list].sort((a, b) =>
    a.eventDate === b.eventDate
      ? a.name.localeCompare(b.name)
      : a.eventDate.localeCompare(b.eventDate)
  );
}
