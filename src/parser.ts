// Parses CueBank question files (.md). See llmInstructions.ts for the format spec.

import type { Choice } from "./types";

export interface ParsedQuestion {
  explicitId?: string;
  stem: string;
  choices: Choice[];
  answer: string;
  explanation: string;
  objective?: string;
  tags: string[];
  source: string;
  blockNumber: number;
  passageId?: string; // as written in this file
  keepOrder?: boolean;
  accuracyNote?: string;
}

export interface ParsedPassage {
  title?: string;
  text: string;
}

export interface ParseIssue {
  blockNumber: number;
  message: string;
  preview: string;
}

export interface ParseResult {
  passages: Record<string, ParsedPassage>; // keyed by the ID written in the file (lowercase)
  questions: ParsedQuestion[];
  issues: ParseIssue[];
}

const SECTION_ALIASES: Record<string, string> = {
  stem: "stem",
  question: "stem",
  vignette: "stem",
  "question stem": "stem",
  choices: "choices",
  options: "choices",
  "answer choices": "choices",
  "answer options": "choices",
  answer: "answer",
  "correct answer": "answer",
  "answer key": "answer",
  key: "answer",
  explanation: "explanation",
  "answer explanation": "explanation",
  rationale: "explanation",
  "educational objective": "objective",
  objective: "objective",
  "bottom line": "objective",
  "take home": "objective",
  "key point": "objective",
  "accuracy note": "accuracy",
  "accuracy check": "accuracy",
  metadata: "meta",
  meta: "meta",
  "question metadata": "meta",
};

const META_KEYS: Record<string, string> = {
  id: "id",
  "question id": "id",
  tags: "tags",
  tag: "tags",
  subjects: "tags",
  subject: "tags",
  topics: "tags",
  source: "source",
  sources: "source",
  passage: "passage",
  "passage id": "passage",
  "keep order": "keepOrder",
  "keep choice order": "keepOrder",
  title: "title",
};

function cleanKey(s: string) {
  return s.replace(/[*_`#]/g, "").trim().toLowerCase();
}

/** Parses "key: value" lines, tolerating bullets and bold, e.g. "- **Tags:** a, b". */
function parseMetaLine(line: string): [string, string] | null {
  const m = line.match(/^\s*(?:[-*+]\s+)?(?:\*\*|__)?([A-Za-z ]{1,20}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*)$/);
  if (!m) return null;
  const key = META_KEYS[cleanKey(m[1])];
  if (!key) return null;
  return [key, m[2].replace(/(\*\*|__)$/, "").trim()];
}

export function splitTags(v: string): string[] {
  return v
    .split(/[,;|]/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}

function parseFrontMatter(text: string): { body: string; tags: string[]; source: string } {
  const m = text.match(/^﻿?---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
  if (!m) return { body: text, tags: [], source: "" };
  let tags: string[] = [];
  let source = "";
  for (const line of m[1].split("\n")) {
    const kv = parseMetaLine(line);
    if (!kv) continue;
    if (kv[0] === "tags") tags = splitTags(kv[1].replace(/^\[|\]$/g, ""));
    if (kv[0] === "source") source = kv[1].replace(/^["']|["']$/g, "");
  }
  return { body: text.slice(m[0].length), tags, source };
}

const CHOICE_RE = /^\s*(?:[-*+]\s+)?(?:\*\*)?\(?([A-Za-z])(?:\)|\.|:)(?:\*\*)?\s+(.*)$/;

function parseChoices(block: string): Choice[] {
  const choices: Choice[] = [];
  for (const raw of block.split("\n")) {
    const m = raw.match(CHOICE_RE);
    if (m) {
      choices.push({ label: m[1].toUpperCase(), text: m[2].trim() });
    } else if (choices.length && raw.trim()) {
      choices[choices.length - 1].text += "\n" + raw.trim();
    }
  }
  return choices;
}

function parseAnswer(block: string, choices: Choice[]): string | null {
  const text = block.replace(/[*_`]/g, "").trim();
  const labels = new Set(choices.map((c) => c.label));
  // "C", "C.", "(C)", "Answer: C", "C. Amiodarone"
  const m = text.match(/^(?:answer\s*[:\-]?\s*)?\(?([A-Za-z])\)?(?:[.):\s]|$)/i);
  if (m && labels.has(m[1].toUpperCase())) return m[1].toUpperCase();
  // Fall back: match the answer text to a choice's text.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const found = choices.find((c) => norm(c.text) === norm(text));
  return found ? found.label : null;
}

export function parseQuestionFile(input: string): ParseResult {
  const text = input.replace(/\r\n?/g, "\n");
  const { body, tags: defaultTags, source: defaultSource } = parseFrontMatter(text);

  // Split into blocks on level-2 headings: "## Question…" or "## Passage…".
  const blocks: { kind: "question" | "passage"; lines: string[] }[] = [];
  let current: { kind: "question" | "passage"; lines: string[] } | null = null;
  let inFence = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && /^##\s+/.test(line) && !/^###/.test(line)) {
      const kind = /^##\s+passage/i.test(line) ? "passage" : /^##\s+(question|q\b|q\d)/i.test(line) ? "question" : null;
      if (kind) {
        if (current) blocks.push(current);
        current = { kind, lines: [] };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);

  const passages: Record<string, ParsedPassage> = {};
  const questions: ParsedQuestion[] = [];
  const issues: ParseIssue[] = [];

  // Passages first, so questions can refer to a passage that appears later in the file.
  blocks.forEach((b, i) => {
    if (b.kind !== "passage") return;
    const meta: Record<string, string> = {};
    const textLines: string[] = [];
    let inHeader = true;
    for (const line of b.lines) {
      const kv = inHeader && parseMetaLine(line);
      if (kv) {
        meta[kv[0]] = kv[1];
        continue;
      }
      if (line.trim()) inHeader = false;
      if (!inHeader) textLines.push(line);
    }
    const id = (meta.id || "").trim().toLowerCase();
    const text = textLines.join("\n").trim();
    if (!id) {
      issues.push({ blockNumber: 0, message: `Passage #${i + 1} has no "ID:" line, so no question can refer to it.`, preview: text.slice(0, 90) });
      return;
    }
    if (!text) {
      issues.push({ blockNumber: 0, message: `Passage "${meta.id}" is empty.`, preview: "" });
      return;
    }
    passages[id] = { title: meta.title || undefined, text };
  });

  let qNumber = 0;
  blocks.forEach((b) => {
    if (b.kind !== "question") return;
    const block = b.lines.join("\n");
    const blockNumber = ++qNumber;
    const sections: Record<string, string[]> = {};
    const meta: Record<string, string> = {};
    let section: string | null = null;
    let fence = false;
    for (const line of block.split("\n")) {
      if (/^\s*```/.test(line)) fence = !fence;
      const h = !fence && line.match(/^###\s+(.+?)\s*:?\s*$/);
      if (h) {
        const key = SECTION_ALIASES[cleanKey(h[1])];
        if (key) {
          section = key;
          sections[section] = sections[section] || [];
          continue;
        }
      }
      // Metadata ("ID:", "Tags:", "Source:") goes before the first ### section,
      // or inside an optional "### Metadata" section.
      if (!section || section === "meta") {
        const kv = !fence && parseMetaLine(line);
        if (kv) meta[kv[0]] = kv[1];
        continue;
      }
      sections[section].push(line);
    }
    const get = (k: string) => (sections[k] || []).join("\n").trim();
    const stem = get("stem");
    const choices = parseChoices(get("choices"));
    const preview = (stem || block.trim()).slice(0, 90).replace(/\s+/g, " ");

    if (!stem) {
      issues.push({ blockNumber, message: 'Missing "### Stem" section.', preview });
      return;
    }
    if (choices.length < 2) {
      issues.push({ blockNumber, message: 'Needs at least 2 answer choices under "### Choices" (e.g. "A. ...").', preview });
      return;
    }
    const dupes = choices.map((c) => c.label).filter((l, j, a) => a.indexOf(l) !== j);
    if (dupes.length) {
      issues.push({ blockNumber, message: `Duplicate choice letter(s): ${dupes.join(", ")}.`, preview });
      return;
    }
    const answer = parseAnswer(get("answer"), choices);
    if (!answer) {
      issues.push({ blockNumber, message: 'Could not read the correct answer under "### Answer" (use a single letter, e.g. "C").', preview });
      return;
    }
    const passageId = meta.passage?.trim().toLowerCase();
    if (passageId && passageId !== "none" && !passages[passageId]) {
      issues.push({ blockNumber, message: `Refers to passage "${meta.passage}", which isn't in the file.`, preview });
      return;
    }
    const tags = meta.tags ? splitTags(meta.tags) : defaultTags;
    questions.push({
      passageId: passageId && passageId !== "none" ? passageId : undefined,
      keepOrder: /^(y|yes|true|1)$/i.test((meta.keepOrder || "").trim()) || undefined,
      accuracyNote: get("accuracy") || undefined,
      explicitId: meta.id?.trim() || undefined,
      stem,
      choices,
      answer,
      explanation: get("explanation"),
      objective: get("objective") || undefined,
      tags: Array.from(new Set(tags)),
      source: (meta.source || defaultSource || "").trim(),
      blockNumber,
    });
  });

  if (!blocks.some((b) => b.kind === "question")) {
    issues.push({
      blockNumber: 0,
      message: 'No questions found. Each question must start with a "## Question" heading.',
      preview: text.slice(0, 90),
    });
  }
  return { passages, questions, issues };
}

/** 53-bit string hash (cyrb53), returned as base36. */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Stable identity used to recognize a question when the same file is imported again. */
export function fingerprint(q: { explicitId?: string; stem: string; choices: Choice[] }, passageText?: string): string {
  if (q.explicitId) return "id-" + q.explicitId.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const norm = (s: string) =>
    s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // ignore image paths
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  // Passage questions often share generic stems ("What is the main idea?"), so the passage is part of the identity.
  const basis =
    (passageText ? norm(passageText) + "##" : "") + norm(q.stem) + "||" + q.choices.map((c) => norm(c.text)).sort().join("|");
  return "h-" + hashString(basis);
}

/** Strips CueBank edit markers (<ins>…</ins>) so identity and change detection ignore highlighting. */
export function stripEditMarks(s: string): string {
  return s.replace(/<\/?ins>/gi, "");
}
