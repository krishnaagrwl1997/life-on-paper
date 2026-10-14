import type { SupabaseClient } from "@supabase/supabase-js";
import type { KeptPage } from "@/components/system/memory-interview";

const layoutToDatabase: Record<string, string> = {
  Story: "story",
  Quote: "quote",
  Illustration: "illustration",
  "Little Things": "little_things",
  Letter: "letter",
  Timeline: "timeline",
  Travel: "travel",
  People: "people",
  Reflection: "reflection",
};

const layoutFromDatabase: Record<string, string> = {
  story: "Story",
  quote: "Quote",
  illustration: "Illustration",
  little_things: "Little Things",
  letter: "Letter",
  timeline: "Timeline",
  travel: "Travel",
  people: "People",
  reflection: "Reflection",
};

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/**
 * Page fields the database has no column for. Stored in `pages.meta` so a
 * cloud round-trip (sign-in, a second device) keeps them — see the
 * 20261014000000_page_meta migration.
 */
type PageMeta = Pick<
  KeptPage,
  | "people"
  | "keepsakes"
  | "createdAt"
  | "emotions"
  | "speechLanguage"
  | "writingVersion"
  | "writingStyle"
  | "artworkLevel"
  | "photoTreatment"
> & { localId?: string };

function pageMeta(page: KeptPage): PageMeta {
  return {
    localId: page.id,
    people: page.people,
    keepsakes: page.keepsakes,
    createdAt: page.createdAt,
    emotions: page.emotions,
    speechLanguage: page.speechLanguage,
    writingVersion: page.writingVersion,
    writingStyle: page.writingStyle,
    artworkLevel: page.artworkLevel,
    photoTreatment: page.photoTreatment,
  };
}

/**
 * Until the page_meta migration is applied, writing `meta` fails with a
 * missing-column error. Retry once without it so sync keeps working either way.
 */
let metaColumnMissing = false;

function isMissingMetaColumn(error: { message: string; code?: string } | null) {
  return Boolean(error && /meta/i.test(error.message) && /(column|schema cache)/i.test(error.message));
}

async function writeWithMeta<T extends { error: { message: string; code?: string } | null }>(
  run: (withMeta: boolean) => PromiseLike<T>,
): Promise<T> {
  if (metaColumnMissing) return run(false);
  const result = await run(true);
  if (isMissingMetaColumn(result.error)) {
    metaColumnMissing = true;
    return run(false);
  }
  return result;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

async function signedMediaByMemory(client: SupabaseClient, memoryIds: string[]) {
  if (!memoryIds.length) return new Map<string, string>();
  const { data, error } = await client
    .from("media_assets")
    .select("memory_id,path")
    .in("memory_id", memoryIds)
    .eq("media_type", "image");
  assertNoError(error);

  const result = new Map<string, string>();
  await Promise.all((data ?? []).map(async (asset: { memory_id: string; path: string }) => {
    const { data: signed } = await client.storage.from("memory-media").createSignedUrl(asset.path, 60 * 60);
    if (signed?.signedUrl) result.set(asset.memory_id, signed.signedUrl);
  }));
  return result;
}

export async function loadCloudPages(client: SupabaseClient): Promise<KeptPage[]> {
  const result = await client.rpc("get_my_pages");
  assertNoError(result.error);
  const rows = (result.data ?? []) as Array<{
    page_id: string;
    page_title: string;
    dek: string | null;
    body: string;
    pull_quote: string | null;
    layout: string;
    page_created_at: string;
    chapter_title: string;
    chapter_position: number;
    volume_title: string;
    book_title: string;
    memory_id: string;
    raw_text: string | null;
    transcript: string | null;
    captured_at: string;
    page_meta?: PageMeta | null;
  }>;
  const media = await signedMediaByMemory(client, rows.map((row) => row.memory_id));

  return rows.map((row) => {
    const meta = row.page_meta ?? {};
    return {
    // Keep the device id when we have it: keepsakes, weaves and memory
    // decisions all point at it.
    id: meta.localId || row.page_id,
    cloudId: row.page_id,
    title: row.page_title,
    excerpt: row.dek || row.pull_quote || row.body.split(/\n\s*\n/)[0] || "",
    body: row.body.split(/\n\s*\n/).filter(Boolean),
    reflection: row.pull_quote || "",
    book: row.book_title,
    volume: row.volume_title,
    chapter: `Chapter ${row.chapter_position}`,
    chapterTitle: row.chapter_title,
    layout: layoutFromDatabase[row.layout] || "Story",
    date: formatDate(meta.createdAt || row.captured_at || row.page_created_at),
    createdAt: meta.createdAt || row.captured_at || row.page_created_at,
    photo: media.get(row.memory_id),
    originalText: row.raw_text || row.transcript || "",
    writingLanguage: "original" as const,
    writingStyle: meta.writingStyle ?? "almost-unchanged",
    artworkLevel: meta.artworkLevel ?? "subtle",
    photoTreatment: meta.photoTreatment ?? "painterly",
    people: meta.people,
    keepsakes: meta.keepsakes,
    emotions: meta.emotions,
    speechLanguage: meta.speechLanguage,
    writingVersion: meta.writingVersion,
    };
  });
}

function pageSource(page: KeptPage) {
  return (page.originalText || page.body.join("\n\n")).trim();
}

function pageKey(page: KeptPage) {
  const source = pageSource(page).replace(/\s+/g, " ").toLocaleLowerCase();
  return source || `${page.title.trim().toLocaleLowerCase()}::${page.body.join(" ").replace(/\s+/g, " ").toLocaleLowerCase()}`;
}

async function ensureProfile(client: SupabaseClient, ownerId: string) {
  const { data: userData, error: userError } = await client.auth.getUser();
  assertNoError(userError);
  const user = userData.user;
  if (!user || user.id !== ownerId) throw new Error("Sign in again to sync this page.");
}

async function existingCloudPageId(client: SupabaseClient, ownerId: string, page: KeptPage) {
  if (page.cloudId) return page.cloudId;

  // Match on the device id first — it survives title and wording changes
  // (e.g. the AI upgrade landing before the first save returned a cloudId).
  if (!metaColumnMissing) {
    const byLocalId = await client.from("pages").select("id").eq("meta->>localId", page.id).limit(1);
    if (isMissingMetaColumn(byLocalId.error)) metaColumnMissing = true;
    else {
      assertNoError(byLocalId.error);
      if (byLocalId.data?.[0]) return byLocalId.data[0].id as string;
    }
  }
  const source = pageSource(page);
  if (!source) return null;

  const existing = await client
    .from("memories")
    .select("id,pages(id,title)")
    .eq("owner_id", ownerId)
    .eq("raw_text", source)
    .limit(10);
  assertNoError(existing.error);

  for (const memory of existing.data ?? []) {
    const pages = (memory.pages ?? []) as Array<{ id: string; title: string }>;
    const exact = pages.find((candidate) => candidate.title.trim().toLocaleLowerCase() === page.title.trim().toLocaleLowerCase());
    if (exact) return exact.id;
    if (pages[0]) return pages[0].id;
  }
  return null;
}

async function firstOrCreateBook(client: SupabaseClient, ownerId: string, title: string) {
  const existing = await client
    .from("books")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  assertNoError(existing.error);
  if (existing.data) return existing.data.id as string;

  const created = await client
    .from("books")
    .insert({ owner_id: ownerId, title, visibility: "private", status: "active" })
    .select("id")
    .single();
  assertNoError(created.error);
  if (!created.data) throw new Error("The book could not be created.");
  return created.data.id as string;
}

async function firstOrCreateVolume(client: SupabaseClient, bookId: string, title: string) {
  const existing = await client.from("volumes").select("id").eq("book_id", bookId).eq("title", title).order("position", { ascending: true }).limit(1).maybeSingle();
  assertNoError(existing.error);
  if (existing.data) return existing.data.id as string;

  const positions = await client.from("volumes").select("position").eq("book_id", bookId).order("position", { ascending: false }).limit(1);
  assertNoError(positions.error);
  const position = ((positions.data?.[0]?.position as number | undefined) ?? 0) + 1;
  const created = await client.from("volumes").insert({ book_id: bookId, title, position }).select("id").single();
  assertNoError(created.error);
  if (!created.data) throw new Error("The volume could not be created.");
  return created.data.id as string;
}

async function firstOrCreateChapter(client: SupabaseClient, volumeId: string, title: string) {
  const existing = await client.from("chapters").select("id").eq("volume_id", volumeId).eq("title", title).order("position", { ascending: true }).limit(1).maybeSingle();
  assertNoError(existing.error);
  if (existing.data) return existing.data.id as string;

  const positions = await client.from("chapters").select("position").eq("volume_id", volumeId).order("position", { ascending: false }).limit(1);
  assertNoError(positions.error);
  const position = ((positions.data?.[0]?.position as number | undefined) ?? 0) + 1;
  const created = await client.from("chapters").insert({ volume_id: volumeId, title, position }).select("id").single();
  assertNoError(created.error);
  if (!created.data) throw new Error("The chapter could not be created.");
  return created.data.id as string;
}

async function uploadPagePhoto(client: SupabaseClient, ownerId: string, memoryId: string, photo?: string) {
  if (!photo?.startsWith("data:")) return;
  const response = await fetch(photo);
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  const path = `${ownerId}/${memoryId}/${Date.now()}.${extension}`;
  const upload = await client.storage.from("memory-media").upload(path, blob, { contentType: blob.type, upsert: false });
  assertNoError(upload.error);
  const metadata = await client.from("media_assets").insert({
    memory_id: memoryId,
    owner_id: ownerId,
    bucket: "memory-media",
    path,
    media_type: "image",
    mime_type: blob.type,
    original_name: `memory.${extension}`,
    size_bytes: blob.size,
  });
  assertNoError(metadata.error);
}

export async function saveCloudPage(
  client: SupabaseClient,
  ownerId: string,
  bookTitle: string,
  page: KeptPage,
  emotions: string[] = [],
) {
  await ensureProfile(client, ownerId);
  const bookId = await firstOrCreateBook(client, ownerId, bookTitle);
  const volumeId = await firstOrCreateVolume(client, bookId, page.volume);
  const chapterId = await firstOrCreateChapter(client, volumeId, page.chapterTitle);
  const existingPageId = await existingCloudPageId(client, ownerId, page);

  if (existingPageId) {
    const updated = await writeWithMeta((withMeta) => client.from("pages").update({
      chapter_id: chapterId,
      layout: layoutToDatabase[page.layout] || "story",
      title: page.title,
      dek: page.excerpt,
      body: page.body.join("\n\n"),
      pull_quote: page.reflection || null,
      ...(withMeta ? { meta: pageMeta(page) } : {}),
    }).eq("id", existingPageId).select("id").single());
    assertNoError(updated.error);
    return existingPageId;
  }

  const memory = await client.from("memories").insert({
    owner_id: ownerId,
    chapter_id: chapterId,
    source_type: page.photo ? "mixed" : "text",
    raw_text: page.originalText || page.body[0] || "",
    transcript: page.originalText || null,
    ai_summary: page.excerpt,
    feeling_note: emotions.join(", ") || null,
    ...(page.createdAt ? { captured_at: page.createdAt } : {}),
    status: "page_created",
  }).select("id").single();
  assertNoError(memory.error);
  if (!memory.data) throw new Error("The memory could not be saved.");
  const memoryId = memory.data.id as string;

  if (emotions.length) {
    const emotionInsert = await client.from("memory_emotions").insert(
      emotions.map((emotion) => ({ memory_id: memoryId, emotion })),
    );
    assertNoError(emotionInsert.error);
  }

  const positions = await client.from("pages").select("position").eq("chapter_id", chapterId).order("position", { ascending: false }).limit(1);
  assertNoError(positions.error);
  const position = ((positions.data?.[0]?.position as number | undefined) ?? 0) + 1;
  const createdPage = await writeWithMeta((withMeta) => client.from("pages").insert({
    chapter_id: chapterId,
    memory_id: memoryId,
    layout: layoutToDatabase[page.layout] || "story",
    title: page.title,
    dek: page.excerpt,
    body: page.body.join("\n\n"),
    pull_quote: page.reflection || null,
    position,
    published_at: new Date().toISOString(),
    ...(withMeta ? { meta: pageMeta(page) } : {}),
  }).select("id").single());
  assertNoError(createdPage.error);
  if (!createdPage.data) throw new Error("The page could not be saved.");

  await uploadPagePhoto(client, ownerId, memoryId, page.photo);
  return createdPage.data.id as string;
}

export async function syncDevicePages(
  client: SupabaseClient,
  ownerId: string,
  bookTitle: string,
  devicePages: KeptPage[],
) {
  await ensureProfile(client, ownerId);
  const cloudPages = await loadCloudPages(client);
  const cloudIds = new Set(cloudPages.map((page) => page.id));
  const cloudKeys = new Map(cloudPages.map((page) => [pageKey(page), page]));
  const cloudHasMeta = new Set(cloudPages.filter((page) => page.id !== page.cloudId).map((page) => page.id));

  let wrote = false;
  for (const page of devicePages) {
    const match = cloudIds.has(page.id) ? page : cloudKeys.get(pageKey(page));
    if (!match) {
      await saveCloudPage(client, ownerId, bookTitle, page, page.emotions);
      wrote = true;
    } else if (page.syncPending) {
      // A save from this device failed earlier — send this version now.
      const { syncPending: _pending, ...clean } = page;
      void _pending;
      await saveCloudPage(client, ownerId, bookTitle, { ...clean, cloudId: page.cloudId ?? match.cloudId }, page.emotions);
      wrote = true;
    } else if (!cloudHasMeta.has(page.id) && !metaColumnMissing) {
      // Saved before pages.meta existed: backfill it once from this device.
      const cloudId = page.cloudId ?? match.cloudId;
      await saveCloudPage(client, ownerId, bookTitle, { ...page, cloudId }, page.emotions);
      wrote = true;
    }
  }

  const finalPages = wrote ? await loadCloudPages(client) : cloudPages;
  return mergeWithDevice(finalPages, devicePages);
}

/**
 * The cloud copy wins for content, but anything it is missing (pages saved
 * before pages.meta existed, or while the migration was pending) is filled in
 * from this device so nothing is lost on sign-in.
 */
function mergeWithDevice(cloudPages: KeptPage[], devicePages: KeptPage[]) {
  const byId = new Map(devicePages.map((page) => [page.id, page]));
  const byKey = new Map(devicePages.map((page) => [pageKey(page), page]));
  return cloudPages.map((cloud) => {
    const device = byId.get(cloud.id) ?? byKey.get(pageKey(cloud));
    if (!device) return cloud;
    return {
      ...cloud,
      id: device.id,
      photo: cloud.photo ?? device.photo,
      createdAt: device.createdAt ?? cloud.createdAt,
      date: device.createdAt ? device.date : cloud.date,
      people: cloud.people ?? device.people,
      keepsakes: cloud.keepsakes ?? device.keepsakes,
      emotions: cloud.emotions ?? device.emotions,
      speechLanguage: cloud.speechLanguage ?? device.speechLanguage,
      writingVersion: cloud.writingVersion ?? device.writingVersion,
    };
  });
}

export async function deleteCloudPage(client: SupabaseClient, ownerId: string, page: KeptPage) {
  await ensureProfile(client, ownerId);
  const pageId = await existingCloudPageId(client, ownerId, page);
  if (!pageId) return;

  const found = await client.from("pages").select("memory_id").eq("id", pageId).maybeSingle();
  assertNoError(found.error);
  if (!found.data?.memory_id) return;

  const removed = await client
    .from("memories")
    .delete()
    .eq("id", found.data.memory_id)
    .eq("owner_id", ownerId);
  assertNoError(removed.error);
}
