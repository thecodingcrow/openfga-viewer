import { useState, useMemo, useCallback, memo } from "react";
import type { AuthorizationNode } from "../types";
import { useViewerStore } from "../store/viewer-store";

// -- Dropdown Component -------------------------------------------------------

interface DropdownProps {
  label: string;
  placeholder: string;
  options: { id: string; display: string }[];
  value: string;
  onChange: (value: string) => void;
}

const Dropdown = memo(function Dropdown({ label, placeholder, options, value, onChange }: DropdownProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.display.toLowerCase().includes(lower));
  }, [options, search]);

  const selectedDisplay = options.find((o) => o.id === value)?.display ?? "";

  return (
    <div className="relative">
      <div className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </div>
      <input
        type="text"
        value={open ? search : selectedDisplay}
        placeholder={placeholder}
        className="w-full text-xs py-1.5 px-2 rounded"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-primary)",
          outline: "none",
        }}
        onFocus={() => {
          setOpen(true);
          setSearch("");
        }}
        onBlur={() => {
          // Delay to allow click on option
          setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-10 w-full mt-1 rounded max-h-48 overflow-y-auto scrollbar-dark"
          style={{
            background: "var(--color-surface-overlay)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {filtered.map((opt) => (
            <button
              key={opt.id}
              className="w-full text-left text-xs px-2 py-1.5 hover:bg-surface-raised transition-colors"
              style={{
                color: opt.id === value ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.id);
                setOpen(false);
                setSearch("");
              }}
            >
              {opt.display}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// -- Path Display -------------------------------------------------------------

interface PathDisplayProps {
  path: string[];
}

const PathDisplay = memo(function PathDisplay({ path }: PathDisplayProps) {
  return (
    <div className="flex flex-col gap-0.5 mt-2">
      {path.map((nodeId, i) => (
        <div key={nodeId} className="flex items-center gap-2 text-xs">
          {i > 0 && (
            <span style={{ color: "var(--color-text-muted)", marginLeft: 4 }}>&#x2193;</span>
          )}
          <span style={{ color: "var(--color-text-primary)" }}>
            {nodeId.replace("#", " \u203A ")}
          </span>
        </div>
      ))}
    </div>
  );
});

// -- Main Component -----------------------------------------------------------

const PermissionCheckerView = () => {
  const nodes = useViewerStore((s) => s.nodes);
  const anchor = useViewerStore((s) => s.anchor);
  const setCheckerAnchor = useViewerStore((s) => s.setCheckerAnchor);
  const setPermissionAnchor = useViewerStore((s) => s.setPermissionAnchor);

  // Derive current subject/target from anchor
  const subjectId = anchor?.kind === "checker" ? anchor.subjectNodeId : "";
  const targetId = anchor?.kind === "checker" ? anchor.targetNodeId : "";

  const checkResult = anchor?.kind === "checker" ? anchor.result : null;

  // Build option lists
  const subjectOptions = useMemo(() => {
    return nodes
      .filter((n): n is AuthorizationNode & { relation: string } =>
        n.kind === "relation" && !n.isPermission && n.relation !== undefined && !n.isTuplesetBinding
      )
      .map((n) => ({ id: n.id, display: `${n.type}#${n.relation}` }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [nodes]);

  const targetOptions = useMemo(() => {
    return nodes
      .filter((n) => n.isPermission && n.relation !== undefined)
      .map((n) => ({ id: n.id, display: `${n.type}#${n.relation}` }))
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [nodes]);

  const handleSubjectChange = useCallback(
    (newSubjectId: string) => {
      if (newSubjectId && targetId) {
        setCheckerAnchor(newSubjectId, targetId);
      }
    },
    [setCheckerAnchor, targetId],
  );

  const handleTargetChange = useCallback(
    (newTargetId: string) => {
      if (subjectId && newTargetId) {
        setCheckerAnchor(subjectId, newTargetId);
      }
    },
    [setCheckerAnchor, subjectId],
  );

  return (
    <div className="flex flex-col">
      {/* Inputs */}
      <div className="px-4 py-3 flex flex-col gap-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <Dropdown
          label="Subject (role)"
          placeholder="e.g. client#admin"
          options={subjectOptions}
          value={subjectId}
          onChange={handleSubjectChange}
        />
        <Dropdown
          label="Target (permission)"
          placeholder="e.g. task#can_read"
          options={targetOptions}
          value={targetId}
          onChange={handleTargetChange}
        />
      </div>

      {/* Results */}
      <div className="px-4 py-3">
        {!subjectId || !targetId ? (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Select both a subject and target to check reachability
          </div>
        ) : !checkResult ? (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Computing...
          </div>
        ) : checkResult.reachable ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: "#166534", color: "#4ade80" }}
              >
                YES
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Reachable
              </span>
            </div>
            {checkResult.path && (
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Shortest path:
                </div>
                <PathDisplay path={checkResult.path} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: "#7f1d1d", color: "#f87171" }}
              >
                NO
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Not reachable
              </span>
            </div>
            {checkResult.reachableOnSameType.length > 0 && (
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Closest reachable permissions on same type:
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {checkResult.reachableOnSameType.map((perm) => {
                    const targetType = targetId.split("#")[0];
                    const permNodeId = `${targetType}#${perm}`;
                    return (
                      <button
                        key={perm}
                        className="text-xs px-1.5 py-0.5 rounded hover:bg-surface-overlay transition-colors"
                        style={{
                          background: "var(--color-surface-raised)",
                          color: "var(--color-text-primary)",
                        }}
                        onClick={() => setPermissionAnchor(permNodeId)}
                        title={`Resolve ${permNodeId}`}
                      >
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionCheckerView;
