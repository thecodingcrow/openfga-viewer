import { useEffect, useCallback, useRef, useState } from "react";
import Canvas from "./canvas/Canvas";
import SearchBar from "./search/SearchBar";
import Sheet from "./sidebar/Sheet";
import type { SheetTab } from "./sidebar/Sheet";
import ModelInput from "./onboarding/ModelInput";
import FgaEditor from "./editor/FgaEditor";
import PermissionResolutionView from "./sidebar/PermissionResolutionView";
import RoleAuditView from "./sidebar/RoleAuditView";
import PermissionCheckerView from "./sidebar/PermissionCheckerView";
import TypeBrowser from "./sidebar/TypeBrowser";
import { useViewerStore } from "./store/viewer-store";
import type { PersistedAnchor } from "./store/viewer-store";
import { readFgaFile } from "./utils/read-fga-file";

const SHOW_ALPHA_BANNER = import.meta.env.VITE_ALPHA_BANNER === "true";

const STORAGE_KEY_TAB = "openfga-sheet-tab";

// ─── Action buttons for SearchBar ────────────────────────────────────────────

const ActionButtons = () => {
  const setSource = useViewerStore((s) => s.setSource);
  const parse = useViewerStore((s) => s.parse);
  const reactFlowInstance = useViewerStore((s) => s.reactFlowInstance);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setSource(text);
        parse(text);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setSource, parse],
  );

  const handleFit = useCallback(() => {
    reactFlowInstance?.fitView({ duration: 200 });
  }, [reactFlowInstance]);

  const btnClass =
    "w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer";
  const btnStyle = { color: "var(--color-text-muted)" };

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleFit}
        title="Fit view"
        className={btnClass}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,160,23,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 5V2C1 1.5 1.5 1 2 1H5M9 1H12C12.5 1 13 1.5 13 2V5M13 9V12C13 12.5 12.5 13 12 13H9M5 13H2C1.5 13 1 12.5 1 12V9"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Import .fga file"
        className={btnClass}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,160,23,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 9V1M4 4L7 1L10 4M2 11H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => window.open("https://github.com/thecodingcrow/openfga-viewer", "_blank", "noopener")}
        title="View on GitHub"
        className={btnClass}
        style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,160,23,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1C3.7 1 1 3.7 1 7C1 9.5 2.6 11.7 4.8 12.5C5.1 12.5 5.2 12.4 5.2 12.2V11.2C3.5 11.6 3.1 10.4 3.1 10.4C2.8 9.7 2.4 9.5 2.4 9.5C1.9 9.2 2.5 9.2 2.5 9.2C3 9.2 3.3 9.7 3.3 9.7C3.8 10.5 4.6 10.3 5.2 10.1C5.2 9.8 5.4 9.5 5.5 9.3C4.2 9.1 2.8 8.6 2.8 6.4C2.8 5.8 3 5.3 3.3 4.9C3.3 4.7 3.1 4.1 3.4 3.4C3.4 3.4 3.9 3.2 5.2 4C5.8 3.8 6.4 3.8 7 3.8C7.6 3.8 8.2 3.8 8.8 4C10.1 3.2 10.6 3.4 10.6 3.4C10.9 4.1 10.7 4.7 10.7 4.9C11 5.3 11.2 5.8 11.2 6.4C11.2 8.6 9.8 9.1 8.5 9.3C8.7 9.5 8.8 9.9 8.8 10.4V12.2C8.8 12.4 8.9 12.6 9.2 12.5C11.4 11.7 13 9.5 13 7C13 3.7 10.3 1 7 1Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".fga,.openfga,.txt"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};

// ─── Editor tab content (thin wrapper) ───────────────────────────────────────

const EditorTab = () => {
  const parseError = useViewerStore((s) => s.parseError);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <FgaEditor />
      </div>
      {parseError && (
        <div
          className="px-3 py-1.5 text-xs shrink-0"
          style={{
            color: "var(--color-danger)",
            background: "rgba(239, 68, 68, 0.05)",
            borderTop: "1px solid rgba(239, 68, 68, 0.12)",
          }}
        >
          {parseError}
        </div>
      )}
    </div>
  );
};

// ─── Explore tab empty state ──────────────────────────────────────────────────

const ExploreEmptyState = () => (
  <div className="flex flex-col h-full">
    <div className="flex flex-col items-center px-4 pt-8 pb-4 gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: "var(--color-text-muted)" }}>
        <path d="M16 4V12M16 12L8 20M16 12L24 20M8 20V28M24 20V28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
        Select a role or permission to explore
      </div>
      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        See resolution trees and audit downstream permissions
      </div>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-dark" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      <TypeBrowser />
    </div>
  </div>
);

// ─── App ─────────────────────────────────────────────────────────────────────

const App = () => {
  const parse = useViewerStore((s) => s.parse);
  const setSource = useViewerStore((s) => s.setSource);
  const nodes = useViewerStore((s) => s.nodes);
  const fgaSource = useViewerStore((s) => s.fgaSource);
  const anchor = useViewerStore((s) => s.anchor);
  const restoreAnchorFromHistory = useViewerStore((s) => s.restoreAnchorFromHistory);

  const hasModel = nodes.length > 0;

  const [activeTab, setActiveTab] = useState<SheetTab>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_TAB);
    return (stored as SheetTab) || "editor";
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TAB, activeTab);
  }, [activeTab]);

  // Auto-switch tab on anchor change
  useEffect(() => {
    if (!anchor) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync tab with store anchor
    if (anchor.kind === "permission" || anchor.kind === "role") setActiveTab("explore");
    else if (anchor.kind === "checker") setActiveTab("checker");
  }, [anchor]);

  // Parse persisted source on mount
  useEffect(() => {
    if (fgaSource.trim()) {
      parse();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setActiveTab("editor");
      }
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search-bar-input")?.focus();
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Drag and drop
  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      const text = await readFgaFile(file);
      setSource(text);
      parse(text);
    },
    [setSource, parse],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  // Browser back/forward navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { anchor: PersistedAnchor | null } | null;
      restoreAnchorFromHistory(state?.anchor ?? null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [restoreAnchorFromHistory]);

  if (!hasModel) {
    return <ModelInput />;
  }

  // Render active tab content
  const tabContent = (() => {
    switch (activeTab) {
      case "editor":
        return <EditorTab />;
      case "explore":
        if (anchor?.kind === "permission") return <PermissionResolutionView />;
        if (anchor?.kind === "role") return <RoleAuditView />;
        return <ExploreEmptyState />;
      case "checker":
        return <PermissionCheckerView />;
    }
  })();

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
      {SHOW_ALPHA_BANNER && (
        <div
          className="shrink-0"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-accent)",
            fontSize: "0.8rem",
            padding: "4px 12px",
            textAlign: "center",
          }}
        >
          Alpha — This is an early preview. Expect rough edges.
        </div>
      )}
      <SearchBar rightSlot={<ActionButtons />} />
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0">
          <Canvas />
        </div>
        <Sheet activeTab={activeTab} onTabChange={setActiveTab}>
          {tabContent}
        </Sheet>
      </div>
    </div>
  );
};

export default App;
