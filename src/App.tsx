import { useEffect, useCallback } from "react";
import Canvas from "./canvas/Canvas";
import EditorPanel from "./editor/EditorPanel";
import Toolbar from "./toolbar/Toolbar";
import { useViewerStore } from "./store/viewer-store";

const App = () => {
  const parse = useViewerStore((s) => s.parse);
  const toggleEditor = useViewerStore((s) => s.toggleEditor);
  const setSource = useViewerStore((s) => s.setSource);

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

  return (
    <div className="w-screen h-screen flex flex-col">
      <Toolbar />
      <div className="flex-1 flex flex-row pt-12 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          <Canvas />
        </div>
        <EditorPanel />
      </div>
    </div>
  );
};

export default App;
