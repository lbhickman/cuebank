import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt, Bank, Choice, Question, Test } from "../types";
import type { AssetMap } from "../storage";
import { Markdown } from "../markdown";
import { fmtTime } from "../stats";
import { referenceOf, referenceTitle } from "../references";
import ReferencePanel from "./ReferencePanel";
import type { View } from "./BankShell";
import {
  IconBook,
  IconCheck,
  IconExpand,
  IconFlag,
  IconFlask,
  IconFont,
  IconLeft,
  IconPause,
  IconRight,
  IconStop,
  IconX,
} from "./Icons";

const FONT_SIZES = [14, 16, 18, 20, 22];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function recordAttempt(b: Bank, testId: string, q: Question, selected: string | null, seconds: number): Bank {
  const prev = b.qstate[q.id] || { attempts: [], marked: false };
  if (prev.attempts.some((a) => a.testId === testId)) return b; // already recorded for this test
  const attempt: Attempt = { testId, selected, correct: selected === q.answer, at: Date.now(), seconds: Math.round(seconds) };
  return { ...b, qstate: { ...b.qstate, [q.id]: { ...prev, attempts: [...prev.attempts, attempt] } } };
}

interface ShownChoice extends Choice {
  shown: string; // letter displayed to the student
}

export default function TestRunner({
  bank,
  assets,
  testId,
  updateBank,
  onExit,
}: {
  bank: Bank;
  assets: AssetMap;
  testId: string;
  updateBank: (fn: (b: Bank) => Bank, immediate?: boolean) => void;
  onExit: (goTo?: View) => void;
}) {
  const stored = bank.tests.find((t) => t.id === testId)!;
  const [test, setTest] = useState<Test>(stored);
  const testRef = useRef(test);
  testRef.current = test;
  const review = test.status === "completed";

  const qById = useMemo(() => new Map(bank.questions.map((q) => [q.id, q])), [bank.questions]);
  const ids = test.questionIds.filter((id) => qById.has(id));
  const idx = Math.min(test.currentIndex, ids.length - 1);
  const qid = ids[idx];
  const q = qById.get(qid);
  const item = test.items[qid];
  const reference = referenceOf(bank);

  const [showRef, setShowRef] = useState(false);
  const [fontIdx, setFontIdx] = useState(() => {
    try {
      return Number(localStorage.getItem("cb-font") || 1);
    } catch {
      return 1;
    }
  });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("cb-font", String(fontIdx));
    } catch {
      /* ignore */
    }
  }, [fontIdx]);

  // Persist the test into the bank.
  const commit = useCallback(
    (t: Test, extra?: (b: Bank) => Bank, immediate = false) => {
      updateBank((b) => {
        const nb = { ...b, tests: b.tests.map((x) => (x.id === t.id ? { ...t, updatedAt: Date.now() } : x)) };
        return extra ? extra(nb) : nb;
      }, immediate);
    },
    [updateBank],
  );

  const change = (fn: (t: Test) => Test, extra?: (b: Bank) => Bank, immediate = false) => {
    const next = fn(testRef.current);
    testRef.current = next;
    setTest(next);
    commit(next, extra, immediate);
  };

  // Timers run only while the current question is being answered. In Tutor mode,
  // reading an explanation after submitting doesn't count toward block time.
  useEffect(() => {
    if (review) return;
    let ticks = 0;
    const iv = window.setInterval(() => {
      setTest((t) => {
        const id = t.questionIds[t.currentIndex];
        const it = t.items[id];
        if (t.settings.tutor && it?.submitted) return t;
        const items = it && !it.submitted ? { ...t.items, [id]: { ...it, seconds: it.seconds + 1 } } : t.items;
        return { ...t, elapsedSeconds: t.elapsedSeconds + 1, items };
      });
      if (++ticks % 15 === 0) commit(testRef.current);
    }, 1000);
    return () => {
      window.clearInterval(iv);
      commit(testRef.current);
    };
  }, [review, commit]);

  const go = (i: number) => {
    if (i < 0 || i >= ids.length) return;
    change((t) => ({ ...t, currentIndex: i }));
    mainRef.current?.scrollTo({ top: 0 });
  };

  // Scroll the passage back to the top only when moving to a different passage.
  const passageKey = q?.passageKey;
  useEffect(() => {
    passageRef.current?.scrollTo({ top: 0 });
  }, [passageKey]);

  const select = (label: string) => {
    if (!q || item.submitted || review) return;
    change((t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], selected: label } } }));
  };

  const submit = () => {
    if (!q || item.submitted || !item.selected) return;
    const sel = item.selected;
    const secs = item.seconds;
    change(
      (t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], submitted: true } } }),
      (b) => recordAttempt(b, test.id, q, sel, secs),
      true,
    );
  };

  const toggleMark = () => {
    if (!q) return;
    const marked = !item.marked;
    change(
      (t) => ({ ...t, items: { ...t.items, [qid]: { ...t.items[qid], marked } } }),
      (b) => ({
        ...b,
        qstate: { ...b.qstate, [qid]: { attempts: b.qstate[qid]?.attempts || [], marked } },
      }),
    );
  };

  const endBlock = () => {
    const t0 = testRef.current;
    const done: Test = {
      ...t0,
      status: "completed",
      currentIndex: 0,
      items: Object.fromEntries(Object.entries(t0.items).map(([k, v]) => [k, { ...v, submitted: true }])),
    };
    testRef.current = done;
    setTest(done);
    commit(
      done,
      (b) => {
        let nb = b;
        for (const id of t0.questionIds) {
          const qq = qById.get(id);
          const it = t0.items[id];
          if (qq && it) nb = recordAttempt(nb, t0.id, qq, it.selected, it.seconds);
        }
        return nb;
      },
      true,
    );
    onExit(`results:${t0.id}`);
  };

  const suspend = () => {
    commit(testRef.current, undefined, true);
    onExit("previous");
  };

  const toggleFullscreen = async () => {
    try {
      if (isTauriWindow()) {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        await w.setFullscreen(!(await w.isFullscreen()));
      } else if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* not supported */
    }
  };

  const showAnswer = !!item && (review || (test.settings.tutor && item.submitted));

  // Repeat questions may be shown in a shuffled order while answering. Once the answer
  // is shown, the original order and letters return so the explanation matches.
  const shownChoices: ShownChoice[] = useMemo(() => {
    if (!q) return [];
    const byLabel = new Map(q.choices.map((c) => [c.label, c]));
    const order = !showAnswer && item?.order?.every((l) => byLabel.has(l)) && item.order.length === q.choices.length ? item.order : null;
    if (!order) return q.choices.map((c) => ({ ...c, shown: c.label }));
    return order.map((l, i) => ({ ...byLabel.get(l)!, shown: LETTERS[i] }));
  }, [q, item?.order, showAnswer]);

  // Keyboard: ←/→ navigate, letters select, Enter submit, M mark.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Enter" && test.settings.tutor) submit();
      else if (/^[a-zA-Z]$/.test(e.key) && q) {
        const k = e.key.toUpperCase();
        const c = shownChoices.find((x) => x.shown === k);
        if (c) select(c.label);
        else if (k === "M") toggleMark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q || !item) {
    return (
      <div className="page">
        <p>The questions in this test are no longer in the bank.</p>
        <button className="btn" onClick={() => onExit("previous")}>Back</button>
      </div>
    );
  }

  const answeredCount = ids.filter((id) => test.items[id]?.selected).length;
  const history = (bank.qstate[qid]?.attempts || []).filter((a) => a.testId !== test.id);
  const passage = q.passageKey ? bank.passages?.[q.passageKey] : undefined;
  const reorderedNote = showAnswer && !!item.order;
  const displayId = qid.replace(/^(id-|h-)/, "");

  const questionPane = (
    <div className={"exam-content" + (showAnswer ? " reveal" : "")}>
      <Markdown className="stem" text={q.stem} assets={assets} />

      <div className={"choices" + (showAnswer ? " revealed" : "")}>
        {shownChoices.map((c) => {
          const chosen = item.selected === c.label;
          const correct = c.label === q.answer;
          let cls = "choice";
          if (chosen) cls += " chosen";
          if (showAnswer && correct) cls += " correct";
          if (showAnswer && chosen && !correct) cls += " wrong";
          return (
            <label key={c.label} className={cls}>
              <span className="choice-mark">
                {showAnswer && correct && <IconCheck size={18} />}
                {showAnswer && chosen && !correct && <IconX size={18} />}
              </span>
              <span className="choice-radio">
                <input
                  type="radio"
                  name={"q-" + qid}
                  checked={chosen}
                  disabled={item.submitted || review}
                  onChange={() => select(c.label)}
                />
              </span>
              <span className="choice-label">{c.shown}.</span>
              <Markdown className="choice-text" text={c.text} assets={assets} inline />
            </label>
          );
        })}
      </div>
      {reorderedNote && <p className="tiny muted">You saw these choices in a different order. They're shown here in their original order.</p>}

      {test.settings.tutor && !item.submitted && !review && (
        <button className="btn submit" disabled={!item.selected} onClick={submit}>
          Submit
        </button>
      )}

      {showAnswer && (
        <>
          <div className={"result-bar " + (item.selected ? (item.selected === q.answer ? "ok" : "bad") : "omit")}>
            <div className="result-main">
              <strong>{item.selected ? (item.selected === q.answer ? "Correct" : "Incorrect") : "Omitted"}</strong>
              <span className="small">Correct answer: {q.answer}</span>
            </div>
            <div className="result-stat">
              <strong>{fmtTime(item.seconds)}</strong>
              <span className="small">Time spent</span>
            </div>
            <div className="result-stat">
              <strong>{history.length ? `${history.filter((a) => a.correct).length}/${history.length}` : "First try"}</strong>
              <span className="small">Your prior attempts</span>
            </div>
            <div className="result-stat">
              <strong className="ellipsis">{q.source || "No source"}</strong>
              <span className="small">Source</span>
            </div>
          </div>

          <section className="explanation">
            <h3>Explanation</h3>
            {q.explanation ? (
              <Markdown text={q.explanation} assets={assets} />
            ) : (
              <p className="muted">No explanation was provided for this question.</p>
            )}
            {q.objective && (
              <div className="objective">
                <h4>Educational Objective</h4>
                <Markdown text={q.objective} assets={assets} />
              </div>
            )}
            {q.accuracyNote && (
              <div className="accuracy-note">
                <h4>Accuracy Note</h4>
                <Markdown text={q.accuracyNote} assets={assets} />
              </div>
            )}
            {q.tags.length > 0 && (
              <div className="tag-row">
                {q.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );

  return (
    <div className="exam" style={{ ["--exam-font" as string]: FONT_SIZES[fontIdx] + "px" }}>
      <header className="exam-top">
        <div className="exam-top-left">
          <div className="item-count">
            <strong>Item {idx + 1} of {ids.length}</strong>
            <span className="small">Question ID: {displayId}</span>
          </div>
          <button className={"top-btn mark" + (item.marked ? " on" : "")} onClick={toggleMark} title="Mark (M)">
            <IconFlag />
            <span>Mark</span>
          </button>
        </div>
        <div className="exam-top-center">
          <button className="top-btn" onClick={() => go(idx - 1)} disabled={idx === 0} title="Previous (←)">
            <IconLeft size={26} />
            <span>Previous</span>
          </button>
          <button className="top-btn" onClick={() => go(idx + 1)} disabled={idx === ids.length - 1} title="Next (→)">
            <IconRight size={26} />
            <span>Next</span>
          </button>
        </div>
        <div className="exam-top-right">
          <button className="top-btn" onClick={toggleFullscreen}>
            <IconExpand />
            <span>Full Screen</span>
          </button>
          <button className="top-btn" onClick={() => setFontIdx((fontIdx + 1) % FONT_SIZES.length)} title="Text size">
            <IconFont />
            <span>Text Size</span>
          </button>
          {reference.kind !== "none" && (
            <button className={"top-btn" + (showRef ? " on" : "")} onClick={() => setShowRef(!showRef)}>
              {reference.kind === "labs" ? <IconFlask /> : <IconBook />}
              <span>{referenceTitle(reference)}</span>
            </button>
          )}
        </div>
      </header>

      <div className="exam-body">
        <nav className="qnav" aria-label="Questions">
          {ids.map((id, i) => {
            const it = test.items[id];
            const qq = qById.get(id)!;
            const reveal = review || (test.settings.tutor && it.submitted);
            const right = it.selected === qq.answer;
            const startsSet = qq.passageKey && (i === 0 || qById.get(ids[i - 1])?.passageKey !== qq.passageKey);
            return (
              <button
                key={id}
                className={
                  "qnav-item" +
                  (i === idx ? " current" : "") +
                  (i % 2 ? " odd" : "") +
                  (!it.selected && !reveal ? " unanswered" : "") +
                  (qq.passageKey ? " in-set" : "") +
                  (startsSet ? " set-start" : "")
                }
                onClick={() => go(i)}
              >
                <span className="qnav-dot" />
                <span className="qnav-num">{i + 1}</span>
                {it.marked && <span className="qnav-flag"><IconFlag size={13} /></span>}
                {reveal && (
                  <span className={"qnav-res " + (it.selected ? (right ? "ok" : "bad") : "omit")}>
                    {it.selected ? right ? <IconCheck size={14} /> : <IconX size={14} /> : "–"}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="exam-main-wrap">
          {passage ? (
            <div className="split">
              <div className={"passage-pane" + (showAnswer ? " reveal" : "")} ref={passageRef}>
                <div className="exam-content passage-content">
                  {passage.title && <h3 className="passage-title">{passage.title}</h3>}
                  <Markdown text={passage.text} assets={assets} />
                </div>
              </div>
              <div className="exam-main" ref={mainRef}>{questionPane}</div>
            </div>
          ) : (
            <div className="exam-main" ref={mainRef}>{questionPane}</div>
          )}
          {showRef && <ReferencePanel reference={reference} onClose={() => setShowRef(false)} />}
        </div>
      </div>

      <footer className="exam-bottom">
        <div className="exam-bottom-left">
          {review ? (
            <span>Reviewing: {test.name}</span>
          ) : (
            <>
              <span>Block Time Elapsed: {fmtTime(test.elapsedSeconds)}</span>
              <span className="small">
                {test.settings.tutor ? "Tutor" : "Test"} mode · {answeredCount}/{ids.length} answered
              </span>
            </>
          )}
        </div>
        <div className="exam-bottom-right">
          {review ? (
            <>
              <button className="bottom-btn" onClick={() => onExit(`results:${test.id}`)}>
                <IconStop />
                <span>Results</span>
              </button>
              <button className="bottom-btn" onClick={() => onExit("previous")}>
                <IconX />
                <span>Exit Review</span>
              </button>
            </>
          ) : (
            <>
              <button className="bottom-btn" onClick={suspend}>
                <IconPause />
                <span>Suspend</span>
              </button>
              <button className="bottom-btn" onClick={() => setConfirmEnd(true)}>
                <IconStop />
                <span>End Block</span>
              </button>
            </>
          )}
        </div>
      </footer>

      {confirmEnd && (
        <div className="modal-backdrop">
          <div className="modal small-modal">
            <h2>End this block?</h2>
            <p>
              {ids.length - answeredCount > 0
                ? `${ids.length - answeredCount} question(s) are unanswered and will be counted as omitted.`
                : "All questions have been answered."}
            </p>
            <div className="row gap end">
              <button className="btn" onClick={() => setConfirmEnd(false)}>Cancel</button>
              <button className="btn primary" onClick={endBlock}>End Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isTauriWindow() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
