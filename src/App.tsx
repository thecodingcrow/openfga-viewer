import { useEffect, useCallback } from "react";
import Canvas from "./canvas/Canvas";
import EditorPanel from "./editor/EditorPanel";
import Toolbar from "./toolbar/Toolbar";
import Sidebar from "./sidebar/Sidebar";
import SearchBar from "./search/SearchBar";
import ModelInput from "./onboarding/ModelInput";
import { useViewerStore } from "./store/viewer-store";
import { readFgaFile } from "./utils/read-fga-file";

const SHOW_ALPHA_BANNER = import.meta.env.VITE_ALPHA_BANNER === "true";

const App = () => {
  const parse = useViewerStore((s) => s.parse);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const setSource = useViewerStore((s) => s.setSource);
  const nodes = useViewerStore((s) => s.nodes);
  const fgaSource = useViewerStore((s) => s.fgaSource);
  const popSubgraph = useViewerStore((s) => s.popSubgraph);
  const navDepth = useViewerStore((s) => s.navigationStack.length);

  const hasModel = nodes.length > 0;

  useEffect(() => {
    if (fgaSource.trim()) {
      parse();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- parse persisted source once on mount

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        togglePanel();
      }
      // "/" focuses search bar (only when not in input/textarea)
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
      if (e.key === "Escape") {
        if (navDepth > 0) {
          popSubgraph();
          window.history.back();
        }
      }
    },
    [togglePanel, navDepth, popSubgraph],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
    const handlePopState = (e: PopStateEvent) => {
      const targetDepth = (e.state as { stackDepth?: number })?.stackDepth ?? 0;
      const currentDepth = useViewerStore.getState().navigationStack.length;
      if (targetDepth < currentDepth) {
        useViewerStore.getState().jumpToLevel(targetDepth);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  // Show model input when no model is loaded
  if (!hasModel) {
    return <ModelInput />;
  }

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
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <SearchBar />
          <div className="relative flex-1 min-h-0">
            <Canvas />
            <EditorPanel />
            <Toolbar />
          </div>
        </div>
        <Sidebar />
      </div>
    </div>
  );
};

export default App;
