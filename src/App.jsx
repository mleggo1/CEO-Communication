import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "executive-clarity:v1";
const THEME_KEY = "executive-clarity:theme";

const defaultState = {
  problem: "",
  impact: "",
  solution: "",
  consequence: "",
  author: "",
  date: "",
  problemLog: [],
};

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "In Review", label: "In Review" },
  { value: "Live", label: "Live" },
  { value: "Resolved", label: "Resolved" },
];

const sections = [
  {
    key: "problem",
    title: "Problem",
    question: "What’s actually wrong?",
    description: "The core issue. No backstory, just the problem.",
    placeholder: "Summarize the problem in 2–3 sharp sentences. No numbers dump.",
  },
  {
    key: "impact",
    title: "Impact",
    question: "What does this mean for us here?",
    description: "Why this matters to us. The business impact.",
    placeholder: "Spell out the consequence for revenue, risk, timing, or reputation.",
  },
  {
    key: "solution",
    title: "Solution",
    question: "What can we do about it?",
    description: "Give me options, not just problems.",
    placeholder: "Offer 1–2 viable moves. Bullet sentences are fine.",
  },
  {
    key: "consequence",
    title: "Consequence",
    question: "What happens after that?",
    description: "The results and trade-offs of each option.",
    placeholder: "Describe upside, risk, and second-order effects after the decision.",
  },
];

function hydrateState() {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, problemLog: parsed.problemLog ?? [] };
  } catch {
    return defaultState;
  }
}

function PasswordGate({ children }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  const expectedPassword = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return `MJL${month}`;
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const attempt = input.trim().toUpperCase();
    if (attempt === expectedPassword) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  if (!unlocked) {
    return (
      <div className="password-gate">
        <form className="password-card" onSubmit={handleSubmit}>
          <p className="eyebrow">Executive Clarity</p>
          <h1>Secure Access</h1>
          <p className="muted">Enter this month’s password to continue.</p>
          <input
            type="password"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-btn">
            Log In
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

function hydrateTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export default function ExecutiveClarityApp() {
  const [fields, setFields] = useState(() => hydrateState());
  const [theme, setTheme] = useState(() => hydrateTheme());
  const summaryRef = useRef(null);
  const [logDraft, setLogDraft] = useState({
    id: null,
    title: "",
    status: STATUS_OPTIONS[0].value,
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  }, [fields]);

  const summaryBlocks = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        value: fields[section.key].trim(),
      })),
    [fields],
  );

  const stepIndicators = useMemo(
    () =>
      sections.map((section) => ({
        key: section.key,
        title: section.title,
        filled: Boolean(fields[section.key].trim()),
      })),
    [fields],
  );

  const completionScore = useMemo(() => {
    const completed = stepIndicators.filter((chip) => chip.filled).length;
    return Math.round((completed / sections.length) * 100);
  }, [stepIndicators]);

  const logItems = fields.problemLog ?? [];
  const isLogValid = logDraft.title.trim().length > 0;
  const resetLogDraft = () =>
    setLogDraft({
      id: null,
      title: "",
      status: STATUS_OPTIONS[0].value,
    });

  const handleLogTitleChange = (event) => {
    setLogDraft((prev) => ({ ...prev, title: event.target.value }));
  };

  const handleLogStatusChange = (event) => {
    setLogDraft((prev) => ({ ...prev, status: event.target.value }));
  };

  const handleLogCapture = () => {
    const base = fields.problem.trim();
    if (!base) return;
    setLogDraft((prev) => ({ ...prev, title: base }));
  };

  const handleLogSave = () => {
    const cleanTitle = logDraft.title.trim();
    if (!cleanTitle) return;

    const snapshot = {
      problem: fields.problem,
      impact: fields.impact,
      solution: fields.solution,
      consequence: fields.consequence,
    };

    setFields((prev) => {
      const existing = prev.problemLog ?? [];
      if (logDraft.id) {
        const updated = existing.map((item) =>
          item.id === logDraft.id
            ? {
                ...item,
                title: cleanTitle,
                status: logDraft.status,
                snapshot,
                updatedAt: Date.now(),
              }
            : item,
        );
        return { ...prev, problemLog: updated };
      }
      const entry = {
        id: Date.now(),
        title: cleanTitle,
        status: logDraft.status,
        snapshot,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return { ...prev, problemLog: [entry, ...existing] };
    });

    resetLogDraft();
    if (!logDraft.id) {
      clearCoreNarrative();
    }
  };

  const applySnapshotToFields = (snapshot) => {
    if (!snapshot) return;
    setFields((prev) => ({
      ...prev,
      problem: snapshot.problem ?? "",
      impact: snapshot.impact ?? "",
      solution: snapshot.solution ?? "",
      consequence: snapshot.consequence ?? "",
    }));
  };

  const handleLogEdit = (entry) => {
    setLogDraft({
      id: entry.id,
      title: entry.title,
      status: entry.status,
    });
    applySnapshotToFields(entry.snapshot);
  };

  const handleLogDelete = (event, id) => {
    event.stopPropagation();
    setFields((prev) => ({
      ...prev,
      problemLog: (prev.problemLog ?? []).filter((item) => item.id !== id),
    }));
    setLogDraft((prev) =>
      prev.id === id
        ? { id: null, title: "", status: STATUS_OPTIONS[0].value }
        : prev,
    );
  };

  const handleLogLoadToEditor = (event, entry) => {
    event.stopPropagation();
    applySnapshotToFields(entry.snapshot);
  };

  const clearCoreNarrative = () => {
    setFields((prev) => ({
      ...prev,
      problem: "",
      impact: "",
      solution: "",
      consequence: "",
    }));
  };

  const handleChange = (key) => (event) => {
    const { value } = event.target;
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleExport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const resetAll = () => {
    setFields({ ...defaultState, problemLog: [] });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    resetLogDraft();
  };

  const page = (
    <div className="page-wrapper">
      <div className="app-shell">
      <header className="clarity-header header-bar">
        <div className="title-block">
          <p className="eyebrow">Executive Clarity</p>
          <h1>Problem → Impact → Solution → Consequence</h1>
          <p className="subtitle">
            A single-page framework to brief a CEO, board, or operating committee.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`capsule-btn theme-btn ${theme}`}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? "🌙 Night" : "☀️ Day"}
          </button>
          <button type="button" className="capsule-btn pdf-btn" onClick={handleExport}>
            PDF
          </button>
        </div>
      </header>
      <div className="meta-grid">
        <label className="meta-field">
          Presenter / Author
          <input
            type="text"
            value={fields.author}
            onChange={handleChange("author")}
            placeholder="Optional – who owns this narrative?"
          />
        </label>
        <label className="meta-field">
          Review Date
          <input
            type="date"
            value={fields.date}
            onChange={handleChange("date")}
          />
        </label>
        <div className="meta-card" aria-live="polite">
          <span>Clarity score</span>
          <strong>{completionScore}%</strong>
        </div>
        <div className="meta-card subtle">
          <span>Problems saved</span>
          <strong>{logItems.length}</strong>
        </div>
        <div className="meta-card actions">
          <button type="button" className="ghost-btn compact" onClick={resetAll}>
            Reset
          </button>
          <button type="button" className="ghost-btn compact" onClick={handleLogCapture}>
            Use current problem
          </button>
        </div>
      </div>

      <div className="status-row" aria-label="Stage completion status">
        <div className="pill-group">
          {stepIndicators.map((chip) => (
            <span
              key={chip.key}
              className={`status-pill ${chip.filled ? "filled" : ""}`}
            >
              <span className="dot" aria-hidden />
              {chip.title}
            </span>
          ))}
        </div>
        <div className="score-card" aria-live="polite">
          <p>Clarity score</p>
          <strong>{completionScore}%</strong>
          <div className="score-track">
            <span
              className="score-fill"
              style={{ width: `${completionScore}%` }}
            />
          </div>
        </div>
      </div>

      <section className="tracker-panel">
        <div className="tracker-head">
          <div>
            <p className="eyebrow">Problem Tracker</p>
            <h3>Save every issue and know its status at a glance.</h3>
          </div>
          <div className="tracker-head-actions">
            <button
              type="button"
              className="ghost-btn compact"
              onClick={() => {
                resetLogDraft();
                clearCoreNarrative();
              }}
            >
              New problem
            </button>
            {logDraft.id && (
              <button type="button" className="ghost-btn compact secondary" onClick={resetLogDraft}>
                Cancel edit
              </button>
            )}
          </div>
        </div>
        <div className="tracker-form">
          <label>
            Problem label
            <input
              type="text"
              value={logDraft.title}
              onChange={handleLogTitleChange}
              placeholder="e.g., Q4 pipeline softness vs. plan"
            />
          </label>
          <label>
            Status
            <select value={logDraft.status} onChange={handleLogStatusChange}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="tracker-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleLogSave}
              disabled={!isLogValid}
            >
              {logDraft.id ? "Update Entry" : "Save Entry"}
            </button>
            <button type="button" className="ghost-btn" onClick={handleLogCapture}>
              Use current problem
            </button>
          </div>
        </div>
        <div className="tracker-list">
          {logItems.length === 0 && (
            <p className="tracker-empty">
              Nothing saved yet. Capture the current problem to build a running log.
            </p>
          )}
          {logItems.map((item) => (
            <article
              key={item.id}
              className={`tracker-item ${logDraft.id === item.id ? "active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => handleLogEdit(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleLogEdit(item);
                }
              }}
            >
              <div>
                <strong>{item.title}</strong>
                <span className={`tracker-status status-${item.status.toLowerCase().replace(/\s/g, "-")}`}>
                  {item.status}
                </span>
              </div>
              <div className="tracker-item-actions">
                <button type="button" onClick={(event) => handleLogLoadToEditor(event, item)}>
                  Load
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={(event) => handleLogDelete(event, item.id)}
                  aria-label="Remove entry"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <main className="workspace">
        <section className="input-column" aria-label="PISC inputs">
          {sections.map((section) => (
            <article key={section.key} className="input-card">
              <div className="input-card-header">
                <h2>{section.title}</h2>
                <p className="question">{section.question}</p>
                <p className="description">{section.description}</p>
              </div>
              <textarea
                value={fields[section.key]}
                onChange={handleChange(section.key)}
                placeholder={section.placeholder}
                rows={6}
              />
              <p className="guideline">Aim for ~2–4 sentences. Keep it executive-level.</p>
            </article>
          ))}
        </section>

        <section className="summary-column" aria-label="Executive summary view">
          <article className="summary-panel" ref={summaryRef}>
            <header>
              <p className="eyebrow">Executive Clarity Summary</p>
              <h2>Executive Clarity – PISC Summary</h2>
              <div className="summary-meta">
                <div>
                  <span>Presenter</span>
                  <p>{fields.author.trim() || "—"}</p>
                </div>
                <div>
                  <span>Date</span>
                  <p>{fields.date || "—"}</p>
                </div>
              </div>
            </header>
            <div className="summary-body">
              {summaryBlocks.map((block) => (
                <div key={block.key} className="summary-block">
                  <p className="eyebrow">{block.title}</p>
                  <h3>{block.question}</h3>
                  <p>
                    {block.value || (
                      <span className="placeholder">Waiting for input…</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </article>
          <p className="summary-hint">
            The right-hand panel is exactly what gets exported. Keep it crisp—leaders skim.
          </p>
        </section>
      </main>

      <section className="insight-card">
        <p className="eyebrow">Fieldcraft</p>
        <h3>Executives remember contrast, not paragraphs.</h3>
        <p>
          It’s the ability to cut through noise and deliver absolute clarity — turning complex information into
          simple, executive-ready insight using the Problem → Impact → Solution → Consequence structure. Executives
          remember clear differences, not long explanations, so show what changes, what’s at stake, and the one smart move
          they should make next.
        </p>
      </section>

      <section className="info-panel">
        <details open>
          <summary>Information / Methodology</summary>
          <div className="info-content">
            <a
              href="https://www.instagram.com/p/DMkHACOoZal/"
              target="_blank"
              rel="noreferrer"
            >
              Source video & method: https://www.instagram.com/p/DMkHACOoZal/
            </a>
            <p>
              In <em>Margin Call</em>, Jeremy Irons’s character gives the ultimate presentation framework –
              “Speak as you might to a young child or a golden retriever”
            </p>
            <p>Then he asks 4 crucial questions that become your presentation structure:</p>
            <ul className="info-list">
              <li>
                <span aria-hidden>🔸</span>
                <span>
                  “What’s actually wrong?” – <strong>THE PROBLEM</strong> – Not data, not backstory. The core issue.
                </span>
              </li>
              <li>
                <span aria-hidden>🔸</span>
                <span>
                  “What does this mean for us here?” – <strong>THE IMPACT</strong> – How does this relate to us? Why should we care?
                </span>
              </li>
              <li>
                <span aria-hidden>🔸</span>
                <span>
                  “What can we do about it?” – <strong>THE SOLUTION</strong> – Give me options, not just problems.
                </span>
              </li>
              <li>
                <span aria-hidden>🔸</span>
                <span>
                  “What happens after that?” – <strong>THE CONSEQUENCE</strong> – What are the results of each action?
                </span>
              </li>
            </ul>
            <p>
              Problem → Impact → Solution → Consequence. This is the ONLY story structure executives want to hear.
              Most people dump data and wonder why leaders tune out. Leaders want clarity, not complexity. Start with the problem,
              show the impact, offer solutions, explain consequences. Done.
            </p>
          </div>
        </details>
      </section>
      </div>
    </div>
  );

  return <PasswordGate>{page}</PasswordGate>;
}
