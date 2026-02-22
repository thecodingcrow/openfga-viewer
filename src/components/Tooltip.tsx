import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface TruncationTooltipProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Max width before the tooltip wraps long expressions */
const MAX_TOOLTIP_WIDTH = 400;

/**
 * A span that renders `text` and shows a styled tooltip on hover --
 * but ONLY when the text is truncated (scrollWidth > clientWidth).
 *
 * Uses createPortal to render the tooltip into document.body so it is
 * never clipped by parent overflow:hidden containers (e.g. TypeCardNode).
 *
 * Mouse handlers are scoped to the span element only. They do NOT
 * call stopPropagation, so parent row hover handlers still fire normally.
 */
export function TruncationTooltip({
  text,
  className,
  style,
}: TruncationTooltipProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    flipBelow: boolean;
  } | null>(null);

  const onMouseEnter = useCallback(() => {
    const el = spanRef.current;
    if (!el) return;
    // Only show tooltip when text is actually truncated
    if (el.scrollWidth <= el.clientWidth) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const aboveY = rect.top;
    const flipBelow = aboveY < 40; // flip below if too close to viewport top

    setTooltip({ x: centerX, y: flipBelow ? rect.bottom : aboveY, flipBelow });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <>
      <span
        ref={spanRef}
        className={className}
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {text}
      </span>
      {tooltip !== null &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.flipBelow ? tooltip.y + 6 : tooltip.y - 6,
              transform: tooltip.flipBelow
                ? "translateX(-50%)"
                : "translateX(-50%) translateY(-100%)",
              background: "var(--color-surface-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.7rem",
              padding: "4px 8px",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              pointerEvents: "none",
              zIndex: 9999,
              maxWidth: MAX_TOOLTIP_WIDTH,
              wordBreak: "break-all",
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
