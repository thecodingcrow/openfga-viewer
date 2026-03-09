import { useState, useCallback, useRef } from "react";
import { useViewerStore } from "../store/viewer-store";
import { readFgaFile } from "../utils/read-fga-file";
import { SAMPLE_FGA_MODEL } from "../parser/sample-model";

const ModelInput = () => {
  const [dslText, setDslText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const setSource = useViewerStore((s) => s.setSource);
  const parse = useViewerStore((s) => s.parse);

  const handleParse = useCallback(() => {
    const text = dslText.trim();
    if (!text) {
      setError("Paste an FGA model or drop a .fga file");
      return;
    }
    setSource(text);
    try {
      parse(text);
      setError(null);
    } catch {
      setError("Failed to parse FGA model");
    }
  }, [dslText, setSource, parse]);

  const handleLoadSample = useCallback(() => {
    setSource(SAMPLE_FGA_MODEL);
    parse(SAMPLE_FGA_MODEL);
    setError(null);
  }, [setSource, parse]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      try {
        const text = await readFgaFile(file);
        setSource(text);
        parse(text);
        setError(null);
      } catch {
        setError("Failed to read file");
      }
    },
    [setSource, parse],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div
      className="w-screen h-screen flex items-center justify-center"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-[560px] flex flex-col gap-4 p-6 rounded-xl"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Title */}
        <div className="text-center">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            OpenFGA Model Viewer
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Paste your FGA authorization model or drop a .fga file
          </p>
        </div>

        {/* Textarea / drop zone */}
        <div
          className="relative rounded-lg overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: dragOver
              ? "2px dashed var(--color-accent)"
              : "2px dashed var(--color-border)",
            transition: "border-color 150ms ease",
          }}
        >
          <textarea
            ref={textareaRef}
            value={dslText}
            onChange={(e) => { setDslText(e.target.value); setError(null); }}
            placeholder={`model\n  schema 1.1\n\ntype user\n\ntype document\n  relations\n    define viewer: [user]`}
            className="w-full h-[240px] resize-none bg-transparent outline-none text-xs p-3 font-mono"
            style={{ color: "var(--color-text-secondary)" }}
            spellCheck={false}
          />
          {dragOver && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(212,160,23,0.06)" }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                Drop .fga file
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleParse}
            className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-bg)",
            }}
          >
            Parse & Explore
          </button>
          <button
            onClick={handleLoadSample}
            className="py-2 px-4 rounded-lg text-sm cursor-pointer transition-colors"
            style={{
              color: "var(--color-text-secondary)",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            Load sample
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelInput;
