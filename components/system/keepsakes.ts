/**
 * Voice keepsakes — the actual sound of a moment.
 *
 * A transcription captures the words; a keepsake keeps the *sound*: a laugh, a
 * voice, rain on a roof. Those are irreplaceable decades later, so the audio is
 * stored as the original recording, never processed.
 *
 * Storage is local-first (IndexedDB), which suits blobs far better than
 * localStorage: real recordings are far too large for a synchronous string
 * store, and IndexedDB keeps them off the main thread. Each recording is stored
 * whole and referenced from a page by id, so a page can carry several.
 *
 * Cloud upload (the `memory-media` storage bucket) is deliberately not wired
 * yet: audio is the most sensitive thing a person can record, so it should only
 * leave the device once the privacy story for it is explicit.
 */

export const KEEPSAKE_DB = "life-on-paper-keepsakes";
const STORE = "recordings";

export type Keepsake = {
  id: string;
  mimeType: string;
  durationMs: number;
  createdAt: string;
  label?: string;
  /** Set when the recording was captured as a spoken entry, not a kept sound. */
  kind: "sound" | "dictation";
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openAt(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version ? window.indexedDB.open(KEEPSAKE_DB, version) : window.indexedDB.open(KEEPSAKE_DB);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("could not open keepsake store"));
    request.onblocked = () => reject(new Error("keepsake store is blocked by another tab"));
  });
}

/**
 * Opens the store, repairing a half-created database if needed.
 *
 * IndexedDB can be left at a version whose upgrade transaction never committed
 * (an aborted or interrupted first open). The database then exists *without*
 * the object store, and every later write fails with NotFoundError. Detecting
 * the missing store and reopening one version higher commits the upgrade
 * properly, so a device recovers by itself instead of silently failing to save.
 */
async function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") throw new Error("keepsakes are browser-only");
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    let db = await openAt();
    if (!db.objectStoreNames.contains(STORE)) {
      const nextVersion = db.version + 1;
      db.close();
      db = await openAt(nextVersion);
    }
    return db;
  })().catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

export function keepsakesSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window && typeof MediaRecorder !== "undefined";
}

export async function saveKeepsake(
  blob: Blob,
  meta: { durationMs: number; label?: string; kind?: Keepsake["kind"] },
): Promise<Keepsake> {
  const record: Keepsake = {
    id: `keep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    mimeType: blob.type || "audio/webm",
    durationMs: Math.max(0, Math.round(meta.durationMs)),
    createdAt: new Date().toISOString(),
    label: meta.label,
    kind: meta.kind ?? "sound",
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...record, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("could not save keepsake"));
  });
  return record;
}

export async function getKeepsakeBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => {
      const row = request.result as (Keepsake & { blob?: Blob }) | undefined;
      resolve(row?.blob ?? null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function listKeepsakes(): Promise<Keepsake[]> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result ?? []) as Array<Keepsake & { blob?: Blob }>;
      resolve(
        rows
          .map((row) => {
            const { blob, ...meta } = row;
            void blob;
            return meta as Keepsake;
          })
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      );
    };
    request.onerror = () => resolve([]);
  });
}

export async function deleteKeepsake(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

/**
 * A short, factual line describing a keepsake so a wordless day still has a
 * place in the book. It never pretends to be the user's writing.
 */
export function keepsakeLine(keepsake: Pick<Keepsake, "createdAt" | "kind">, now = new Date()): string {
  const created = new Date(keepsake.createdAt);
  const hour = created.getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  const sameDay = created.toDateString() === now.toDateString();
  const when = sameDay
    ? `this ${partOfDay}`
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long" }).format(created);
  return keepsake.kind === "sound" ? `A sound I wanted to keep, from ${when}.` : `I spoke this ${when}.`;
}
