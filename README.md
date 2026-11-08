# CueBank

**Your questions. Your Q-bank.**

CueBank is free, open-source software that turns practice questions you already have (a class exam, SAT/ACT/MCAT/AP prep, licensing board review, or questions an AI assistant converted from a PDF) into an exam-style question bank. Import a Markdown file, build randomized blocks by subject and source, answer in Tutor or Test mode, and track your performance.

Runs on macOS, Windows, and Linux. Your data stays on your computer.

---

## Features

- **Multiple question banks.** Keep separate banks (for example "SAT Math", "Biology Final", "Step 1") and pick one when the app opens.
- **Import from the start screen or inside a bank.** Choose which bank to import into, or create a new one on the spot. Images can come along as separate files, a folder, or a `.zip`.
- **Safe re-importing.** Questions are recognized by their ID (or their text), so importing the same or an expanded file adds only new questions and keeps your progress.
- **Shared passages.** Reading passages, data sets, or cases shared by several questions appear beside those questions, and the set always stays together in a test.
- **Create Test.** Pools (Unused, Incorrect, Marked, Omitted, Correct) in any combination, subject tag and source filters, up to 100 questions per block, Tutor mode (explanation after each question) or Test mode (review at the end).
- **Exam interface.** Numbered question list, mark/flag, previous/next, keyboard shortcuts, block timer (paused while reading Tutor explanations), text size, full screen, suspend and resume.
- **Fresh order on repeats.** When you see a question again, its answer choices are reordered so you learn the content, not the letter. Review always shows the original order so explanations match. Choices that depend on their order (such as "All of the above" or labels on a figure) are never reordered.
- **Reference panel per bank.** Lab values (editable), periodic table, math formulas, your own custom reference, or none.
- **Explanations.** Markdown, tables, images, LaTeX math, an Educational Objective box, and an optional Accuracy Note.
- **AI Import Instructions.** Choose optional changes (fix grammar and typos, update terminology, explain incorrect choices, flag possible errors, update to current information, add research citations, add tables, highlight edits in blue), then save or copy instructions for ChatGPT, Claude, Gemini, or another assistant.
- **Question Library.** Search, filter, preview, edit, and delete questions.
- **Performance.** Overall results, bank usage, and breakdowns by subject tag and by source.
- **Light and dark mode**, or match your Mac's setting.
- **Backup and restore** a bank with all progress.

---

## Getting CueBank

### Download (easiest)

Download the latest `.dmg` (Mac), `.msi`/`.exe` (Windows), or `.AppImage`/`.deb` (Linux) from this repository's **Releases** page, or from the latest successful run under **Actions → Build CueBank → Artifacts**.

**First launch on a Mac:** CueBank isn't signed with a paid Apple Developer certificate, so macOS warns you once.

1. Open the `.dmg` and drag **CueBank** into **Applications**.
2. Double-click CueBank. When macOS says it can't verify the developer, click **Done**.
3. Open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to CueBank.

### Build with GitHub (no Xcode needed)

The included workflow (`.github/workflows/build.yml`) builds the Mac, Windows, and Linux apps on GitHub's servers. Go to **Actions → Build CueBank → Run workflow**, or push a version tag (for example `v1.1.0`) to create a draft release.

### Build on your own Mac

Install [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs), and Apple's Command Line Tools (`xcode-select --install`; the full Xcode app isn't required). Then:

```bash
npm install
npm run tauri dev      # run in development mode
npm run tauri build    # build CueBank.app and a .dmg
```

---

## Writing questions

Each question starts with `## Question` and has `### Stem`, `### Choices`, `### Answer`, and `### Educational Objective` sections.

```markdown
---
Source: Unit 3 Practice Exam
---

## Passage
ID: unit3-p1
Title: Cooling the City

Cities are often several degrees warmer than the countryside around them...

## Question
ID: unit3-q1
Passage: unit3-p1
Tags: Reading, Main Idea

### Stem
Which choice best states the main purpose of the passage?

### Choices
A. To argue that cities should replace pavement with grass
B. To explain how trees reduce urban heat and why planners value them
C. To compare the climates of cities and rural areas in detail
D. To describe the history of storm drain construction

### Answer
B

### Explanation
The passage explains the two ways trees cool cities and how planners now view them.

### Educational Objective
A main-purpose answer must cover the whole passage, not a single detail.
```

| Part | Notes |
|---|---|
| `## Question` | Starts each question. |
| `ID:` | Unique and stable, so re-imports keep your progress. |
| `Tags:` | Comma-separated subjects. |
| `Source:` | Where the question came from. Can be set once in the front matter. |
| `Passage:` | ID of a shared `## Passage` block. |
| `Keep order: yes` | Never reorder this question's choices. |
| `### Stem`, `### Choices`, `### Answer` | Required. Any number of choices from 2 to 26; single best answer. |
| `### Explanation` | Markdown, tables, images, math. |
| `### Educational Objective` | Key takeaway, shown in its own box. |
| `### Accuracy Note` | Optional note that the answer or explanation may be wrong. |
| `<ins>…</ins>` | Marks AI-changed text, shown in blue during review only. |

The full specification is in the app under **AI Import Instructions**. A sample file is in [`sample/`](sample/).

### Converting questions with an AI assistant

1. Open **AI Import Instructions**, choose any changes you want, and save the file.
2. Give it to a trusted AI assistant with your questions (PDF, document, or pasted text) and ask it to convert them.
3. Save the reply as `questions.md`, put any images in an `images` folder next to it, and import the file, folder, or `.zip`.

---

## Where your data is stored

- **macOS:** `~/Library/Application Support/io.github.lbhickman.cuebank/`
- **Windows:** `%APPDATA%\io.github.lbhickman.cuebank\`
- **Linux:** `~/.local/share/io.github.lbhickman.cuebank/`

## Keyboard shortcuts (during a test)

| Key | Action |
|---|---|
| ← / → | Previous / next question |
| A, B, C… | Select an answer choice |
| Enter | Submit (Tutor mode) |
| M | Mark / unmark (when no choice uses the letter M) |

## Lab values

The built-in lab panel uses common adult reference ranges compiled for CueBank. Ranges differ between laboratories and exams; edit them under **Reference** to match your exam's official sheet.

---

## Disclaimer

CueBank is an independent project and is not affiliated with any test maker, test prep company, or exam administrator. Users are responsible for having the right to use any questions they import.

## License

[MIT](LICENSE) © 2026 L. Brian Hickman, MD, MSc
