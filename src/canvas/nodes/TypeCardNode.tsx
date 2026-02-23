import { memo, useCallback, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type {
  SchemaCard,
  CardRow,
  AuthorizationEdge,
  SelfReferencingDimension,
} from "../../types";
import { useHoverStore } from "../../store/hover-store";
import { useViewerStore } from "../../store/viewer-store";
import { getIsTransitioning } from "../transition-state";
import { TruncationTooltip } from "../../components/Tooltip";

/** React Flow requires [key: string]: unknown on node data */
type TypeCardData = SchemaCard & { [key: string]: unknown };

/** Section background colors -- warm neutral banded shades */
const SECTION_BG: Record<CardRow["section"], string> = {
  binding: "var(--color-surface-raised)",
  relation: "rgba(34, 34, 34, 0.92)",
  permission: "rgba(34, 34, 34, 0.82)",
};

/** Hidden handle style -- exists for edge attachment only */
const hiddenHandle: React.CSSProperties = {
  opacity: 0,
  width: 6,
  height: 6,
};


/** Subtle background tint for highlighted rows */
const HIGHLIGHTED_ROW_BG = "rgba(212, 160, 23, 0.08)";

/** Delay (ms) to distinguish single-click from double-click on header */
const CLICK_DELAY = 250;

function TypeCardNodeComponent({ id, data }: NodeProps) {
  const d = data as TypeCardData;

  // Hover state from hover store
  const isHoverActive = useHoverStore((s) => s.isHoverActive);
  const highlightedRowIds = useHoverStore((s) => s.highlightedRowIds);
  const highlightedNodeIds = useHoverStore((s) => s.highlightedNodeIds);
  const setHoveredRow = useHoverStore((s) => s.setHoveredRow);
  const setHoveredCard = useHoverStore((s) => s.setHoveredCard);
  const clearHover = useHoverStore((s) => s.clearHover);

  // Full graph data for BFS (stable references -- only change on parse)
  const fullEdges = useViewerStore((s) => s.edges);
  const fullNodes = useViewerStore((s) => s.nodes);

  // Navigation actions
  const navigateToSubgraph = useViewerStore((s) => s.navigateToSubgraph);
  const toggleCardCollapse = useViewerStore((s) => s.toggleCardCollapse);

  // Card collapse state
  const collapsedCards = useViewerStore((s) => s.collapsedCards);
  const isCollapsed = collapsedCards.has(d.typeName);

  // Navigation stack for row dimming
  const navStackLength = useViewerStore((s) => s.navigationStack.length);
  const currentFrame = useViewerStore(
    (s) => s.navigationStack[s.navigationStack.length - 1] ?? null,
  );
  const dimmedRowsHidden = useViewerStore((s) => s.dimmedRowsHidden);

  // Self-referencing dimensions
  const selfReferencingDimensions = useViewerStore(
    (s) => s.selfReferencingDimensions,
  );

  // Click timer for single-click vs double-click conflict resolution
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if this card participates in current hover
  const cardParticipates =
    isHoverActive &&
    (d.rows.some((r) => highlightedRowIds.has(r.id)) ||
      highlightedNodeIds.has(d.typeName));

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

  // Header single-click: navigate downstream (with 250ms delay for double-click)
  // stopPropagation prevents React Flow's onNodeClick from firing selectNode
  const onHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (getIsTransitioning()) return;
    if (clickTimerRef.current !== null) return; // Already pending
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      navigateToSubgraph(d.typeName, "downstream");
    }, CLICK_DELAY);
  }, [navigateToSubgraph, d.typeName]);

  // Header double-click: collapse/expand card (cancel pending single-click)
  const onHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (getIsTransitioning()) return;
    if (clickTimerRef.current !== null) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    toggleCardCollapse(d.typeName);
  }, [toggleCardCollapse, d.typeName]);

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
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        minWidth: 200,
        maxWidth: 380,
        width: "fit-content",
        opacity: cardOpacity,
        transition: "opacity 120ms ease-out",
      }}
      onMouseLeave={onCardMouseLeave}
    >
      {/* Header -- type name with accent bar */}
      <div
        className="px-3 py-1.5 text-sm font-semibold cursor-pointer select-none"
        style={{
          borderBottom: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
        }}
        data-header="true"
        onMouseEnter={onHeaderMouseEnter}
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <Handle
          type="target"
          position={Position.Top}
          id={`${id}__header_target`}
          style={hiddenHandle}
        />
        {d.typeName}
        {isCollapsed && (
          <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
            ({d.rows.length})
          </span>
        )}
        <Handle
          type="source"
          position={Position.Bottom}
          id={`${id}__header_source`}
          style={hiddenHandle}
        />
      </div>

      {/* Section bands -- hidden when collapsed */}
      {!isCollapsed &&
        sections.map((section, sectionIdx) => (
          <div
            key={section.key}
            style={{
              background: SECTION_BG[section.key],
              borderTop: sectionIdx > 0 ? "1px solid var(--color-border-subtle)" : undefined,
            }}
          >
            {section.rows.map((row) => {
              const isRelevant = currentFrame
                ? currentFrame.relevantRowIds.has(row.id)
                : true;
              // If dimmed rows should be hidden and this row is not relevant, skip
              if (navStackLength > 0 && dimmedRowsHidden && !isRelevant)
                return null;

              return (
                <RowItem
                  key={row.id}
                  row={row}
                  typeName={d.typeName}
                  isHoverActive={isHoverActive}
                  isHighlighted={highlightedRowIds.has(row.id)}
                  isRelevant={isRelevant}
                  inSubgraph={navStackLength > 0}
                  setHoveredRow={setHoveredRow}
                  navigateToSubgraph={navigateToSubgraph}
                  fullEdges={fullEdges}
                  selfReferencingDimensions={selfReferencingDimensions}
                />
              );
            })}
          </div>
        ))}
    </div>
  );
}

/** Individual row component to avoid inline closures in the main loop */
function RowItemComponent({
  row,
  typeName,
  isHoverActive,
  isHighlighted,
  isRelevant,
  inSubgraph,
  setHoveredRow,
  navigateToSubgraph,
  fullEdges,
  selfReferencingDimensions,
}: {
  row: CardRow;
  typeName: string;
  isHoverActive: boolean;
  isHighlighted: boolean;
  isRelevant: boolean;
  inSubgraph: boolean;
  setHoveredRow: (
    rowId: string | null,
    edges: AuthorizationEdge[],
  ) => void;
  navigateToSubgraph: (
    nodeId: string,
    direction: "upstream" | "downstream",
  ) => void;
  fullEdges: AuthorizationEdge[];
  selfReferencingDimensions: SelfReferencingDimension[];
}) {
  const onMouseEnter = useCallback(() => {
    setHoveredRow(row.id, fullEdges);
  }, [setHoveredRow, row.id, fullEdges]);

  // Permission row click: navigate upstream
  // stopPropagation prevents React Flow's onNodeClick from firing selectNode
  const onRowClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (getIsTransitioning()) return;
    if (row.section === "permission") {
      navigateToSubgraph(row.id, "upstream");
    }
  }, [navigateToSubgraph, row.id, row.section]);

  const rowBg =
    isHoverActive && isHighlighted ? HIGHLIGHTED_ROW_BG : undefined;

  // Row opacity: dim irrelevant rows in subgraph view
  const rowOpacity = inSubgraph && !isRelevant ? 0.4 : 1;

  // Check for self-referencing dimension on binding rows
  const selfRefDim =
    row.section === "binding"
      ? selfReferencingDimensions.find(
          (srd) =>
            srd.typeName === typeName && srd.dimensionName === row.name,
        )
      : undefined;

  const isPermission = row.section === "permission";

  return (
    <div
      className="px-3 py-0.5 font-mono text-xs flex items-center gap-1.5 overflow-hidden"
      style={{
        background: rowBg,
        opacity: rowOpacity,
        color: "var(--color-text-secondary)",
        cursor: isPermission ? "pointer" : undefined,
        transition: "opacity 120ms ease-out",
      }}
      onMouseEnter={onMouseEnter}
      onClick={isPermission ? onRowClick : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={`${row.id}__target`}
        style={hiddenHandle}
      />
      {/* Dot indicator -- dimension colors for bindings, section-coded neutrals for others */}
      <span
        title={row.ttuDimensionColor != null ? "Inherited via TTU" : undefined}
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          flexShrink: 0,
          background:
            row.section === "binding"
              ? (row.dimensionColor ?? "var(--color-dot-binding)")
              : row.section === "permission"
                ? (row.ttuDimensionColor ?? "var(--color-dot-permission)")
                : (row.ttuDimensionColor ?? "var(--color-dot-relation)"),
        }}
      />
      <span className="whitespace-nowrap">{row.name}</span>
      {/* Self-referencing dimension info icon */}
      {selfRefDim != null && (
        <span
          title={selfRefDim.tooltip}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "1px solid var(--color-text-muted)",
            fontSize: 8,
            lineHeight: 1,
            color: "var(--color-text-secondary)",
            flexShrink: 0,
            cursor: "help",
          }}
        >
          i
        </span>
      )}
      {row.expression != null && (
        <TruncationTooltip
          text={row.expression}
          className="ml-auto whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
          style={{ color: "var(--color-text-muted)" }}
        />
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
