import { useMemo, useState } from "react";
import { buildLlmInstructions, IMPORT_OPTIONS, type ImportOptions } from "../llmInstructions";
import { saveTextFileAs } from "../storage";
import { Markdown } from "../markdown";

const PREF_KEY = "cb-import-options";

function loadPrefs(): ImportOptions {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function InstructionsDialog({ onClose }: { onClose: () => void }) {
  const [opts, setOpts] = useState<ImportOptions>(loadPrefs);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const text = useMemo(() => buildLlmInstructions(opts), [opts]);

  const toggle = (k: keyof ImportOptions) => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-head">
          <h2>AI Import Instructions</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="small muted">
          By default, the AI keeps your questions, answers, and explanations exactly as written, and adds subject tags
          and an Educational Objective. Choose any changes you want it to make, then save or copy the instructions and
          give them to a trusted AI assistant along with your practice questions.
        </p>

        {!preview ? (
          <div className="modal-body options-list">
            {IMPORT_OPTIONS.map((o) => (
              <label key={o.key} className={"option-row" + (opts[o.key] ? " on" : "")}>
                <input type="checkbox" checked={!!opts[o.key]} onChange={() => toggle(o.key)} />
                <span>
                  <strong>{o.label}</strong>
                  <span className="small muted">{o.description}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="modal-body doc">
            <Markdown text={text} assets={{}} />
          </div>
        )}

        <div className="row gap wrap center-y">
          <button className="btn primary" onClick={() => saveTextFileAs("CueBank-AI-Import-Instructions.md", text, ["md"])}>
            Save as .md
          </button>
          <button className="btn" onClick={() => saveTextFileAs("CueBank-AI-Import-Instructions.txt", text, ["txt"])}>
            Save as .txt
          </button>
          <button className="btn" onClick={copy}>{copied ? "Copied!" : "Copy to clipboard"}</button>
          <span className="spacer" />
          <button className="link" onClick={() => setPreview(!preview)}>
            {preview ? "Back to options" : "Preview instructions"}
          </button>
        </div>
      </div>
    </div>
  );
}
