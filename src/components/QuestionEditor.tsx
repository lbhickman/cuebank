import { useState } from "react";
import type { Question } from "../types";
import { splitTags } from "../parser";
import { IconPlus, IconTrash } from "./Icons";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Simple editor for fixing a question's text, answer, or tags. The question keeps its ID and progress. */
export default function QuestionEditor({
  question,
  onSave,
  onCancel,
}: {
  question: Question;
  onSave: (q: Question) => void;
  onCancel: () => void;
}) {
  const [stem, setStem] = useState(question.stem);
  const [choices, setChoices] = useState(question.choices.map((c) => c.text));
  const [answerIdx, setAnswerIdx] = useState(Math.max(0, question.choices.findIndex((c) => c.label === question.answer)));
  const [explanation, setExplanation] = useState(question.explanation);
  const [objective, setObjective] = useState(question.objective || "");
  const [tags, setTags] = useState(question.tags.join(", "));
  const [source, setSource] = useState(question.source);
  const [keepOrder, setKeepOrder] = useState(!!question.keepOrder);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const filled = choices.map((c) => c.trim());
    if (!stem.trim()) return setError("The question text can't be empty.");
    if (filled.filter(Boolean).length < 2) return setError("A question needs at least two answer choices.");
    if (filled.some((c) => !c)) return setError("Remove or fill in empty answer choices.");
    onSave({
      ...question,
      stem: stem.trim(),
      choices: filled.map((text, i) => ({ label: LETTERS[i], text })),
      answer: LETTERS[Math.min(answerIdx, filled.length - 1)],
      explanation: explanation.trim(),
      objective: objective.trim() || undefined,
      tags: Array.from(new Set(splitTags(tags))),
      source: source.trim(),
      keepOrder: keepOrder || undefined,
    });
  };

  return (
    <div className="q-editor">
      <label className="field">
        <span>Question</span>
        <textarea rows={5} value={stem} onChange={(e) => setStem(e.target.value)} />
      </label>

      <div className="field">
        <span>Answer choices (select the correct one)</span>
        {choices.map((c, i) => (
          <div key={i} className="choice-edit">
            <input
              type="radio"
              name="correct"
              checked={answerIdx === i}
              onChange={() => setAnswerIdx(i)}
              aria-label={`Mark choice ${LETTERS[i]} correct`}
            />
            <strong>{LETTERS[i]}.</strong>
            <input
              value={c}
              aria-label={`Choice ${LETTERS[i]}`}
              onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              className="icon-btn"
              disabled={choices.length <= 2}
              aria-label={`Remove choice ${LETTERS[i]}`}
              onClick={() => {
                setChoices(choices.filter((_, j) => j !== i));
                if (answerIdx >= i && answerIdx > 0) setAnswerIdx(answerIdx - (answerIdx === i ? 0 : 1));
              }}
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
        {choices.length < 26 && (
          <button className="link small" onClick={() => setChoices([...choices, ""])}>
            <IconPlus size={14} /> Add choice
          </button>
        )}
      </div>

      <label className="field">
        <span>Explanation</span>
        <textarea rows={6} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </label>
      <label className="field">
        <span>Educational Objective</span>
        <textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
      </label>
      <div className="row gap wrap">
        <label className="field grow">
          <span>Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label className="field grow">
          <span>Source</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
      </div>
      <label className="check small">
        <input type="checkbox" checked={keepOrder} onChange={(e) => setKeepOrder(e.target.checked)} />
        Keep answer choices in this order when the question repeats
      </label>
      <p className="tiny muted">Text supports Markdown, tables, and math with $...$.</p>
      {error && <div className="notice bad">{error}</div>}
      <div className="row gap end">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}
