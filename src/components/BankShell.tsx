import { useState, type ReactNode } from "react";
import type { Bank, LabRow } from "../types";
import type { AssetMap } from "../storage";
import CreateTest from "./CreateTest";
import PreviousTests from "./PreviousTests";
import Performance from "./Performance";
import QuestionBrowser from "./QuestionBrowser";
import ReferenceSettings from "./ReferenceSettings";
import InstructionsDialog from "./InstructionsDialog";
import TestResults from "./TestResults";
import { IconBook, IconChart, IconDoc, IconGear, IconList, IconPlus, IconSearch, IconSwap, IconUpload } from "./Icons";

export type View = "create" | "previous" | "performance" | "questions" | "import" | "reference" | `results:${string}`;

export interface ShellProps {
  bank: Bank;
  assets: AssetMap;
  updateBank: (fn: (b: Bank) => Bank, immediate?: boolean) => void;
  startTest: (testId: string) => void;
}

export default function BankShell(
  props: ShellProps & {
    view: View;
    setView: (v: View) => void;
    closeBank: () => void;
    labs: LabRow[];
    updateLabs: (rows: LabRow[] | null) => Promise<void>;
    importView: ReactNode;
    openSettings: () => void;
  },
) {
  const { bank, view, setView } = props;
  const [showGuide, setShowGuide] = useState(false);

  const nav: { id: View; label: string; icon: JSX.Element }[] = [
    { id: "create", label: "Create Test", icon: <IconPlus /> },
    { id: "previous", label: "Previous Tests", icon: <IconList /> },
    { id: "performance", label: "Performance", icon: <IconChart /> },
    { id: "questions", label: "Question Library", icon: <IconSearch /> },
    { id: "import", label: "Import Questions", icon: <IconUpload /> },
    { id: "reference", label: "Reference", icon: <IconBook /> },
  ];

  const isActive = (id: View) => view === id || (id === "previous" && view.startsWith("results:"));

  let body;
  if (view === "create") body = <CreateTest {...props} goImport={() => setView("import")} />;
  else if (view === "previous") body = <PreviousTests {...props} openResults={(id) => setView(`results:${id}`)} />;
  else if (view === "performance") body = <Performance {...props} />;
  else if (view === "questions") body = <QuestionBrowser {...props} />;
  else if (view === "import") body = props.importView;
  else if (view === "reference") body = <ReferenceSettings {...props} />;
  else if (view.startsWith("results:"))
    body = <TestResults {...props} testId={view.slice(8)} back={() => setView("previous")} />;

  return (
    <div className="shell">
      <aside className="shell-nav">
        <div className="brand">
          <img src="/icon.png" alt="" />
          <span>CueBank</span>
        </div>
        <div className="bank-label" title={bank.name}>
          <span className="small">Question bank</span>
          <strong>{bank.name}</strong>
          <span className="small">{bank.questions.length} questions</span>
        </div>
        <nav>
          {nav.map((n) => (
            <button key={n.id} className={"nav-item" + (isActive(n.id) ? " active" : "")} onClick={() => setView(n.id)}>
              {n.icon}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="nav-bottom">
          <button className="nav-item" onClick={() => setShowGuide(true)}>
            <IconDoc />
            <span>AI Import Instructions</span>
          </button>
          <button className="nav-item" onClick={props.openSettings}>
            <IconGear />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={props.closeBank}>
            <IconSwap />
            <span>Switch Bank</span>
          </button>
        </div>
      </aside>
      <main className="shell-main">{body}</main>
      {showGuide && <InstructionsDialog onClose={() => setShowGuide(false)} />}
    </div>
  );
}
