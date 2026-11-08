// The "AI Import Instructions" file. The user picks optional changes in the app, and the
// resulting instructions are given to ChatGPT, Claude, Gemini, etc. along with their questions.

export type ImportOptionKey =
  | "grammar"
  | "terminology"
  | "explainCorrect"
  | "explainWrong"
  | "flag"
  | "update"
  | "citations"
  | "tables"
  | "highlight";

export const IMPORT_OPTIONS: { key: ImportOptionKey; label: string; description: string }[] = [
  { key: "grammar", label: "Fix grammar and typos", description: "Corrects spelling, grammar, and formatting errors without changing meaning." },
  { key: "terminology", label: "Update outdated terminology", description: "Replaces outdated terms with current ones, keeping the original in parentheses." },
  { key: "explainCorrect", label: "Explain the correct answer", description: "Adds a fuller explanation of why the correct answer is right, when the source's explanation is brief or missing." },
  { key: "explainWrong", label: "Explain incorrect answer choices", description: "Adds a brief reason why each wrong choice is wrong, when the source doesn't give one." },
  { key: "flag", label: "Flag possible errors", description: "Adds an Accuracy Note after the explanation if the answer or explanation may be wrong." },
  { key: "update", label: "Update to current information", description: "Revises any part of the question that is outdated or incorrect. This may result in extensive changes." },
  { key: "citations", label: "Add research citations", description: "Adds a one-sentence recent research finding to the explanation from a reputable source." },
  { key: "tables", label: "Add tables", description: "Adds an AI-generated educational summary table to answer explanations." },
  { key: "highlight", label: "Highlight edits in blue", description: "Highlights changed or added text in blue during review." },
];

export type ImportOptions = Partial<Record<ImportOptionKey, boolean>>;

export const SAMPLE_FILE = `---
Source: CueBank Sample Set
---

## Passage
ID: sample-reading-p1
Title: Cooling the City

Cities are often several degrees warmer than the countryside around them, an effect known as the urban heat island. Pavement and rooftops absorb sunlight during the day and release it slowly at night. Trees counter this in two ways. Their canopies shade surfaces that would otherwise heat up, and their leaves release water vapor, which cools the surrounding air as it evaporates. For this reason, some city planners now treat trees less as decoration and more as infrastructure, as essential to a neighborhood as its storm drains.

## Question
ID: sample-reading-1
Passage: sample-reading-p1
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
The passage describes the urban heat island, explains the two ways trees cool cities, and ends with how planners have come to view trees. Choice B captures all of this.

### Educational Objective
A main-purpose answer must cover the whole passage, not a single detail.

## Question
ID: sample-reading-2
Passage: sample-reading-p1
Tags: Reading, Vocabulary in Context

### Stem
As used in the passage, "counter" most nearly means

### Choices
A. oppose
B. tally
C. display
D. surface

### Answer
A

### Explanation
Trees work against the heat island effect, so "counter" means "oppose."

### Educational Objective
Choose the meaning that fits the sentence, not the word's most common meaning.

## Question
ID: sample-math-1
Tags: Math, Algebra
Keep order: yes

### Stem
If $3x + 7 = 22$, what is the value of $x$?

### Choices
A. 3
B. 5
C. 7
D. 15

### Answer
B

### Explanation
Subtract 7 from both sides to get $3x = 15$, then divide by 3:

$$x = \\frac{15}{3} = 5$$

### Educational Objective
Undo operations in reverse order to isolate the variable.
`;

const OPTION_RULES: Record<ImportOptionKey, string> = {
  grammar: `**Fix grammar and typos.** Correct spelling, grammar, and punctuation mistakes, and repair formatting problems such as broken line breaks, scanning (OCR) errors, and inconsistent numbering. Do not change the meaning, facts, difficulty, or the author's wording beyond fixing errors.`,

  terminology: `**Update outdated terminology.** When a term has been formally replaced by a newer accepted term in its field, use the current term followed by the original term in parentheses, for example "Myanmar (Burma)". Do this the first time the term appears in each question; afterward use the current term alone. Do not modernize ordinary wording or style.`,

  explainCorrect: `**Explain the correct answer.** If a question's explanation is missing, or is too brief to teach why the correct answer is right (for example, only restating the answer), add a clear explanation of why the correct answer is right: the key fact, reasoning, or calculation a student needs. Keep the source's original explanation as written and put your addition after it. If the source's explanation is already complete, leave it unchanged.`,

  explainWrong: `**Explain incorrect answer choices.** If the explanation does not say why a particular incorrect choice is wrong, add a short reason (one or two sentences) for that choice. Put these at the end of the explanation in a list headed "**Why the other choices are incorrect:**", one bullet per choice, starting with its letter. Do not repeat reasons the source already gives.`,

  flag: `**Flag possible errors.** If you have a well-founded reason to believe the keyed answer or the explanation is incorrect or outdated, add a \`### Accuracy Note\` section after the Educational Objective. In it, explain what may be wrong, why, and what the correct information is. Add the note only when there is a real problem, not for minor style issues, and leave it out entirely otherwise. Do not change the question, answer, or explanation yourself unless "Update to current information" is also approved.`,

  update: `**Update to current information.** If any part of a question is factually incorrect or out of date by current standards, revise whatever is needed (stem, choices, answer, explanation, or Educational Objective) so it is correct, while still testing the same concept. Whenever you change anything under this rule, describe what you changed and why, in one or two sentences: in the \`### Accuracy Note\` section if "Flag possible errors" is also approved, otherwise as a final line of the explanation starting with "**Changes made:**". If nothing needs updating, change nothing.`,

  citations: `**Add research citations.** At the end of each explanation, add one line starting with "**Recent research:**" followed by a one-sentence summary of a relevant research finding, preferably from the last 10 years, from a peer-reviewed journal or similarly reputable source. End the line with the source and a DOI link, for example: (Smith et al., *Journal Name*, 2021. [doi:10.1234/abcd.5678](https://doi.org/10.1234/abcd.5678)). Only cite a source whose DOI you have confirmed is real and supports the sentence; use web search or browsing to check if you can. If you cannot confirm a source, or the topic has no relevant research (for example, a grammar question), leave the line out for that question. Never invent or guess a citation.`,

  tables: `**Add tables.** When a summary table would help a student learn the concept (for example, comparing the answer choices, a classification, or key values to remember), add one compact Markdown table to the explanation. At most one table per question. The table must be accurate and consistent with the explanation.`,

  highlight: `**Highlight edits.** Wrap every piece of text you changed or added in \`<ins>\` and \`</ins>\` tags so CueBank can show it in blue during review. Inline changes look like \`The reaction releases <ins>carbon dioxide</ins>.\`. For added blocks (whole paragraphs, lists, tables, or an Educational Objective you wrote), put \`<ins>\` alone on the line before the block and \`</ins>\` alone on the line after it, with a blank line between each tag and the block. Do not wrap the metadata lines (ID, Tags, Source, Passage, Keep order), the section headings, or the Accuracy Note.`,
};

export function buildLlmInstructions(opts: ImportOptions = {}): string {
  const chosen = IMPORT_OPTIONS.filter((o) => opts[o.key]);
  const approved = chosen.length
    ? `The user has approved the following changes, and only these. Apply each one to every question:\n\n${chosen
        .map((o, i) => `${i + 1}. ${OPTION_RULES[o.key]}`)
        .join("\n\n")}`
    : `The user has not approved any changes. Reproduce every question, answer choice, answer, and explanation exactly as the source presents it, even if you notice a mistake.`;

  return `# CueBank Import Instructions (for an AI assistant)

You are converting multiple-choice practice questions into the **CueBank** format. CueBank is a study app that imports a Markdown (.md) file and turns it into a randomized question bank. The questions can be from any subject or exam: a class test, the SAT, ACT, MCAT, an AP exam, a professional licensing exam, and so on. Follow these instructions exactly so the file imports without errors.

---

## Your task

1. Read the source material the user provides (pasted text, a PDF, images, or a document).
2. Convert **every** single-best-answer multiple-choice question in it into the format below.
3. Output the complete file in **one Markdown code block** so the user can save it as \`questions.md\`. If it would be very long, split it into several files of about 25 to 50 questions each and say so.
4. After the code block, add a short list of anything the user should know: questions you left out and why, images they need to save, and anything you were unsure about.

---

## Rule 1: Keep the source's content as written

By default, reproduce each question **exactly as the source presents it**: the same stem, the same answer choices in the same order, the same correct answer, and the same explanation. Do not reword, shorten, correct, or "improve" anything unless one of the approved changes below allows it.

- If the source gives no correct answer for a question, leave that question out and list it after the code block.
- If the source gives no explanation, leave out the \`### Explanation\` section (unless an approved change asks you to add content to it).
- Leave out anything that is not a single-best-answer multiple-choice question (for example, free-response or select-all questions), and list what you left out.

There are only two things you always add, described in Rule 2: **tags** and an **Educational Objective**.

## Rule 2: Always add tags and an Educational Objective

**Tags.** Give every question a \`Tags:\` line with its subjects. If the source already labels a question's subject, topic, or category, keep those labels. Then decide whether they are enough, and add your own tags if they would help the student filter by subject. When there is a well-known outline for the exam (such as the SAT's content domains, the MCAT's content categories, or an AP course's units), use its category names. Use 2 to 4 tags per question, and spell and capitalize each tag identically everywhere in the file.

**Educational Objective.** Every question ends with a \`### Educational Objective\` section: one or two sentences stating the key takeaway. If the source already provides a summary, key point, or takeaway, copy it as written. Otherwise, write one yourself.

## Rule 3: Approved changes

${approved}

---

## File structure

The file may begin with optional **front matter** that sets defaults for every question in the file. A question's own \`Tags:\` or \`Source:\` line overrides these.

\`\`\`
---
Source: Unit 3 Practice Exam
---
\`\`\`

Each question follows this skeleton:

\`\`\`
## Question
ID: <unique-id>
Tags: <tag 1>, <tag 2>
Source: <where the question came from>

### Stem
<question text>

### Choices
A. <choice text>
B. <choice text>
C. <choice text>

### Answer
<single letter>

### Explanation
<explanation>

### Educational Objective
<key takeaway>
\`\`\`

### The parts of a question

- **\`## Question\`** (required) starts every question. Do not use \`##\` headings for anything except questions and passages.
- **Metadata lines** go between \`## Question\` and \`### Stem\`, one per line:
  - \`ID:\` a short, unique, stable identifier using letters, numbers, dashes, or periods, such as \`chem-014\` or \`exam3-q27\`. CueBank uses it to recognize the question if the file is imported again, so the student's progress is kept. Never reuse an ID for a different question.
  - \`Tags:\` comma-separated subjects (see Rule 2).
  - \`Source:\` where the question came from, such as "Unit 3 Practice Exam". Use the identical text for every question from the same source.
  - \`Passage:\` the ID of a shared passage, for questions that belong to one (see below).
  - \`Keep order: yes\` when the answer choices must stay in their original order (see below).
- **\`### Stem\`** (required): the question text.
- **\`### Choices\`** (required): one choice per line, each starting with a capital letter, a period, and a space (\`A. \`, \`B. \`, and so on). Use as many choices as the source has. Do not mark or hint at the correct answer.
- **\`### Answer\`** (required): only the letter of the correct choice, such as \`C\`.
- **\`### Explanation\`**: the explanation.
- **\`### Educational Objective\`** (required): see Rule 2.
- **\`### Accuracy Note\`**: only when an approved change calls for it.

### Shared passages

When two or more questions share the same reading passage, data table, graph, experiment description, or case, write that material **once** as a passage, before its questions:

\`\`\`
## Passage
ID: unit3-p1
Title: <optional title>

<passage text, tables, or images>
\`\`\`

Then add \`Passage: unit3-p1\` to the metadata of each question that uses it. CueBank shows the passage beside those questions and keeps them together as a set. If only one question uses some material, put the material in that question's stem instead.

### Keeping the choice order

CueBank may reorder the answer choices when a student sees a question again, so they learn the content rather than the letter. Add \`Keep order: yes\` to a question when reordering would break it:

- A choice refers to other choices ("All of the above", "Both A and B").
- The choices are letters, numbers, or labels that match markings on a figure or image (for example, a diagram with arrows labeled A to E, where the choices are "A", "B", "C"…, or name the structures in that order).
- The stem or a passage refers to a choice by its letter.
- The choices are numbers or values listed in order.
- The source says the order matters.

When in doubt, add \`Keep order: yes\`.

---

## Formatting inside questions

- **Bold** with \`**text**\`, *italics* with \`*text*\`, lists with \`- \` or \`1. \`.
- Tables with standard Markdown pipe tables.
- Math with LaTeX: inline \`$...$\` and displayed \`$$...$$\`. Write money as "USD 5" or "5 dollars" rather than with a dollar sign, so it isn't read as math.
- Do not put \`##\` or \`###\` headings inside a stem, choice, or explanation.

## Images from the source

If the source has a figure, insert it on its own line with a relative path and a short description:

\`\`\`
![Graph of velocity versus time](images/phys-003-graph.png)
\`\`\`

Give each image a unique file name, ideally starting with the question ID. If you cannot extract an image, still write the image line with the intended file name, and list each image the user needs to save (and which question it belongs to) after the code block. The user will put the images in an \`images\` folder next to the .md file and import the folder, or a .zip of it, into CueBank.

---

## Final checklist

- Every question has \`## Question\`, \`ID:\`, \`Tags:\`, \`### Stem\`, \`### Choices\`, \`### Answer\`, and \`### Educational Objective\`.
- Choice letters start at A, are in sequence, and each appears once.
- The answer letter matches one of the choices.
- Every question and passage has a unique ID, and every \`Passage:\` line matches a passage ID in the file.
- Tags and sources are spelled the same way everywhere.
- Nothing has been changed from the source except what Rules 2 and 3 allow.

---

## Complete example

\`\`\`\`markdown
${SAMPLE_FILE}\`\`\`\`
`;
}
