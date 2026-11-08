import { createContext, useContext, useMemo, useState } from "react";
import type { LabRow, ReferenceSetting } from "../types";
import { DEFAULT_LABS } from "../labValues";
import { ELEMENTS, MATH_FORMULAS, referenceTitle } from "../references";
import { Markdown } from "../markdown";

export const LabsContext = createContext<LabRow[]>(DEFAULT_LABS);

export function LabsTable() {
  const labs = useContext(LabsContext);
  const sections = useMemo(() => Array.from(new Set(labs.map((r) => r.section))), [labs]);
  const [tab, setTab] = useState(sections[0] || "");
  const [query, setQuery] = useState("");
  const [si, setSi] = useState(false);
  const q = query.trim().toLowerCase();
  const rows = q ? labs.filter((r) => (r.name + " " + r.section).toLowerCase().includes(q)) : labs.filter((r) => r.section === tab);

  return (
    <>
      <div className="labs-tools">
        <input placeholder="Search labs…" aria-label="Search labs" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="small check">
          <input type="checkbox" checked={si} onChange={(e) => setSi(e.target.checked)} /> SI units
        </label>
      </div>
      {!q && (
        <div className="labs-tabs">
          {sections.map((s) => (
            <button key={s} className={s === tab ? "on" : ""} onClick={() => setTab(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="labs-table-wrap">
        <table className="labs-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>{si ? "SI reference range" : "Reference range"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.section + r.name + i}>
                <td>
                  {r.name}
                  {q && <div className="tiny muted">{r.section}</div>}
                </td>
                <td>{si ? r.si : r.conventional}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={2} className="muted">No matching labs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PeriodicTable() {
  const [hover, setHover] = useState<number | null>(null);
  const el = hover ? ELEMENTS[hover - 1] : null;
  return (
    <div className="ptable-wrap">
      <div className="ptable" role="table" aria-label="Periodic table of the elements">
        {ELEMENTS.map((e) => (
          <div
            key={e.n}
            role="cell"
            className={"pcell" + (e.row >= 9 ? " fblock" : "")}
            style={{ gridRow: e.row >= 9 ? e.row : e.row, gridColumn: e.col }}
            title={`${e.name} (${e.n}), ${e.mass}`}
            onMouseEnter={() => setHover(e.n)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="pnum">{e.n}</span>
            <span className="psym">{e.sym}</span>
            <span className="pmass">{e.mass}</span>
          </div>
        ))}
        <div className="pgap" style={{ gridRow: 8, gridColumn: "1 / span 18" }} />
      </div>
      <p className="small muted ptable-info">
        {el ? `${el.name}: atomic number ${el.n}, atomic mass ${el.mass}` : "Hover over an element for its name. Masses in brackets are for the most stable isotope."}
      </p>
    </div>
  );
}

export function ReferenceBody({ reference }: { reference: ReferenceSetting }) {
  if (reference.kind === "labs") return <LabsTable />;
  if (reference.kind === "periodic") return <PeriodicTable />;
  if (reference.kind === "formulas")
    return (
      <div className="ref-doc">
        <Markdown text={MATH_FORMULAS} assets={{}} />
      </div>
    );
  if (reference.kind === "custom")
    return (
      <div className="ref-doc">
        <Markdown text={reference.text || "_This reference is empty. Add text under Reference in the main menu._"} assets={{}} />
      </div>
    );
  return null;
}

export default function ReferencePanel({ reference, onClose }: { reference: ReferenceSetting; onClose: () => void }) {
  return (
    <aside className={"labs-panel" + (reference.kind === "periodic" ? " wide" : "")}>
      <div className="labs-head">
        <strong>{referenceTitle(reference)}</strong>
        <button className="icon-btn light" onClick={onClose} aria-label="Close reference">×</button>
      </div>
      <div className="ref-body">
        <ReferenceBody reference={reference} />
      </div>
    </aside>
  );
}
