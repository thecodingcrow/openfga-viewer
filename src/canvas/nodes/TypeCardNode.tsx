import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SchemaCard, CardRow } from "../../types";

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

function TypeCardNodeComponent({ id, data }: NodeProps) {
  const d = data as TypeCardData;

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
      }}
    >
      {/* Header — type name with accent bar */}
      <div
        className="px-3 py-1.5 text-sm font-semibold text-slate-100"
        style={{
          borderTop: `3px solid ${d.accentColor}`,
          background: "rgba(15, 23, 42, 0.98)",
        }}
        data-header="true"
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
            <div
              key={row.id}
              className="px-3 py-0.5 font-mono text-xs flex items-center gap-1.5 text-slate-300"
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
          ))}
        </div>
      ))}
    </div>
  );
}

export const TypeCardNode = memo(TypeCardNodeComponent);
