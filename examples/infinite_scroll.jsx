import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Data Generation ────────────────────────────────────────────────────────

const ADJECTIVES = ["Fix","Review","Update","Write","Call","Send","Plan","Check","Finish","Schedule","Draft","Prepare","Research","Follow up on","Organize","Clean","Deploy","Test","Document","Discuss"];
const NOUNS = ["report","meeting notes","invoice","presentation","email","PR review","sprint plan","database","API docs","client call","onboarding","backlog","wireframes","budget","proposal","release","tests","dashboard","feedback","ticket"];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateTodosForDay(dayOffset) {
  const rng = seededRandom(dayOffset * 7919 + 13337);
  const count = Math.floor(rng() * 5) + 1;
  const todos = [];
  for (let i = 0; i < count; i++) {
    const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(rng() * NOUNS.length)];
    const done = dayOffset < 0 ? rng() > 0.3 : rng() > 0.8;
    todos.push({ id: `${dayOffset}-${i}`, text: `${adj} ${noun}`, done, priority: Math.floor(rng() * 3) });
  }
  return todos;
}

function getDayData(dayOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return {
    dayOffset,
    date: new Date(date),
    todos: generateTodosForDay(dayOffset),
  };
}

function formatDate(date, dayOffset) {
  if (dayOffset === 0) return "Today";
  if (dayOffset === -1) return "Yesterday";
  if (dayOffset === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatMonth(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Search index: generate a big window for search ─────────────────────────
const SEARCH_RANGE = 365; // ±365 days
let searchIndex = null;
function getSearchIndex() {
  if (searchIndex) return searchIndex;
  const days = [];
  for (let i = -SEARCH_RANGE; i <= SEARCH_RANGE; i++) {
    days.push(getDayData(i));
  }
  searchIndex = days;
  return searchIndex;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 7;        // days per page load
const BUFFER_PAGES = 1;     // pages to keep above/below viewport
const LOAD_THRESHOLD = 3;   // days from edge to trigger load

// ─── Priority Colors ─────────────────────────────────────────────────────────
const PRIORITY = ["#94a3b8", "#f59e0b", "#ef4444"];
const PRIORITY_LABEL = ["Low", "Medium", "High"];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function App() {
  // Loaded day windows
  const [topOffset, setTopOffset] = useState(-PAGE_SIZE);   // oldest loaded
  const [bottomOffset, setBottomOffset] = useState(PAGE_SIZE); // newest loaded
  const [days, setDays] = useState(() => {
    const result = [];
    for (let i = -PAGE_SIZE; i <= PAGE_SIZE; i++) result.push(getDayData(i));
    return result;
  });

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = no search
  const [filter, setFilter] = useState("all"); // all | active | done
  const [searchPage, setSearchPage] = useState(0);
  const SEARCH_PAGE_SIZE = 20;

  const [todos, setTodos] = useState({}); // overrides: { id: { done } }
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingBottom, setLoadingBottom] = useState(false);

  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  const observerTopRef = useRef(null);
  const observerBottomRef = useRef(null);
  const sentinelTopRef = useRef(null);
  const sentinelBottomRef = useRef(null);
  const initialScrollDone = useRef(false);
  const prevScrollHeight = useRef(0);

  // ── Scroll to today on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!initialScrollDone.current && todayRef.current && scrollRef.current) {
      todayRef.current.scrollIntoView({ block: "start" });
      initialScrollDone.current = true;
    }
  }, []);

  // ── Load more upward ────────────────────────────────────────────────────
  const loadTop = useCallback(() => {
    if (loadingTop) return;
    setLoadingTop(true);
    const newTop = topOffset - PAGE_SIZE;
    const newDays = [];
    for (let i = newTop; i < topOffset; i++) newDays.push(getDayData(i));
    prevScrollHeight.current = scrollRef.current?.scrollHeight ?? 0;
    setDays(prev => [...newDays, ...prev]);
    setTopOffset(newTop);
    setLoadingTop(false);
  }, [loadingTop, topOffset]);

  // ── Load more downward ──────────────────────────────────────────────────
  const loadBottom = useCallback(() => {
    if (loadingBottom) return;
    setLoadingBottom(true);
    const newBottom = bottomOffset + PAGE_SIZE;
    const newDays = [];
    for (let i = bottomOffset + 1; i <= newBottom; i++) newDays.push(getDayData(i));
    setDays(prev => [...prev, ...newDays]);
    setBottomOffset(newBottom);
    setLoadingBottom(false);
  }, [loadingBottom, bottomOffset]);

  // ── Preserve scroll position when prepending ────────────────────────────
  useEffect(() => {
    if (prevScrollHeight.current && scrollRef.current) {
      const diff = scrollRef.current.scrollHeight - prevScrollHeight.current;
      scrollRef.current.scrollTop += diff;
      prevScrollHeight.current = 0;
    }
  }, [days]);

  // ── IntersectionObserver for sentinels ─────────────────────────────────
  useEffect(() => {
    if (!sentinelTopRef.current) return;
    observerTopRef.current?.disconnect();
    observerTopRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadTop(); },
      { root: scrollRef.current, rootMargin: "400px 0px 0px 0px" }
    );
    observerTopRef.current.observe(sentinelTopRef.current);
    return () => observerTopRef.current?.disconnect();
  }, [loadTop]);

  useEffect(() => {
    if (!sentinelBottomRef.current) return;
    observerBottomRef.current?.disconnect();
    observerBottomRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadBottom(); },
      { root: scrollRef.current, rootMargin: "0px 0px 400px 0px" }
    );
    observerBottomRef.current.observe(sentinelBottomRef.current);
    return () => observerBottomRef.current?.disconnect();
  }, [loadBottom]);

  // ── Search ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); setSearchPage(0); return; }
    const q = search.toLowerCase();
    const index = getSearchIndex();
    const matches = [];
    for (const day of index) {
      const matchingTodos = day.todos.filter(t => {
        const text = t.text.toLowerCase();
        if (!text.includes(q)) return false;
        const done = todos[t.id]?.done ?? t.done;
        if (filter === "active" && done) return false;
        if (filter === "done" && !done) return false;
        return true;
      });
      if (matchingTodos.length) {
        matches.push({ ...day, todos: matchingTodos });
      }
    }
    setSearchResults(matches);
    setSearchPage(0);
  }, [search, filter, todos]);

  // ── Toggle todo ─────────────────────────────────────────────────────────
  const toggleTodo = useCallback((id, currentDone) => {
    setTodos(prev => ({ ...prev, [id]: { done: !currentDone } }));
  }, []);

  // ── Displayed days (normal mode, with filter) ────────────────────────────
  const displayedDays = useMemo(() => {
    if (filter === "all") return days;
    return days.map(day => ({
      ...day,
      todos: day.todos.filter(t => {
        const done = todos[t.id]?.done ?? t.done;
        return filter === "done" ? done : !done;
      })
    })).filter(d => d.todos.length > 0);
  }, [days, filter, todos]);

  // ── Search pagination ────────────────────────────────────────────────────
  const searchTotalPages = searchResults ? Math.ceil(searchResults.length / SEARCH_PAGE_SIZE) : 0;
  const searchPageDays = searchResults
    ? searchResults.slice(searchPage * SEARCH_PAGE_SIZE, (searchPage + 1) * SEARCH_PAGE_SIZE)
    : [];

  const hasSearch = !!search.trim();

  // ── Month label helper ───────────────────────────────────────────────────
  let lastMonth = null;

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.logo}>✦ Dayst</span>
          <span style={styles.tagline}>your days, in order</span>
        </div>

        {/* Search bar */}
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.searchInput}
            type="search"
            placeholder="Search all tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={styles.clearBtn} onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={styles.filters}>
          {["all", "active", "done"].map(f => (
            <button
              key={f}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {hasSearch && searchResults && (
            <span style={styles.resultCount}>
              {searchResults.reduce((a, d) => a + d.todos.length, 0)} results
            </span>
          )}
        </div>
      </header>

      {/* ── Scroll container ── */}
      {hasSearch ? (
        /* ── Search Results View ── */
        <div style={styles.scroll}>
          {searchResults && searchResults.length === 0 && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>◌</div>
              <div>No tasks match "<strong>{search}</strong>"</div>
            </div>
          )}
          {searchPageDays.map(day => (
            <DayBlock key={day.dayOffset} day={day} todos={todos} onToggle={toggleTodo} highlight={search} />
          ))}

          {/* Search pagination */}
          {searchTotalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={{ ...styles.pageBtn, ...(searchPage === 0 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setSearchPage(p => Math.max(0, p - 1))}
                disabled={searchPage === 0}
              >← Prev</button>
              <span style={styles.pageInfo}>
                Page {searchPage + 1} / {searchTotalPages}
              </span>
              <button
                style={{ ...styles.pageBtn, ...(searchPage >= searchTotalPages - 1 ? styles.pageBtnDisabled : {}) }}
                onClick={() => setSearchPage(p => Math.min(searchTotalPages - 1, p + 1))}
                disabled={searchPage >= searchTotalPages - 1}
              >Next →</button>
            </div>
          )}
        </div>
      ) : (
        /* ── Infinite Scroll View ── */
        <div ref={scrollRef} style={styles.scroll}>
          {/* Top sentinel */}
          <div ref={sentinelTopRef} style={styles.sentinel} />
          {loadingTop && <Loader />}

          {displayedDays.map(day => {
            const monthLabel = formatMonth(day.date);
            const showMonth = monthLabel !== lastMonth;
            lastMonth = monthLabel;
            return (
              <div key={day.dayOffset}>
                {showMonth && <MonthDivider label={monthLabel} />}
                <DayBlock
                  ref={day.dayOffset === 0 ? todayRef : null}
                  day={day}
                  todos={todos}
                  onToggle={toggleTodo}
                  isToday={day.dayOffset === 0}
                />
              </div>
            );
          })}

          {loadingBottom && <Loader />}
          {/* Bottom sentinel */}
          <div ref={sentinelBottomRef} style={styles.sentinel} />
        </div>
      )}
    </div>
  );
}

// ─── DayBlock ─────────────────────────────────────────────────────────────────
import { forwardRef } from "react";

const DayBlock = forwardRef(({ day, todos, onToggle, isToday, highlight }, ref) => {
  const label = formatDate(day.date, day.dayOffset);
  const weekday = day.dayOffset !== 0 && day.dayOffset !== -1 && day.dayOffset !== 1
    ? null : null;
  const isPast = day.dayOffset < 0;
  const isFuture = day.dayOffset > 0;

  return (
    <div ref={ref} style={{ ...styles.dayBlock, ...(isToday ? styles.dayBlockToday : {}) }}>
      {/* Day header */}
      <div style={styles.dayHeader}>
        <div style={styles.dayHeaderLeft}>
          {isToday && <span style={styles.todayDot} />}
          <span style={{ ...styles.dayLabel, ...(isToday ? styles.dayLabelToday : isPast ? styles.dayLabelPast : {}) }}>
            {label}
          </span>
        </div>
        <span style={styles.dayDate}>
          {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Todos */}
      <div style={styles.todoList}>
        {day.todos.length === 0 && (
          <div style={styles.emptyDay}>— no tasks —</div>
        )}
        {day.todos.map(todo => {
          const done = todos[todo.id]?.done ?? todo.done;
          return (
            <TodoItem
              key={todo.id}
              todo={todo}
              done={done}
              onToggle={() => onToggle(todo.id, done)}
              highlight={highlight}
              isPast={isPast}
            />
          );
        })}
      </div>
    </div>
  );
});

// ─── TodoItem ─────────────────────────────────────────────────────────────────
function TodoItem({ todo, done, onToggle, highlight, isPast }) {
  const text = highlight
    ? highlightText(todo.text, highlight)
    : todo.text;

  return (
    <div style={styles.todoItem} onClick={onToggle}>
      <div style={{ ...styles.checkbox, ...(done ? styles.checkboxDone : {}), borderColor: PRIORITY[todo.priority] }}>
        {done && <span style={styles.checkmark}>✓</span>}
      </div>
      <div style={styles.todoContent}>
        <span style={{ ...styles.todoText, ...(done ? styles.todoTextDone : {}) }}>
          {text}
        </span>
        <span style={{ ...styles.priorityDot, background: PRIORITY[todo.priority] }} title={PRIORITY_LABEL[todo.priority]} />
      </div>
    </div>
  );
}

function highlightText(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Month Divider ────────────────────────────────────────────────────────────
function MonthDivider({ label }) {
  return (
    <div style={styles.monthDivider}>
      <div style={styles.monthLine} />
      <span style={styles.monthLabel}>{label}</span>
      <div style={styles.monthLine} />
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={styles.loader}>
      <div style={styles.loaderDots}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...styles.loaderDot, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: 430,
    margin: "0 auto",
    background: "#0d0d0f",
    color: "#e8e4dc",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid #222",
    background: "#0d0d0f",
    zIndex: 10,
    flexShrink: 0,
  },
  headerTop: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: "#e8c97e",
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: 11,
    color: "#555",
    fontStyle: "italic",
    letterSpacing: "0.5px",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#181820",
    border: "1px solid #2a2a35",
    borderRadius: 10,
    padding: "0 12px",
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 20,
    color: "#555",
    lineHeight: 1,
    marginTop: -2,
    fontFamily: "monospace",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e8e4dc",
    fontSize: 15,
    padding: "11px 0",
    fontFamily: "inherit",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 13,
    padding: "4px",
  },
  filters: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  filterBtn: {
    background: "transparent",
    border: "1px solid #2a2a35",
    borderRadius: 6,
    color: "#666",
    fontSize: 12,
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.3px",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "#e8c97e",
    borderColor: "#e8c97e",
    color: "#0d0d0f",
    fontWeight: 700,
  },
  resultCount: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#555",
    fontStyle: "italic",
  },

  // Scroll
  scroll: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    scrollBehavior: "auto",
  },
  sentinel: {
    height: 1,
  },

  // Day block
  dayBlock: {
    padding: "18px 20px 14px",
    borderBottom: "1px solid #1a1a20",
    transition: "background 0.2s",
  },
  dayBlockToday: {
    background: "linear-gradient(135deg, #111118 0%, #14141e 100%)",
    borderLeft: "3px solid #e8c97e",
  },
  dayHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#e8c97e",
    display: "inline-block",
    boxShadow: "0 0 8px #e8c97e88",
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#aaa",
    letterSpacing: "0.2px",
  },
  dayLabelToday: {
    color: "#e8c97e",
    fontSize: 16,
  },
  dayLabelPast: {
    color: "#666",
  },
  dayDate: {
    fontSize: 11,
    color: "#444",
    letterSpacing: "0.3px",
  },

  // Todos
  todoList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  todoItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    padding: "6px 4px",
    borderRadius: 8,
    transition: "background 0.1s",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    border: "2px solid #555",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  checkboxDone: {
    background: "#e8c97e22",
  },
  checkmark: {
    fontSize: 12,
    color: "#e8c97e",
    lineHeight: 1,
  },
  todoContent: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  todoText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 1.4,
  },
  todoTextDone: {
    color: "#444",
    textDecoration: "line-through",
    textDecorationColor: "#333",
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
    opacity: 0.7,
  },
  emptyDay: {
    fontSize: 12,
    color: "#333",
    fontStyle: "italic",
    padding: "4px 0",
  },
  highlight: {
    background: "#e8c97e33",
    color: "#e8c97e",
    borderRadius: 2,
    padding: "0 2px",
  },

  // Month divider
  monthDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px 10px",
    background: "#0d0d0f",
  },
  monthLine: {
    flex: 1,
    height: 1,
    background: "#222",
  },
  monthLabel: {
    fontSize: 10,
    color: "#444",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
    whiteSpace: "nowrap",
  },

  // Pagination (search)
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "24px 20px",
    borderTop: "1px solid #1a1a20",
  },
  pageBtn: {
    background: "#181820",
    border: "1px solid #2a2a35",
    color: "#ccc",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  pageBtnDisabled: {
    opacity: 0.3,
    cursor: "default",
  },
  pageInfo: {
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
  },

  // Loader
  loader: {
    display: "flex",
    justifyContent: "center",
    padding: "16px 0",
  },
  loaderDots: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  loaderDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#e8c97e44",
    animation: "pulse 0.8s ease-in-out infinite alternate",
  },

  // Empty state
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    color: "#444",
    gap: 12,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 40,
    opacity: 0.3,
  },
};

// Inject keyframe for dots
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse { from { opacity: 0.2; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 0; }
    input[type='search']::-webkit-search-cancel-button { display: none; }
  `;
  document.head.appendChild(style);
}