import { useState } from "react";
import type { AppSettings } from "../storage";
import { COPYRIGHT_HOLDER, COPYRIGHT_YEAR } from "../config";

const THEMES: { key: AppSettings["theme"]; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "Match system" },
];

export default function SettingsDialog({
  settings,
  onChange,
  onClose,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
}) {
  const [notices, setNotices] = useState<string | null>(null);
  const showNotices = async () => {
    try {
      setNotices(await (await fetch("/third-party-notices.txt")).text());
    } catch {
      setNotices("Could not load the notices file.");
    }
  };
  if (notices !== null) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal wide">
          <div className="modal-head">
            <h2>Third-party notices</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
          <pre className="modal-body notices">{notices}</pre>
          <div className="row end">
            <button className="btn" onClick={() => setNotices(null)}>Back to Settings</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <h3 className="section-title">Appearance</h3>
        <div className="seg-row" role="radiogroup" aria-label="Appearance">
          {THEMES.map((t) => (
            <label key={t.key} className={"seg-pill" + (settings.theme === t.key ? " on" : "")}>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === t.key}
                onChange={() => onChange({ ...settings, theme: t.key })}
              />
              {t.label}
            </label>
          ))}
        </div>
        <h3 className="section-title" style={{ marginTop: 22 }}>About</h3>
        <p className="small muted" style={{ margin: "0 0 6px" }}>
          CueBank © {COPYRIGHT_YEAR} {COPYRIGHT_HOLDER}. All rights reserved.
        </p>
        <button className="link small" style={{ paddingLeft: 0 }} onClick={showNotices}>Third-party notices</button>
        <div className="row end" style={{ marginTop: 20 }}>
          <button className="btn primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
