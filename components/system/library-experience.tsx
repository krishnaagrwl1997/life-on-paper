"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookmarkSimple,
  Check,
  Eye,
  GearSix,
  ListBullets,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SunDim,
  TextAa,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { KeptPage } from "@/components/system/memory-interview";

type LibraryView = "shelf" | "book" | "reader" | "studio" | "search";
type BookVisibility = "private" | "request" | "previews";
type CoverStyle = "coast" | "linen" | "ink";
type SearchFilter = "all" | "travel" | "people" | "work" | "feelings" | "lessons";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function LibraryExperience({
  savedPages,
  bookTitle: preferredBookTitle,
  initialView = "shelf",
  initialPageId,
  onReadingChange,
  onAddMemory,
  syncState = "device",
  onCommitPages,
  onDeletePage,
}: {
  savedPages: KeptPage[];
  bookTitle?: string;
  initialView?: "shelf" | "book" | "reader";
  initialPageId?: string;
  onReadingChange?: (reading: boolean) => void;
  onAddMemory?: () => void;
  syncState?: "device" | "syncing" | "synced" | "error";
  onCommitPages?: (pages: KeptPage[]) => Promise<void> | void;
  onDeletePage?: (page: KeptPage) => Promise<void> | void;
}) {
  const initialPages = [...savedPages];
  const [pages, setPages] = useState<KeptPage[]>(initialPages);
  const [removedPageIds, setRemovedPageIds] = useState<string[]>([]);
  const [bookTitle, setBookTitle] = useState(preferredBookTitle || "The Person I Am Learning to Trust");
  const [bookVisibility, setBookVisibility] = useState<BookVisibility>("request");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("coast");
  const [extraVolumes, setExtraVolumes] = useState<string[]>([]);
  const [view, setView] = useState<LibraryView>(initialView);
  const [selectedPageId, setSelectedPageId] = useState(initialPageId ?? pages[0]?.id ?? "");
  const [lamplight, setLamplight] = useState(false);
  const [readerScale, setReaderScale] = useState<"small" | "medium" | "large">("medium");
  const [readerSpacing, setReaderSpacing] = useState<"comfortable" | "open">("comfortable");
  const [readerChrome, setReaderChrome] = useState(true);
  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [readerContentsOpen, setReaderContentsOpen] = useState(false);
  const [readerScrollProgress, setReaderScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const readerPageRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const todayFolio = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date()).replaceAll("/", " · ");
  const activePages = pages.filter((page) => !removedPageIds.includes(page.id));
  const libraryVolumes = [...new Set(activePages.map((page) => page.volume).filter(Boolean))];
  const orderedPages = libraryVolumes.flatMap((volume) => activePages.filter((page) => page.volume === volume));
  const libraryChapters = [...new Set(activePages.map((page) => page.chapterTitle).filter(Boolean))];
  const bookSummary = activePages.length
    ? makeBookSummary(activePages)
    : "A book waiting for its first true moment—spoken, written, or photographed.";
  const selectedPage = orderedPages.find((page) => page.id === selectedPageId) ?? orderedPages[0];
  const selectedPageIndex = selectedPage ? Math.max(0, orderedPages.findIndex((page) => page.id === selectedPage.id)) : 0;
  const canMovePrevious = selectedPageIndex > 0;
  const canMoveNext = selectedPageIndex < orderedPages.length - 1;
  const bookProgress = orderedPages.length
    ? Math.min(100, ((selectedPageIndex + Math.max(readerScrollProgress / 100, canMoveNext ? 0 : 1)) / orderedPages.length) * 100)
    : 0;
  const selectedPageIsGoa = selectedPage
    ? /goa/i.test([selectedPage.title, selectedPage.excerpt, selectedPage.chapterTitle, selectedPage.volume, ...selectedPage.body].join(" "))
    : false;
  const readerParagraphs = selectedPage
    ? [selectedPage.reflection, ...selectedPage.body].filter((paragraph, index, collection) => {
        const normalized = paragraph?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        return Boolean(normalized) && collection.findIndex((candidate) => candidate?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() === normalized) === index;
      })
    : [];
  const readerVolumes = libraryVolumes;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const searchResults = activePages.filter((page) => {
    const matchesWords = !normalizedQuery || pageMatchesQuery(page, normalizedQuery);
    const matchesFilter = searchFilter === "all" || pageMatchesFilter(page, searchFilter);
    return matchesWords && matchesFilter;
  });
  const syncLabel = syncState === "synced"
    ? "Synced to your account"
    : syncState === "syncing"
      ? "Syncing your pages…"
      : syncState === "error"
        ? "Safe here · sync will retry"
        : "Saved on this device";

  const goToView = (next: LibraryView) => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setView(next);
    if (next === "reader") {
      setReaderChrome(true);
      setReaderSettingsOpen(false);
      setReaderContentsOpen(false);
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };

  const movePage = (direction: -1 | 1) => {
    if (!orderedPages.length || !selectedPage) return;
    const current = orderedPages.findIndex((page) => page.id === selectedPage.id);
    const next = current + direction;
    if (next < 0 || next >= orderedPages.length) return;
    setSelectedPageId(orderedPages[next].id);
  };

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("life-in-books-studio");
        const studio = stored ? JSON.parse(stored) as { pages?: KeptPage[]; removedPageIds?: string[]; bookTitle?: string; bookVisibility?: BookVisibility; coverStyle?: CoverStyle; extraVolumes?: string[] } : {};
        const studioPages = studio.pages ?? [];
        const merged = [
          ...savedPages,
          ...studioPages.filter((page) => !savedPages.some((savedPage) => savedPage.id === page.id || savedPage.title === page.title)),
        ];
        setPages(merged);
        if (studio.removedPageIds) setRemovedPageIds(studio.removedPageIds);
        if (studio.bookTitle) setBookTitle(studio.bookTitle);
        if (studio.bookVisibility) setBookVisibility(studio.bookVisibility);
        if (studio.coverStyle) setCoverStyle(studio.coverStyle);
        if (studio.extraVolumes) setExtraVolumes(studio.extraVolumes);
      } catch {
        setPages(savedPages);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [savedPages]);

  useEffect(() => {
    onReadingChange?.(view === "reader");
    if (view === "reader") window.scrollTo({ top: 0, behavior: "auto" });
    return () => onReadingChange?.(false);
  }, [onReadingChange, view]);

  useEffect(() => {
    if (view !== "reader") return;
    const frame = window.requestAnimationFrame(() => {
      readerPageRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      setReaderScrollProgress(0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, selectedPageId, view]);

  useEffect(() => {
    if (view !== "reader") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.setProperty("overflow", "hidden");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (readerContentsOpen) setReaderContentsOpen(false);
        else if (readerSettingsOpen) setReaderSettingsOpen(false);
        else goToView("book");
        return;
      }
      if (readerContentsOpen || readerSettingsOpen) return;
      if (event.key === "ArrowLeft") movePage(-1);
      if (event.key === "ArrowRight") movePage(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (previousOverflow) document.body.style.setProperty("overflow", previousOverflow);
      else document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleKeyDown);
    };
  // movePage and goToView intentionally use the current reader state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedPageId, orderedPages.length, readerContentsOpen, readerSettingsOpen]);

  const persistStudio = (next: { pages?: KeptPage[]; removedPageIds?: string[]; bookTitle?: string; bookVisibility?: BookVisibility; coverStyle?: CoverStyle; extraVolumes?: string[] }) => {
    const state = { pages, removedPageIds, bookTitle, bookVisibility, coverStyle, extraVolumes, ...next };
    window.localStorage.setItem("life-in-books-studio", JSON.stringify(state));
  };

  return (
    <div className={view === "reader" ? lamplight ? "library-experience library-experience--reader library-experience--lamplight" : "library-experience library-experience--reader" : "library-experience"}>
      {view !== "reader" ? <header className="library-header">
        <div>
          <p>Life on Paper</p>
          <span>{view === "shelf" ? "Your library" : view === "book" ? "Book One" : view === "studio" ? "Book Studio" : view === "search" ? "Search your life" : selectedPage.chapterTitle}</span>
        </div>
        {view !== "shelf" ? (
          <button type="button" onClick={() => goToView(view === "studio" ? "book" : "shelf")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            {view === "studio" ? "Contents" : "Library"}
          </button>
        ) : (
          <div className="library-header-actions">
            <span className="library-folio">{todayFolio}</span>
            <button type="button" className="library-search-trigger" aria-label="Search your memories" onClick={() => goToView("search")}>
              <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              <span>Search</span>
            </button>
          </div>
        )}
      </header> : null}

      <AnimatePresence mode="wait">
        {view === "shelf" ? (
          <motion.section key="shelf" className={activePages.length ? "library-shelf" : "library-shelf library-shelf--empty"} initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="library-intro">
              <p className="memory-eyebrow">Your library</p>
              <h1>Your life has a place here.</h1>
              <p>Open a book to read it, see its chapters, or add the next memory.</p>
            </div>

            <div className="library-featured">
              <button type="button" className={`library-cover library-cover--${coverStyle}`} onClick={() => goToView("book")} aria-label={`Open Book One, ${bookTitle}`}>
                <Image src="/assets/seaside-memory.png" alt="A quiet coast under a soft sky" fill unoptimized sizes="(max-width: 700px) 92vw, 36vw" priority />
                <span>Book One</span>
                <div><small>A memoir in progress</small><strong>{bookTitle}</strong><em>Krishna</em></div>
              </button>
              <div className="library-book-copy">
                <p className="section-label">Currently writing</p>
                <h2>{bookTitle}</h2>
                <p>{bookSummary}</p>
                <dl>
                  <div><dt>Volumes</dt><dd>{libraryVolumes.length || 1}</dd></div>
                  <div><dt>Chapters</dt><dd>{libraryChapters.length}</dd></div>
                  <div><dt>Pages</dt><dd>{activePages.length}</dd></div>
                </dl>
                <div className="library-book-actions">
                  {activePages.length ? (
                    <button type="button" className="library-primary" onClick={() => { setSelectedPageId(activePages[0].id); goToView("reader"); }}>Continue reading <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
                  ) : onAddMemory ? (
                    <button type="button" className="library-primary" onClick={onAddMemory}>Add your first memory <Plus size={18} weight="bold" aria-hidden="true" /></button>
                  ) : null}
                  <button type="button" className="library-secondary" onClick={() => goToView("book")}>View contents</button>
                </div>
              </div>
            </div>

            <div className="library-recents">
              <div><p className="section-label">{activePages.length ? "Recently bound" : "A fresh beginning"}</p><span>{activePages.length ? syncLabel : "No pages yet"}</span></div>
              {activePages.length ? (
                <div className="library-recent-grid">
                  {[...activePages].slice(0, 3).map((page, index) => (
                    <button key={page.id} type="button" onClick={() => { setSelectedPageId(page.id); goToView("reader"); }}>
                      <span>{String(index + 1).padStart(2, "0")}</span><small>{page.chapterTitle}</small><strong>{page.title}</strong><p>{page.excerpt}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="library-empty">
                  <div className="library-empty-mark" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>Your first page will appear here.</strong>
                  <p>Share one moment—spoken, written, or photographed—and Life on Paper will begin arranging your book.</p>
                  {onAddMemory ? <button type="button" onClick={onAddMemory}>Begin with a memory <ArrowRight size={17} weight="bold" aria-hidden="true" /></button> : null}
                </div>
              )}
            </div>
          </motion.section>
        ) : view === "search" ? (
          <motion.section key="search" className="memory-search" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="memory-search__heading">
              <p className="memory-eyebrow">Search your life</p>
              <h1>What are you trying to remember?</h1>
              <p>Search a place, person, feeling, date, chapter, or any words you remember saying.</p>
            </div>
            <label className="memory-search__field">
              <MagnifyingGlass size={22} weight="bold" aria-hidden="true" />
              <span className="sr-only">Search memories</span>
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Try “Goa”, “someone appreciated me”, or “July 2026”"
              />
              {searchQuery ? <button type="button" onClick={() => setSearchQuery("")}>Clear</button> : null}
            </label>

            <div className="memory-search__filters" aria-label="Filter memories by theme">
              {([
                ["all", "Everything"],
                ["travel", "Places"],
                ["people", "People"],
                ["work", "Work"],
                ["feelings", "Feelings"],
                ["lessons", "Life lessons"],
              ] as [SearchFilter, string][]).map(([filter, label]) => (
                <button key={filter} type="button" aria-pressed={searchFilter === filter} onClick={() => setSearchFilter(filter)}>{label}</button>
              ))}
            </div>

            {!normalizedQuery && searchFilter === "all" ? (
              <div className="memory-search__starting-points">
                <span>Try a theme</span>
                <div>
                  {["solo travel", "appreciation", "becoming", "small things"].map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => setSearchQuery(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="memory-search__results">
                <div className="memory-search__result-count">
                  <span>{searchResults.length} {searchResults.length === 1 ? "memory" : "memories"} found</span>
                  <small>{normalizedQuery ? `for “${searchQuery.trim()}”` : `in ${searchFilter}`}</small>
                </div>
                {searchResults.length ? (
                  <div className="memory-search__result-list">
                    {searchResults.map((page) => (
                      <button key={page.id} type="button" onClick={() => { setSelectedPageId(page.id); goToView("reader"); }}>
                        <span>
                          <small>{page.date} · {page.chapterTitle}{page.emotions?.length ? ` · ${page.emotions.slice(0, 2).join(", ")}` : ""}</small>
                          <strong>{highlightMatch(page.title, normalizedQuery)}</strong>
                          <p>{highlightMatch(page.excerpt || page.reflection || page.body[0] || "", normalizedQuery)}</p>
                        </span>
                        <ArrowRight size={18} weight="bold" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="memory-search__empty">
                    <strong>Nothing in this part of your life yet.</strong>
                    <p>Try another word or theme. Names, places, feelings, years, and phrases all work.</p>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        ) : view === "book" ? (
          <motion.section key="book" className="book-contents" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="book-detail-hero">
              <button type="button" className={`book-detail-cover library-cover--${coverStyle}`} onClick={() => { if (activePages[0]) setSelectedPageId(activePages[0].id); goToView("reader"); }} aria-label={`Read ${bookTitle}`}>
                <Image src="/assets/seaside-memory.png" alt="A quiet coast under a soft sky" fill unoptimized sizes="(max-width: 700px) 48vw, 240px" />
                <span>Book One</span>
                <strong>{bookTitle}</strong>
              </button>
              <div className="book-contents-heading">
                <p className="memory-eyebrow">Book One · A memoir in progress</p>
                <h1>{bookTitle}</h1>
                <p>{bookSummary}</p>
                <div className="book-detail-actions">
                  {activePages.length ? (
                    <button type="button" className="library-primary" onClick={() => { setSelectedPageId(activePages[0].id); goToView("reader"); }}>Continue reading <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
                  ) : onAddMemory ? (
                    <button type="button" className="library-primary" onClick={onAddMemory}>Write the first page <Plus size={18} weight="bold" aria-hidden="true" /></button>
                  ) : null}
                  {onAddMemory ? <button type="button" className="book-add-memory" onClick={onAddMemory}><Plus size={18} weight="bold" aria-hidden="true" /> Add memory</button> : null}
                </div>
                <button type="button" className="studio-entry" onClick={() => goToView("studio")}><GearSix size={18} weight="fill" aria-hidden="true" /> Edit book</button>
              </div>
            </div>

            <div className="contents-title">
              <div><p className="memory-eyebrow">Contents</p><h2>Chapters and pages</h2></div>
              <span>{activePages.length} pages</span>
            </div>
            {activePages.length ? <div className="volume-list">
              {libraryVolumes.map((volume, volumeIndex) => {
                const volumePages = activePages.filter((page) => page.volume === volume);
                const chapterTitles = [...new Set(volumePages.map((page) => page.chapterTitle))];
                const volumeLabel = formatVolumeLabel(volume, volumeIndex);
                return (
                  <section key={volume}>
                    <header>
                      <span>{volumeLabel.number}</span>
                      <h2>{volumeLabel.name}</h2>
                      <small>{chapterTitles.length} {chapterTitles.length === 1 ? "chapter" : "chapters"} · {volumePages.length} {volumePages.length === 1 ? "page" : "pages"}</small>
                    </header>
                    <div className="chapter-index">
                      {chapterTitles.map((chapterTitle, chapterIndex) => {
                        const chapterPages = volumePages.filter((page) => page.chapterTitle === chapterTitle);
                        return (
                          <section key={`${volume}-${chapterTitle}`} className="chapter-index__chapter">
                            <div className="chapter-index__heading">
                              <span>{String(chapterIndex + 1).padStart(2, "0")}</span>
                              <div><small>Chapter</small><h3>{chapterTitle}</h3><p>{chapterSummary(chapterPages)}</p></div>
                              <em>{chapterPages.length} {chapterPages.length === 1 ? "page" : "pages"}</em>
                            </div>
                            {chapterPages.map((page) => <PageRow key={page.id} page={page} onOpen={() => { setSelectedPageId(page.id); goToView("reader"); }} />)}
                          </section>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div> : (
              <div className="contents-empty">
                <span aria-hidden="true">01</span>
                <strong>This book is ready for its first page.</strong>
                <p>Your chapters will form naturally as you add memories. You do not need to plan them first.</p>
                {onAddMemory ? <button type="button" onClick={onAddMemory}>Add your first memory <ArrowRight size={17} weight="bold" aria-hidden="true" /></button> : null}
              </div>
            )}
          </motion.section>
        ) : view === "studio" ? (
          <BookStudio
            pages={pages}
            removedPageIds={removedPageIds}
            bookTitle={bookTitle}
            bookVisibility={bookVisibility}
            coverStyle={coverStyle}
            extraVolumes={extraVolumes}
            reduceMotion={Boolean(reduceMotion)}
            onPagesChange={(next) => { setPages(next); persistStudio({ pages: next }); }}
            onRemovedChange={(next) => { setRemovedPageIds(next); persistStudio({ removedPageIds: next }); }}
            onTitleChange={(next) => { setBookTitle(next); persistStudio({ bookTitle: next }); }}
            onVisibilityChange={(next) => { setBookVisibility(next); persistStudio({ bookVisibility: next }); }}
            onCoverChange={(next) => { setCoverStyle(next); persistStudio({ coverStyle: next }); }}
            onVolumesChange={(next) => { setExtraVolumes(next); persistStudio({ extraVolumes: next }); }}
            onPreview={() => { if (activePages[0]) setSelectedPageId(activePages[0].id); goToView("reader"); }}
            syncState={syncState}
            onCommit={async () => {
              persistStudio({ pages });
              await onCommitPages?.(pages.filter((page) => !removedPageIds.includes(page.id)));
            }}
            onDelete={async (page) => {
              const next = pages.filter((item) => item.id !== page.id);
              setPages(next);
              persistStudio({ pages: next, removedPageIds: removedPageIds.filter((id) => id !== page.id) });
              await onDeletePage?.(page);
            }}
          />
        ) : view === "reader" && selectedPage ? (
          <motion.section key={selectedPage.id} className="reader-view reader-view--kindle" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <AnimatePresence>
              {readerChrome ? <motion.header className="reader-kindle-bar" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
                <button type="button" onClick={() => goToView("book")} aria-label="Close reader and return to contents"><ArrowLeft size={19} weight="bold" aria-hidden="true" /> <span>Contents</span></button>
                <div><strong>{bookTitle}</strong><span>{selectedPage.chapterTitle}</span></div>
                <div className="reader-type-controls" aria-label="Reading appearance">
                  <button type="button" aria-label="Open book contents" aria-expanded={readerContentsOpen} onClick={() => { setReaderContentsOpen((value) => !value); setReaderSettingsOpen(false); }}><ListBullets size={20} weight="bold" aria-hidden="true" /></button>
                  <button type="button" aria-label="Open reading settings" aria-expanded={readerSettingsOpen} onClick={() => { setReaderSettingsOpen((value) => !value); setReaderContentsOpen(false); }}><TextAa size={19} weight="bold" aria-hidden="true" /></button>
                  <button type="button" aria-label="Toggle reading by lamplight" aria-pressed={lamplight} onClick={() => setLamplight((value) => !value)}><SunDim size={20} weight={lamplight ? "fill" : "regular"} aria-hidden="true" /></button>
                </div>
              </motion.header> : null}
            </AnimatePresence>
            <AnimatePresence>
              {!readerChrome && !readerContentsOpen ? (
                <motion.button
                  type="button"
                  className="reader-contents-quick"
                  aria-label="Open book contents"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                  onClick={() => setReaderContentsOpen(true)}
                >
                  <ListBullets size={20} weight="bold" aria-hidden="true" />
                </motion.button>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {readerChrome && (readerContentsOpen || readerSettingsOpen) ? (
                <motion.button
                  type="button"
                  className="reader-overlay-scrim"
                  aria-label="Close reading panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                  onClick={() => { setReaderContentsOpen(false); setReaderSettingsOpen(false); }}
                />
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {readerChrome && readerContentsOpen ? (
                <motion.aside
                  className="reader-contents-drawer"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                  aria-label="Book contents"
                >
                  <header>
                    <div><span>Contents</span><strong>{bookTitle}</strong></div>
                    <button type="button" aria-label="Close book contents" onClick={() => setReaderContentsOpen(false)}><X size={19} weight="bold" aria-hidden="true" /></button>
                  </header>
                  <div className="reader-contents-list">
                    {readerVolumes.map((volume, volumeIndex) => (
                      <section key={volume}>
                        <h2>{formatVolumeLabel(volume, volumeIndex).number} · {formatVolumeLabel(volume, volumeIndex).name}</h2>
                        {activePages.filter((page) => page.volume === volume).map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            className={page.id === selectedPage.id ? "is-current" : ""}
                            aria-current={page.id === selectedPage.id ? "page" : undefined}
                            onClick={() => {
                              setSelectedPageId(page.id);
                              setReaderContentsOpen(false);
                            }}
                          >
                            <span>{String(orderedPages.findIndex((item) => item.id === page.id) + 1).padStart(2, "0")}</span>
                            <strong>{page.title}</strong>
                            <small>{page.chapterTitle}</small>
                          </button>
                        ))}
                      </section>
                    ))}
                  </div>
                </motion.aside>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {readerChrome && readerSettingsOpen ? <motion.aside className="reader-settings" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} aria-label="Reading settings">
                <div><span>Text size</span>{(["small", "medium", "large"] as const).map((size) => <button key={size} type="button" aria-pressed={readerScale === size} onClick={() => setReaderScale(size)}>{size === "small" ? "Small" : size === "medium" ? "Medium" : "Large"}</button>)}</div>
                <div><span>Line spacing</span>{(["comfortable", "open"] as const).map((spacing) => <button key={spacing} type="button" aria-pressed={readerSpacing === spacing} onClick={() => setReaderSpacing(spacing)}>{spacing === "comfortable" ? "Comfortable" : "Open"}</button>)}</div>
              </motion.aside> : null}
            </AnimatePresence>
            <aside className="reader-margin">
              <p>{selectedPage.volume}</p><strong>{selectedPage.chapterTitle}</strong><span>{selectedPage.layout} layout</span>
              <p className="reader-time">Page {selectedPageIndex + 1} of {orderedPages.length}<br />Scroll inside the paper to read</p>
            </aside>
            <button type="button" className="reader-edge reader-edge--previous" aria-label="Previous page" disabled={!canMovePrevious} onClick={() => movePage(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
            <article
              ref={readerPageRef}
              className={`reader-page reader-page--${readerScale} reader-page--spacing-${readerSpacing}`}
              tabIndex={0}
              aria-label={`${selectedPage.title}. Reading page ${selectedPageIndex + 1} of ${orderedPages.length}`}
              onScroll={(event) => {
                const element = event.currentTarget;
                const available = element.scrollHeight - element.clientHeight;
                setReaderScrollProgress(available > 0 ? Math.min(100, (element.scrollTop / available) * 100) : 100);
              }}
              onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
              onPointerUp={(event) => {
                const start = pointerStart.current;
                pointerStart.current = null;
                if (start === null) return;
                const horizontalDistance = event.clientX - start.x;
                const verticalDistance = event.clientY - start.y;
                if (Math.abs(verticalDistance) > 14) return;
                if (Math.abs(horizontalDistance) > 52) movePage(horizontalDistance < 0 ? 1 : -1);
                else { setReaderChrome((value) => !value); setReaderSettingsOpen(false); }
              }}
            >
              {selectedPageIsGoa && selectedPage.artworkLevel !== "none" ? (
                <div className={`reader-watercolor-motifs reader-watercolor-motifs--${selectedPage.artworkLevel ?? "subtle"}`} aria-hidden="true">
                  <Image src="/assets/goa-watercolor-motifs.png" alt="" fill unoptimized sizes="760px" />
                </div>
              ) : null}
              <header><span>{selectedPage.book} · {selectedPage.volume}</span><span>{selectedPage.chapter}</span></header>
              <div>
                <p className="reader-date">{selectedPage.date}</p>
                <h1>{selectedPage.title}</h1>
                {selectedPage.photo ? <div className={selectedPage.photoTreatment === "original" ? "reader-photo" : "reader-photo reader-photo--painterly"}><Image src={selectedPage.photo} alt="Photograph attached to this memory" width={1600} height={1200} unoptimized sizes="620px" /></div> : null}
                {readerParagraphs.map((paragraph, index) => <p key={`${selectedPage.id}-${index}`}>{paragraph}</p>)}
              </div>
              <footer><span>Life on Paper</span><span>04 · {String(orderedPages.findIndex((page) => page.id === selectedPage.id) + 1).padStart(2, "0")}</span></footer>
            </article>
            <button type="button" className="reader-edge reader-edge--next" aria-label="Next page" disabled={!canMoveNext} onClick={() => movePage(1)}><ArrowRight size={20} aria-hidden="true" /></button>
            <nav className={readerChrome ? "reader-controls reader-controls--floating" : "reader-controls reader-controls--floating reader-controls--hidden"} aria-label="Page controls">
              <button type="button" aria-label="Previous page" disabled={!canMovePrevious} onClick={() => movePage(-1)}><ArrowLeft size={17} weight="bold" aria-hidden="true" /></button>
              <span className="reader-location"><strong>Page {selectedPageIndex + 1} of {orderedPages.length}</strong><small>{Math.round(bookProgress)}% through book</small></span>
              <button type="button" aria-label="Next page" disabled={!canMoveNext} onClick={() => movePage(1)}><ArrowRight size={17} weight="bold" aria-hidden="true" /></button>
              <div className="reader-progress" aria-hidden="true"><span style={{ width: `${bookProgress}%` }} /></div>
            </nav>
          </motion.section>
        ) : (
          <motion.section key="empty-reader" className="reader-empty" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <p className="memory-eyebrow">Your book is open</p>
            <h1>There are no pages yet.</h1>
            <p>The first memory you share will become the beginning—not a sample, not a template, but something that belongs to you.</p>
            {onAddMemory ? <button type="button" className="library-primary" onClick={onAddMemory}>Add your first memory <ArrowRight size={18} weight="bold" aria-hidden="true" /></button> : null}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookStudio({
  pages,
  removedPageIds,
  bookTitle,
  bookVisibility,
  coverStyle,
  extraVolumes,
  reduceMotion,
  onPagesChange,
  onRemovedChange,
  onTitleChange,
  onVisibilityChange,
  onCoverChange,
  onVolumesChange,
  onPreview,
  syncState,
  onCommit,
  onDelete,
}: {
  pages: KeptPage[];
  removedPageIds: string[];
  bookTitle: string;
  bookVisibility: BookVisibility;
  coverStyle: CoverStyle;
  extraVolumes: string[];
  reduceMotion: boolean;
  onPagesChange: (pages: KeptPage[]) => void;
  onRemovedChange: (ids: string[]) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: BookVisibility) => void;
  onCoverChange: (cover: CoverStyle) => void;
  onVolumesChange: (volumes: string[]) => void;
  onPreview: () => void;
  syncState: "device" | "syncing" | "synced" | "error";
  onCommit: () => Promise<void> | void;
  onDelete: (page: KeptPage) => Promise<void> | void;
}) {
  const activePages = pages.filter((page) => !removedPageIds.includes(page.id));
  const [selectedId, setSelectedId] = useState(activePages[0]?.id ?? pages[0]?.id ?? "");
  const [newVolume, setNewVolume] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const selected = pages.find((page) => page.id === selectedId) ?? activePages[0] ?? pages[0];
  const volumes = ["Volume I · Elsewhere", "Volume II · Becoming", ...extraVolumes];

  const updatePage = (id: string, update: Partial<KeptPage>) => {
    onPagesChange(pages.map((page) => page.id === id ? { ...page, ...update } : page));
  };

  const renameChapter = (oldTitle: string, nextTitle: string) => {
    onPagesChange(pages.map((page) => page.chapterTitle === oldTitle ? { ...page, chapterTitle: nextTitle } : page));
  };

  const reorder = (id: string, direction: -1 | 1) => {
    const currentIndex = pages.findIndex((page) => page.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pages.length) return;
    const next = [...pages];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    onPagesChange(next);
  };

  const createVolume = () => {
    const title = newVolume.trim();
    if (!title) return;
    const next = [...extraVolumes, `Volume ${toRoman(extraVolumes.length + 3)} · ${title}`];
    onVolumesChange(next);
    setNewVolume("");
  };

  const markSaved = async () => {
    setSaving(true);
    try {
      await onCommit();
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section className="book-studio" initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
      <header className="studio-heading">
        <div><p className="memory-eyebrow">Book Studio</p><h1>Shape the book, without losing the life behind it.</h1><p>Everything the AI arranged remains yours to revise, move, rename, or quietly set aside.</p></div>
        <div className="studio-page-stack" aria-hidden="true">
          <motion.span initial={{ rotate: -7, x: -20, opacity: 0 }} animate={{ rotate: -4, x: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} />
          <motion.span initial={{ rotate: 8, x: 20, opacity: 0 }} animate={{ rotate: 3, x: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.18, ease: paperEase }} />
          <motion.strong initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.34, ease: paperEase }}>Book<br />One</motion.strong>
        </div>
      </header>

      <div className="studio-layout">
        <aside className="studio-settings">
          <section>
            <p className="studio-label">Book identity</p>
            <label htmlFor="studio-book-title">Title</label>
            <textarea id="studio-book-title" value={bookTitle} onChange={(event) => onTitleChange(event.target.value)} rows={3} />
          </section>

          <section>
            <p className="studio-label">Cover</p>
            <div className="studio-cover-options" aria-label="Choose a book cover">
              {(["coast", "linen", "ink"] as CoverStyle[]).map((cover) => <button key={cover} type="button" className={`studio-cover-chip studio-cover-chip--${cover}`} aria-pressed={coverStyle === cover} onClick={() => onCoverChange(cover)}><span>{coverStyle === cover ? <Check size={14} weight="bold" aria-hidden="true" /> : null}</span><strong>{cover === "coast" ? "Coastal photograph" : cover === "linen" ? "Warm linen" : "Ink cloth"}</strong></button>)}
            </div>
          </section>

          <section>
            <p className="studio-label">Sharing</p>
            <div className="studio-visibility">
              {(["private", "request", "previews"] as BookVisibility[]).map((visibility) => <button key={visibility} type="button" aria-pressed={bookVisibility === visibility} onClick={() => onVisibilityChange(visibility)}><span>{bookVisibility === visibility ? <Check size={14} weight="bold" aria-hidden="true" /> : null}</span><strong>{visibility === "private" ? "Private" : visibility === "request" ? "Request-only" : "Selected previews"}</strong><small>{visibility === "private" ? "Only you can read" : visibility === "request" ? "You approve each reader" : "You choose visible pages"}</small></button>)}
            </div>
            <p className="studio-visibility-note" role="status">
              {bookVisibility === "private"
                ? "This book stays hidden. It will not appear in the Garden, and no one can request it."
                : bookVisibility === "request"
                  ? "The title and summary appear in the Garden. Readers can request access, and you approve who gets in. Nothing else is shared."
                  : "Only the title, summary, and the single page you choose are visible. Readers can read that page without an account."}
            </p>
          </section>

          <section>
            <p className="studio-label">New volume</p>
            <div className="studio-new-volume"><label className="sr-only" htmlFor="new-volume-name">New volume name</label><input id="new-volume-name" value={newVolume} onChange={(event) => setNewVolume(event.target.value)} placeholder="What Came After" /><button type="button" onClick={createVolume}><Plus size={17} weight="bold" aria-hidden="true" /> Add</button></div>
            {extraVolumes.map((volume) => <p key={volume} className="studio-added-volume"><Check size={13} weight="bold" aria-hidden="true" /> {volume}</p>)}
          </section>

          <button type="button" className="studio-preview" onClick={onPreview}><Eye size={18} weight="fill" aria-hidden="true" /> Preview complete book</button>
        </aside>

        <div className="studio-workbench">
          <div className="studio-workbench-heading"><div><p className="studio-label">Pages &amp; chapters</p><h2>{activePages.length} pages in your working book</h2></div>{removedPageIds.length ? <button type="button" onClick={() => onRemovedChange([])}>Restore {removedPageIds.length} removed {removedPageIds.length === 1 ? "page" : "pages"}</button> : null}</div>

          <div className="studio-page-list">
            <AnimatePresence initial={false}>
              {activePages.map((page, index) => (
                <motion.article key={page.id} layout initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : 40 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} className={selected?.id === page.id ? "studio-page-row studio-page-row--selected" : "studio-page-row"}>
                  <button type="button" className="studio-page-select" onClick={() => setSelectedId(page.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{page.volume} · {page.chapter}</small><strong>{page.title}</strong><p>{page.chapterTitle}</p></div></button>
                  <div className="studio-row-actions"><button type="button" aria-label={`Move ${page.title} earlier`} disabled={index === 0} onClick={() => reorder(page.id, -1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" aria-label={`Move ${page.title} later`} disabled={index === activePages.length - 1} onClick={() => reorder(page.id, 1)}><ArrowDown size={16} aria-hidden="true" /></button><button type="button" aria-label={`Delete ${page.title}`} onClick={() => setPendingDeleteId(page.id)}><Trash size={16} aria-hidden="true" /></button></div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {pendingDeleteId ? (
              <motion.div
                className="studio-delete-confirm"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: paperEase }}
                role="alert"
                aria-live="polite"
              >
                <div><strong>Move “{pages.find((page) => page.id === pendingDeleteId)?.title ?? "this page"}” out of your book?</strong><span>It will be set aside from this book. You can restore it from the removed pages if you change your mind.</span></div>
                <div className="studio-delete-confirm__actions">
                  <button type="button" className="quiet-action" onClick={() => setPendingDeleteId(null)}>Keep it</button>
                  <button type="button" className="studio-delete-confirm__danger" onClick={() => { const page = pages.find((item) => item.id === pendingDeleteId); setPendingDeleteId(null); if (page) void onDelete(page); }}>Move out <Trash size={15} weight="bold" aria-hidden="true" /></button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {selected && !removedPageIds.includes(selected.id) ? (
            <motion.section key={selected.id} className="studio-editor" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
              <header><div><PencilSimple size={18} weight="fill" aria-hidden="true" /><span>Editing page</span></div><strong>{selected.title}</strong></header>
              <div className="studio-editor-grid">
                <label>Page title<input value={selected.title} onChange={(event) => updatePage(selected.id, { title: event.target.value })} /></label>
                <label>Volume<select value={selected.volume} onChange={(event) => updatePage(selected.id, { volume: event.target.value })}>{volumes.map((volume) => <option key={volume} value={volume}>{volume}</option>)}</select></label>
                <label className="studio-editor-wide">Chapter title<input value={selected.chapterTitle} onChange={(event) => renameChapter(selected.chapterTitle, event.target.value)} /></label>
                <label className="studio-editor-wide">Opening reflection<textarea value={selected.reflection} onChange={(event) => updatePage(selected.id, { reflection: event.target.value, excerpt: event.target.value })} rows={4} /></label>
                <label className="studio-editor-wide">Page text<textarea value={selected.body.join("\n\n")} onChange={(event) => updatePage(selected.id, { body: event.target.value.split(/\n\s*\n/) })} rows={9} /></label>
              </div>
              <div className="studio-original"><span>Original memory remains attached</span><p>{selected.excerpt}</p></div>
              <div className="studio-save-row"><button type="button" onClick={() => void markSaved()} disabled={saving}>{saving ? "Syncing edits…" : "Keep these edits"} <Check size={17} weight="bold" aria-hidden="true" /></button><AnimatePresence>{savedNotice ? <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>{syncState === "synced" ? "Synced to your account" : syncState === "error" ? "Safe here · sync will retry" : "Saved on this device"}</motion.span> : null}</AnimatePresence></div>
            </motion.section>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}

function pageSearchText(page: KeptPage) {
  return [
    page.title,
    page.excerpt,
    page.reflection,
    page.body.join(" "),
    page.book,
    page.volume,
    page.chapter,
    page.chapterTitle,
    page.layout,
    page.date,
    ...(page.emotions ?? []),
  ].join(" ").toLocaleLowerCase();
}

function pageMatchesQuery(page: KeptPage, query: string) {
  const searchable = pageSearchText(page);
  if (searchable.includes(query)) return true;
  const queryWords = query.split(/\s+/).filter(Boolean);
  const pageWords = searchable.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return queryWords.every((queryWord) => pageWords.some((pageWord) => {
    if (pageWord.startsWith(queryWord) || queryWord.startsWith(pageWord)) return true;
    if (queryWord.length < 3 || pageWord.length < 3 || Math.abs(queryWord.length - pageWord.length) > 1) return false;
    return editDistance(queryWord, pageWord) <= 1;
  }));
}

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function formatVolumeLabel(volume: string, index: number) {
  const [, ...nameParts] = volume.split("·");
  const explicitName = nameParts.join("·").trim();
  return {
    number: `Volume ${toRoman(index + 1)}`,
    name: explicitName || (index === 0 ? "Opening pages" : `Part ${toRoman(index + 1)}`),
  };
}

function pageMatchesFilter(page: KeptPage, filter: Exclude<SearchFilter, "all">) {
  const text = pageSearchText(page);
  const patterns: Record<Exclude<SearchFilter, "all">, RegExp> = {
    travel: /\b(travel|trip|journey|goa|rishikesh|hostel|beach|sea|train|flight|road|city|place|solo)\b/i,
    people: /\b(friend|mother|father|mom|dad|sister|brother|partner|colleague|team|person|people|someone|ria)\b/i,
    work: /\b(work|office|career|job|client|founder|startup|project|manager|team|meeting|design)\b/i,
    feelings: /\b(happy|sad|proud|grateful|afraid|scared|free|lonely|loved|angry|calm|surprised|disappointed|nostalgic)\b/i,
    lessons: /\b(learn|learned|learnt|lesson|realised|realized|understood|became|becoming|growth|changed|confidence|reflection)\b/i,
  };
  return patterns[filter].test(text) || (filter === "feelings" && Boolean(page.emotions?.length));
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const index = text.toLocaleLowerCase().indexOf(query);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function chapterSummary(pages: KeptPage[]) {
  const source = pages.find((page) => page.excerpt || page.reflection || page.body[0]);
  const text = source?.excerpt || source?.reflection || source?.body[0] || "A chapter taking shape from the memories gathered here.";
  return text.length > 120 ? `${text.slice(0, 117).trimEnd()}…` : text;
}

function makeBookSummary(pages: KeptPage[]) {
  const places = pages.filter((page) => pageMatchesFilter(page, "travel")).length;
  const people = pages.filter((page) => pageMatchesFilter(page, "people")).length;
  const lessons = pages.filter((page) => pageMatchesFilter(page, "lessons")).length;
  const parts = [
    places ? "the places that stayed with you" : "the days you wanted to keep",
    people ? "the people who shaped them" : "the feelings underneath them",
    lessons ? "what you learned along the way" : "the person you are still becoming",
  ];
  return `A growing memoir about ${parts[0]}, ${parts[1]}, and ${parts[2]}.`;
}

function toRoman(value: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][value - 1] ?? String(value);
}

function PageRow({ page, onOpen }: { page: KeptPage; onOpen: () => void }) {
  return (
    <button type="button" className="page-row" onClick={onOpen}>
      <div><BookmarkSimple size={17} weight="fill" aria-hidden="true" /></div>
      <span><small>{page.chapter}</small><strong>{page.chapterTitle}</strong></span>
      <span><small>{page.layout}</small><strong>{page.title}</strong></span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}
