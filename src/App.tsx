import { useEffect, useCallback } from "react";
import Canvas from "./canvas/Canvas";
import Breadcrumb from "./canvas/Breadcrumb";
import EditorPanel from "./editor/EditorPanel";
import Toolbar from "./toolbar/Toolbar";
import InspectPanel from "./inspect/InspectPanel";
import { useViewerStore } from "./store/viewer-store";

const SHOW_ALPHA_BANNER = import.meta.env.VITE_ALPHA_BANNER === "true";

const App = () => {
  const parse = useViewerStore((s) => s.parse);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const toggleSearch = useViewerStore((s) => s.toggleSearch);
  const searchOpen = useViewerStore((s) => s.searchOpen);
  const setSearchOpen = useViewerStore((s) => s.setSearchOpen);
  const setSource = useViewerStore((s) => s.setSource);
  const popSubgraph = useViewerStore((s) => s.popSubgraph);
  const navDepth = useViewerStore((s) => s.navigationStack.length);

  useEffect(() => {
    parse();
  }, [parse]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        togglePanel();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (navDepth > 0) {
          popSubgraph();
          window.history.back();
        }
      }
    },
    [togglePanel, toggleSearch, searchOpen, setSearchOpen, navDepth, popSubgraph],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setSource(text);
        parse(text);
      };
      reader.readAsText(file);
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

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {SHOW_ALPHA_BANNER && (
        <div
          style={{
            background: "#1a1a2e",
            color: "#f59e0b",
            fontSize: "0.8rem",
            padding: "4px 12px",
            textAlign: "center",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
          }}
        >
          Alpha — This is an early preview. Expect rough edges.
        </div>
      )}
      <Canvas />
      <Breadcrumb />
      <EditorPanel />
      <Toolbar />
      <InspectPanel />
    </div>
  );
};

export default App;
