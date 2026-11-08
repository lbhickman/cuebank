import { useCallback, useEffect, useRef, useState } from "react";
import type { Bank, BankMeta, LabRow } from "./types";
import * as store from "./storage";
import type { AppSettings, AssetMap } from "./storage";
import { DEFAULT_LABS } from "./labValues";
import { applyImport, type ImportPreview } from "./importer";
import BankPicker from "./components/BankPicker";
import BankShell, { type View } from "./components/BankShell";
import TestRunner from "./components/TestRunner";
import ImportView, { type ImportTarget } from "./components/ImportView";
import SettingsDialog from "./components/SettingsDialog";
import { LabsContext } from "./components/ReferencePanel";

const { newBank } = store;

export default function App() {
  const [index, setIndex] = useState<BankMeta[] | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [assets, setAssets] = useState<AssetMap>({});
  const [view, setView] = useState<View>("create");
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabRow[]>(DEFAULT_LABS);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ theme: "system" });
  const [showSettings, setShowSettings] = useState(false);
  const [pickerImport, setPickerImport] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const pending = useRef<Bank | null>(null);

  useEffect(() => {
    store.loadBankIndex().then(setIndex);
    store.loadLabs().then((l) => l && l.length && setLabs(l));
    store.loadSettings().then(setSettings);
  }, []);

  // Appearance: light, dark, or follow the Mac's setting.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const updateSettings = (s: AppSettings) => {
    setSettings(s);
    void store.saveSettings(s);
  };

  const refreshIndexFor = useCallback(async (b: Bank) => {
    const list = await store.loadBankIndex();
    const meta = { id: b.id, name: b.name, createdAt: b.createdAt, updatedAt: Date.now(), questionCount: b.questions.length };
    const next = list.some((m) => m.id === b.id) ? list.map((m) => (m.id === b.id ? meta : m)) : [...list, meta];
    await store.saveBankIndex(next);
    setIndex(next);
  }, []);

  const flush = useCallback(async () => {
    const b = pending.current;
    if (!b) return;
    pending.current = null;
    try {
      await store.saveBank(b);
      await refreshIndexFor(b);
      setSaveError(null);
    } catch (e) {
      setSaveError(String(e));
    }
  }, [refreshIndexFor]);

  // Save shortly after each change, and immediately when the window closes.
  const updateBank = useCallback(
    (fn: (b: Bank) => Bank, immediate = false) => {
      setBank((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        pending.current = next;
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(flush, immediate ? 0 : 400);
        return next;
      });
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  const openBank = async (id: string, goTo?: View) => {
    const b = await store.loadBank(id);
    if (!b) {
      alert("This bank's data file could not be found.");
      return;
    }
    setAssets(await store.loadAssets(id));
    setBank(b);
    setView(goTo || (b.questions.length ? "create" : "import"));
    setActiveTestId(null);
    setPickerImport(false);
  };

  const closeBank = async () => {
    await flush();
    setBank(null);
    setAssets({});
    setActiveTestId(null);
    setIndex(await store.loadBankIndex());
  };

  /** The bank an import preview is checked against (the open one, a saved one, or a new empty one). */
  const bankForTarget = async (t: ImportTarget): Promise<Bank> => {
    if (t.kind === "existing") {
      if (bank && bank.id === t.id) return bank;
      return (await store.loadBank(t.id)) || newBank("Untitled");
    }
    return newBank(t.name || "New bank");
  };

  /** Imports into the chosen bank and returns its id. Progress on existing questions is never touched. */
  const runImport = async (t: ImportTarget, preview: ImportPreview, includeUpdates: boolean): Promise<string> => {
    if (t.kind === "existing" && bank && bank.id === t.id) {
      if (Object.keys(preview.newAssets).length) {
        const merged = { ...assets, ...preview.newAssets };
        setAssets(merged);
        await store.saveAssets(bank.id, merged);
      }
      updateBank((b) => applyImport(b, preview, includeUpdates), true);
      return bank.id;
    }
    const base = await bankForTarget(t);
    const updated = applyImport(base, preview, includeUpdates);
    await store.saveBank(updated);
    if (Object.keys(preview.newAssets).length) {
      const old = await store.loadAssets(updated.id);
      await store.saveAssets(updated.id, { ...old, ...preview.newAssets });
    }
    await refreshIndexFor(updated);
    return updated.id;
  };

  const updateLabs = async (rows: LabRow[] | null) => {
    if (rows) {
      setLabs(rows);
      await store.saveLabs(rows);
    } else {
      setLabs(DEFAULT_LABS);
      await store.resetLabs();
    }
  };

  if (!index) return <div className="splash">Loading…</div>;

  const importView = (standalone: boolean) => (
    <ImportView
      index={index}
      currentBankId={bank?.id}
      bankForTarget={bankForTarget}
      runImport={runImport}
      onBack={standalone ? () => setPickerImport(false) : undefined}
      onOpenBank={(id) => {
        if (bank && bank.id === id) setView("create");
        else void openBank(id, "create");
      }}
    />
  );

  let content;
  if (!bank) {
    content = pickerImport ? (
      <div className="standalone-page">{importView(true)}</div>
    ) : (
      <BankPicker
        index={index}
        setIndex={setIndex}
        onOpen={(id) => openBank(id)}
        onImport={() => setPickerImport(true)}
        onSettings={() => setShowSettings(true)}
      />
    );
  } else if (activeTestId) {
    content = (
      <TestRunner
        bank={bank}
        assets={assets}
        testId={activeTestId}
        updateBank={updateBank}
        onExit={(goTo) => {
          setActiveTestId(null);
          if (goTo) setView(goTo);
          void flush();
        }}
      />
    );
  } else {
    content = (
      <BankShell
        bank={bank}
        assets={assets}
        view={view}
        setView={setView}
        updateBank={updateBank}
        startTest={(id) => setActiveTestId(id)}
        closeBank={closeBank}
        labs={labs}
        updateLabs={updateLabs}
        importView={importView(false)}
        openSettings={() => setShowSettings(true)}
      />
    );
  }

  return (
    <LabsContext.Provider value={labs}>
      {saveError && (
        <div className="save-error">
          Could not save your progress: {saveError}
          <button onClick={() => setSaveError(null)}>Dismiss</button>
        </div>
      )}
      {content}
      {showSettings && <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setShowSettings(false)} />}
    </LabsContext.Provider>
  );
}
