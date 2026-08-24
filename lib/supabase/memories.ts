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
  }>;
  const media = await signedMediaByMemory(client, rows.map((row) => row.memory_id));

  return rows.map((row) => ({
    id: row.page_id,
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
    date: formatDate(row.captured_at || row.page_created_at),
    photo: media.get(row.memory_id),
    originalText: row.raw_text || row.transcript || "",
    writingLanguage: "original",
    writingStyle: "almost-unchanged",
    artworkLevel: "subtle",
    photoTreatment: "painterly",
  }));
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
    const updated = await client.from("pages").update({
      chapter_id: chapterId,
      layout: layoutToDatabase[page.layout] || "story",
      title: page.title,
      dek: page.excerpt,
      body: page.body.join("\n\n"),
      pull_quote: page.reflection || null,
    }).eq("id", existingPageId).select("id").single();
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
  const createdPage = await client.from("pages").insert({
    chapter_id: chapterId,
    memory_id: memoryId,
    layout: layoutToDatabase[page.layout] || "story",
    title: page.title,
    dek: page.excerpt,
    body: page.body.join("\n\n"),
    pull_quote: page.reflection || null,
    position,
    published_at: new Date().toISOString(),
  }).select("id").single();
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
  const cloudKeys = new Map(cloudPages.map((page) => [pageKey(page), page]));

  for (const page of devicePages) {
    const cloudMatch = cloudKeys.get(pageKey(page));
    if (cloudMatch) continue;
    await saveCloudPage(client, ownerId, bookTitle, page, page.emotions);
  }

  return loadCloudPages(client);
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
