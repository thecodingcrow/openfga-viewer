import { useCallback, useRef } from "react";
import { useViewerStore } from "../store/viewer-store";
import CommandPalette from "./CommandPalette";

const REPO_URL = "https://github.com/evansims/openfga-viewer";

// ─── Icon-only button ────────────────────────────────────────────────────────

const ToolbarButton = ({
  onClick,
  title,
  children,
  active = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    title={title}
    className="w-8 h-8 flex items-center justify-center rounded transition-all duration-150 cursor-pointer relative"
    style={{
      color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
      background: active ? "rgba(212, 160, 23, 0.08)" : "transparent",
      border: active ? "1px solid rgba(212, 160, 23, 0.25)" : "1px solid transparent",
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = "rgba(212, 160, 23, 0.05)";
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    {children}
  </button>
);

const Separator = () => (
  <div
    className="h-px w-5 my-0.5"
    style={{ background: "var(--color-border)" }}
  />
);

// ─── Toolbar ────────────────────────────────────────────────────────────────

const Toolbar = () => {
  const panelOpen = useViewerStore((s) => s.panelOpen);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const searchOpen = useViewerStore((s) => s.searchOpen);
  const setSearchOpen = useViewerStore((s) => s.setSearchOpen);
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

  return (
    <>
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 px-1.5 py-2"
        style={{
          background: "var(--color-surface-overlay)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
        }}
      >
        {/* Panel toggle */}
        <ToolbarButton
          onClick={togglePanel}
          title="Toggle panel (Cmd+E)"
          active={panelOpen}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" fill={panelOpen ? "currentColor" : "none"} fillOpacity={panelOpen ? 0.2 : 0} />
            <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </ToolbarButton>

        <Separator />

        {/* Search */}
        <ToolbarButton
          onClick={() => setSearchOpen(true)}
          title="Search (Cmd+K)"
          active={searchOpen}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </ToolbarButton>

        <Separator />

        {/* Fit view */}
        <ToolbarButton onClick={handleFit} title="Fit view">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 5V2C1 1.5 1.5 1 2 1H5M9 1H12C12.5 1 13 1.5 13 2V5M13 9V12C13 12.5 12.5 13 12 13H9M5 13H2C1.5 13 1 12.5 1 12V9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </ToolbarButton>

        {/* Import */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Import .fga file"
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 9V1M4 4L7 1L10 4M2 11H12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </ToolbarButton>

        {/* GitHub */}
        <ToolbarButton
          onClick={() => window.open(REPO_URL, "_blank", "noopener")}
          title="View on GitHub"
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1C3.7 1 1 3.7 1 7C1 9.5 2.6 11.7 4.8 12.5C5.1 12.5 5.2 12.4 5.2 12.2V11.2C3.5 11.6 3.1 10.4 3.1 10.4C2.8 9.7 2.4 9.5 2.4 9.5C1.9 9.2 2.5 9.2 2.5 9.2C3 9.2 3.3 9.7 3.3 9.7C3.8 10.5 4.6 10.3 5.2 10.1C5.2 9.8 5.4 9.5 5.5 9.3C4.2 9.1 2.8 8.6 2.8 6.4C2.8 5.8 3 5.3 3.3 4.9C3.3 4.7 3.1 4.1 3.4 3.4C3.4 3.4 3.9 3.2 5.2 4C5.8 3.8 6.4 3.8 7 3.8C7.6 3.8 8.2 3.8 8.8 4C10.1 3.2 10.6 3.4 10.6 3.4C10.9 4.1 10.7 4.7 10.7 4.9C11 5.3 11.2 5.8 11.2 6.4C11.2 8.6 9.8 9.1 8.5 9.3C8.7 9.5 8.8 9.9 8.8 10.4V12.2C8.8 12.4 8.9 12.6 9.2 12.5C11.4 11.7 13 9.5 13 7C13 3.7 10.3 1 7 1Z"
              fill="currentColor"
            />
          </svg>
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept=".fga,.openfga,.txt"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Toolbar;
