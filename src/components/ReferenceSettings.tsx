import { useEffect, useState } from "react";
import type { LabRow, ReferenceSetting } from "../types";
import { REFERENCE_KINDS, referenceOf } from "../references";
import { Markdown } from "../markdown";
import type { ShellProps } from "./BankShell";
import LabSettings from "./LabSettings";
import { ReferenceBody } from "./ReferencePanel";

export default function ReferenceSettings({
  bank,
  updateBank,
  labs,
  updateLabs,
}: ShellProps & { labs: LabRow[]; updateLabs: (rows: LabRow[] | null) => Promise<void> }) {
  const ref = referenceOf(bank);
  const [title, setTitle] = useState(ref.title || "");
  const [text, setText] = useState(ref.text || "");

  useEffect(() => {
    setTitle(ref.title || "");
    setText(ref.text || "");
  }, [bank.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRef = (r: ReferenceSetting) => updateBank((b) => ({ ...b, reference: r }), true);

  return (
    <div className="page">
      <h1 className="page-title">Reference</h1>
      <p className="muted small">
        Choose the reference panel available during tests in this bank. It opens from the toolbar while you answer.
      </p>

      <section className="card">
        <h3 className="section-title">Reference for "{bank.name}"</h3>
        <div className="ref-kinds">
          {REFERENCE_KINDS.map((k) => (
            <label key={k.kind} className={"option-row" + (ref.kind === k.kind ? " on" : "")}>
              <input
                type="radio"
                name="ref-kind"
                checked={ref.kind === k.kind}
                onChange={() => setRef(k.kind === "custom" ? { kind: "custom", title, text } : { kind: k.kind })}
              />
              <span>
                <strong>{k.label}</strong>
                <span className="small muted">{k.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {ref.kind === "custom" && (
        <section className="card">
          <h3 className="section-title">Custom reference</h3>
          <div className="row gap center-y wrap" style={{ marginBottom: 10 }}>
            <label className="small" htmlFor="ref-title">Title</label>
            <input
              id="ref-title"
              className="grow"
              placeholder="e.g. Physics Equations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setRef({ kind: "custom", title, text })}
            />
          </div>
          <p className="small muted">Supports Markdown: headings, lists, tables, and math with $...$.</p>
          <div className="two-col editor-split">
            <textarea
              className="code-area"
              aria-label="Custom reference text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => setRef({ kind: "custom", title, text })}
              placeholder={"## Key equations\n\n- $F = ma$\n- $v = d / t$"}
            />
            <div className="card ref-doc preview-box">
              <Markdown text={text || "_Preview appears here._"} assets={{}} />
            </div>
          </div>
        </section>
      )}

      {ref.kind === "labs" && <LabSettings labs={labs} updateLabs={updateLabs} />}

      {(ref.kind === "periodic" || ref.kind === "formulas") && (
        <section className="card ref-preview">
          <h3 className="section-title">Preview</h3>
          <ReferenceBody reference={ref} />
        </section>
      )}
    </div>
  );
}
