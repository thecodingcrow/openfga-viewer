import { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { ReactNode } from 'react';

export type SheetTab = 'editor' | 'explore' | 'checker';

const TAB_LABELS: Record<SheetTab, string> = {
  editor: 'Editor',
  explore: 'Explore',
  checker: 'Checker',
};

const TAB_ICONS: Record<SheetTab, ReactNode> = {
  editor: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3H13M3 6.5H10M3 10H12M3 13H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  explore: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2V6M8 6L4 10M8 6L12 10M4 10V14M12 10V14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  checker: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L6 12L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const STORAGE_KEYS = {
  width: 'openfga-sheet-width',
  open: 'openfga-sheet-open',
  tab: 'openfga-sheet-tab',
};

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const COLLAPSED_WIDTH = 40;

interface SheetProps {
  activeTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  children: ReactNode;
}

const Sheet = memo(function Sheet({ activeTab, onTabChange, children }: SheetProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.open);
    return stored !== null ? stored === 'true' : true;
  });

  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.width);
    return stored ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(stored))) : DEFAULT_WIDTH;
  });

  const isDragging = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Persist width
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.width, String(width));
  }, [width]);

  // Persist open state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.open, String(isOpen));
  }, [isOpen]);

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX - e.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  // Double-click to collapse
  const handleDoubleClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Collapsed strip
  if (!isOpen) {
    return (
      <div
        className="flex flex-col items-center py-2 gap-1 shrink-0"
        style={{
          width: COLLAPSED_WIDTH,
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {(Object.keys(TAB_LABELS) as SheetTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              onTabChange(tab);
              setIsOpen(true);
            }}
            title={TAB_LABELS[tab]}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors"
            style={{
              color: tab === activeTab ? 'var(--color-accent)' : 'var(--color-text-muted)',
              background: tab === activeTab ? 'rgba(212, 160, 23, 0.08)' : 'transparent',
            }}
          >
            {TAB_ICONS[tab]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={sheetRef}
      className="flex flex-col h-full shrink-0 relative"
      style={{
        width,
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10"
        style={{ width: 4, cursor: 'col-resize' }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />

      {/* Tab bar */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        {(Object.keys(TAB_LABELS) as SheetTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex-1 py-2 text-xs text-center transition-colors"
            style={{
              color: tab === activeTab ? 'var(--color-accent)' : 'var(--color-text-muted)',
              background: tab === activeTab ? 'var(--color-surface-raised)' : 'transparent',
              borderBottom: tab === activeTab ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
});

export default Sheet;
