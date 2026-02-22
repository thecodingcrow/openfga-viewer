import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SchemaCard, CardRow } from "../../types";
import { useHoverStore } from "../../store/hover-store";
import { useViewerStore } from "../../store/viewer-store";

/** React Flow requires [key: string]: unknown on node data */
type TypeCardData = SchemaCard & { [key: string]: unknown };

/** Section background colors — banded shades per CONTEXT.md locked decision */
const SECTION_BG: Record<CardRow["section"], string> = {
  binding: "rgba(15, 23, 42, 0.95)",
  relation: "rgba(15, 23, 42, 0.88)",
  permission: "rgba(15, 23, 42, 0.80)",
};

/** Neutral dot color for relation/permission rows */
const NEUTRAL_DOT = "#64748b";

/** Hidden handle style — exists for edge attachment only */
const hiddenHandle: React.CSSProperties = {
  opacity: 0,
  width: 6,
  height: 6,
};

/** Subtle background tint for highlighted rows */
const HIGHLIGHTED_ROW_BG = "rgba(136, 204, 238, 0.08)";

function TypeCardNodeComponent({ id, data }: NodeProps) {
  const d = data as TypeCardData;

  // Hover state from hover store
  const isHoverActive = useHoverStore((s) => s.isHoverActive);
  const highlightedRowIds = useHoverStore((s) => s.highlightedRowIds);
  const highlightedNodeIds = useHoverStore((s) => s.highlightedNodeIds);
  const setHoveredRow = useHoverStore((s) => s.setHoveredRow);
  const setHoveredCard = useHoverStore((s) => s.setHoveredCard);
  const clearHover = useHoverStore((s) => s.clearHover);

  // Full graph data for BFS (stable references — only change on parse)
  const fullEdges = useViewerStore((s) => s.edges);
  const fullNodes = useViewerStore((s) => s.nodes);

  // Determine if this card participates in current hover
  const cardParticipates = isHoverActive && (
    d.rows.some((r) => highlightedRowIds.has(r.id)) ||
    highlightedNodeIds.has(d.typeName)
  );

  // Card opacity: dim non-participating cards during hover
  const cardOpacity = isHoverActive && !cardParticipates ? 0.25 : 1;

  // Header hover handler
  const onHeaderMouseEnter = useCallback(() => {
    setHoveredCard(d.typeName, fullNodes, fullEdges);
  }, [setHoveredCard, d.typeName, fullNodes, fullEdges]);

  // Card mouse leave handler
  const onCardMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  // Group rows by section for conditional rendering with section-level backgrounds
  const bindings = d.rows.filter((r) => r.section === "binding");
  const relations = d.rows.filter((r) => r.section === "relation");
  const permissions = d.rows.filter((r) => r.section === "permission");

  const sections: { key: CardRow["section"]; rows: CardRow[] }[] = [];
  if (bindings.length > 0) sections.push({ key: "binding", rows: bindings });
  if (relations.length > 0)
    sections.push({ key: "relation", rows: relations });
  if (permissions.length > 0)
    sections.push({ key: "permission", rows: permissions });

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(51, 65, 85, 0.5)",
        minWidth: 200,
        maxWidth: 380,
        width: "fit-content",
        opacity: cardOpacity,
        transition: "opacity 120ms ease-out",
      }}
      onMouseLeave={onCardMouseLeave}
    >
      {/* Header — type name with accent bar */}
      <div
        className="px-3 py-1.5 text-sm font-semibold text-slate-100"
        style={{
          borderTop: `3px solid ${d.accentColor}`,
          background: "rgba(15, 23, 42, 0.98)",
        }}
        data-header="true"
        onMouseEnter={onHeaderMouseEnter}
      >
        <Handle
          type="target"
          position={Position.Top}
          id={`${id}__header_target`}
          style={hiddenHandle}
        />
        {d.typeName}
        <Handle
          type="source"
          position={Position.Bottom}
          id={`${id}__header_source`}
          style={hiddenHandle}
        />
      </div>

      {/* Section bands */}
      {sections.map((section) => (
        <div
          key={section.key}
          style={{ background: SECTION_BG[section.key] }}
        >
          {section.rows.map((row) => (
            <RowItem
              key={row.id}
              row={row}
              isHoverActive={isHoverActive}
              isHighlighted={highlightedRowIds.has(row.id)}
              setHoveredRow={setHoveredRow}
              fullEdges={fullEdges}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Individual row component to avoid inline closures in the main loop */
function RowItemComponent({
  row,
  isHoverActive,
  isHighlighted,
  setHoveredRow,
  fullEdges,
}: {
  row: CardRow;
  isHoverActive: boolean;
  isHighlighted: boolean;
  setHoveredRow: (rowId: string | null, edges: import("../../types").AuthorizationEdge[]) => void;
  fullEdges: import("../../types").AuthorizationEdge[];
}) {
  const onMouseEnter = useCallback(() => {
    setHoveredRow(row.id, fullEdges);
  }, [setHoveredRow, row.id, fullEdges]);

  const rowBg = isHoverActive && isHighlighted ? HIGHLIGHTED_ROW_BG : undefined;

  return (
    <div
      className="px-3 py-0.5 font-mono text-xs flex items-center gap-1.5 text-slate-300"
      style={{ background: rowBg }}
      onMouseEnter={onMouseEnter}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={`${row.id}__target`}
        style={hiddenHandle}
      />
      {/* Dot indicator */}
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          flexShrink: 0,
          background:
            row.section === "binding"
              ? (row.dimensionColor ?? NEUTRAL_DOT)
              : NEUTRAL_DOT,
        }}
      />
      <span className="whitespace-nowrap">{row.name}</span>
      {row.expression != null && (
        <span className="text-slate-500 ml-auto whitespace-nowrap">
          {row.expression}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id={`${row.id}__source`}
        style={hiddenHandle}
      />
    </div>
  );
}

const RowItem = memo(RowItemComponent);

export const TypeCardNode = memo(TypeCardNodeComponent);
