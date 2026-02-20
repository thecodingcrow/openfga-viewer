import { useState, useEffect, useCallback } from "react";
import Canvas from "./canvas/Canvas";
import { Breadcrumb } from "./canvas/Breadcrumb";
import EditorPanel from "./editor/EditorPanel";
import Toolbar from "./toolbar/Toolbar";
import { useViewerStore } from "./store/viewer-store";

const DISMISS_KEY = "openfga-viewer-alpha-dismissed";

const App = () => {
  const parse = useViewerStore((s) => s.parse);
  const toggleEditor = useViewerStore((s) => s.toggleEditor);
  const setSource = useViewerStore((s) => s.setSource);

  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "true",
  );

  useEffect(() => {
    parse();
  }, [parse]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        toggleEditor();
      }
    },
    [toggleEditor],
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
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [handleDrop, handleDragOver]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setBannerDismissed(true);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {!bannerDismissed && (
        <div
          style={{
            background: "#1a1a2e",
            color: "#f59e0b",
            fontSize: "0.8rem",
            padding: "4px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 50,
          }}
        >
          <span>
            Alpha — This is an early preview. Expect rough edges.
          </span>
          <button
            onClick={dismissBanner}
            style={{
              background: "none",
              border: "none",
              color: "#f59e0b",
              cursor: "pointer",
              marginLeft: "12px",
              fontSize: "1rem",
              lineHeight: 1,
              padding: "0 4px",
            }}
            aria-label="Dismiss banner"
          >
            ×
          </button>
        </div>
      )}
      <Canvas />
      <Breadcrumb />
      <Toolbar />
      <EditorPanel />
    </div>
  );
};

export default App;
