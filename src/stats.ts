import type { Bank, QStatus, Question, Test, TestSettings } from "./types";

export function statusOf(bank: Bank, qid: string): QStatus {
  const s = bank.qstate[qid];
  if (!s || !s.attempts.length) return "unused";
  const last = s.attempts[s.attempts.length - 1];
  if (last.selected === null) return "omitted";
  return last.correct ? "correct" : "incorrect";
}

export const isMarked = (bank: Bank, qid: string) => !!bank.qstate[qid]?.marked;

export function allTags(questions: Question[]): string[] {
  const set = new Set<string>();
  questions.forEach((q) => q.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function allSources(questions: Question[]): string[] {
  const set = new Set<string>();
  questions.forEach((q) => set.add(q.source || "(No source)"));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const sourceOf = (q: Question) => q.source || "(No source)";
export const NO_TAG = "(Untagged)";
export const tagsOf = (q: Question) => (q.tags.length ? q.tags : [NO_TAG]);

/** Questions in any of the selected pools (union, e.g. Unused + Incorrect + Marked). */
export function poolFilter(bank: Bank, settings: Pick<TestSettings, "pools">) {
  return bank.questions.filter(
    (q) =>
      settings.pools.includes(statusOf(bank, q.id)) || (settings.pools.includes("marked") && isMarked(bank, q.id)),
  );
}

export function eligibleQuestions(bank: Bank, s: TestSettings): Question[] {
  return poolFilter(bank, s).filter((q) => {
    if (s.sources !== "all" && !s.sources.includes(sourceOf(q))) return false;
    if (s.tags !== "all" && !tagsOf(q).some((t) => (s.tags as string[]).includes(t))) return false;
    return true;
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Tally {
  total: number;
  correct: number;
  incorrect: number;
  omitted: number;
  unused: number;
}

export function tally(bank: Bank, qs: Question[]): Tally {
  const t: Tally = { total: qs.length, correct: 0, incorrect: 0, omitted: 0, unused: 0 };
  qs.forEach((q) => t[statusOf(bank, q.id)]++);
  return t;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function testScore(test: Test, bank: Bank) {
  let correct = 0,
    incorrect = 0,
    omitted = 0;
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  for (const id of test.questionIds) {
    const item = test.items[id];
    const q = byId.get(id);
    if (!q || !item) continue;
    if (!item.submitted && test.status === "in-progress") continue;
    if (item.selected === null) omitted++;
    else if (item.selected === q.answer) correct++;
    else incorrect++;
  }
  return { correct, incorrect, omitted, total: test.questionIds.length };
}

export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/**
 * Picks up to `count` questions at random. Questions sharing a passage stay together
 * as a set, in their original order, and are never split across the limit.
 */
export function pickQuestions(eligible: Question[], count: number, bankOrder: Question[]): Question[] {
  const pos = new Map(bankOrder.map((q, i) => [q.id, i]));
  const groups = new Map<string, Question[]>();
  for (const q of eligible) {
    const key = q.passageKey ? "p:" + q.passageKey : "q:" + q.id;
    groups.set(key, [...(groups.get(key) || []), q]);
  }
  const sets = shuffle(Array.from(groups.values())).map((g) => g.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0)));
  const out: Question[] = [];
  for (const g of sets) {
    if (out.length >= count) break;
    if (out.length + g.length <= count) out.push(...g);
  }
  // If only large sets were left, fill the gap with the first set that still fits partially.
  if (!out.length && sets.length) out.push(...sets[0].slice(0, count));
  return out;
}

/** Choices that refer to other choices only make sense in their original order. */
const ORDER_DEPENDENT = /\b(all|none|both|neither) of the (above|following)\b|\b(both|only|neither)\s+[A-H]\s+(and|or|nor)\s+[A-H]\b|\b[A-H]\s+and\s+[A-H]\b/i;

/** A choice that is only a label ("A", "(2)", "Arrow C", "Structure B") points at something in a figure. */
const LABEL_ONLY = /^\(?(?:(?:arrow|label|structure|region|point|letter|area|site|number)\s+)?[A-Z0-9]{1,2}\)?\.?$/i;
/** Stems that refer to letters or numbers marked on a figure. */
const FIGURE_LABELS = /\b(label(?:l)?ed|marked|indicated|arrows?|letters?|numbered)\b/i;
const HAS_IMAGE = /!\[[^\]]*\]\([^)]*\)|<img\b/i;

export function canShuffle(q: Question, passageText = ""): boolean {
  if (q.keepOrder) return false;
  const texts = q.choices.map((c) => c.text.replace(/<\/?ins>/gi, "").trim());
  if (texts.some((t) => ORDER_DEPENDENT.test(t) || LABEL_ONLY.test(t))) return false;
  // Choices tied to labels on a figure must keep their letters.
  const context = q.stem + "\n" + passageText;
  if (HAS_IMAGE.test(context) && FIGURE_LABELS.test(context)) return false;
  return true;
}

/** Questions seen before get their choices reordered so letters can't be memorized. */
export function repeatOrder(bank: Bank, q: Question): string[] | undefined {
  const passageText = q.passageKey ? bank.passages?.[q.passageKey]?.text || "" : "";
  if (statusOf(bank, q.id) === "unused" || !canShuffle(q, passageText)) return undefined;
  const labels = q.choices.map((c) => c.label);
  let order = shuffle(labels);
  for (let i = 0; i < 3 && order.join() === labels.join(); i++) order = shuffle(labels);
  return order;
}
