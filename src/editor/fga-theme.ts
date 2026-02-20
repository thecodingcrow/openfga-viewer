import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { blueprint } from "../theme/colors";

const blueprintEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: blueprint.surface,
      color: blueprint.nodeBody,
      fontSize: "13px",
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    ".cm-content": {
      caretColor: blueprint.accent,
      padding: "8px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: blueprint.accent,
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: `${blueprint.accent}22`,
    },
    ".cm-gutters": {
      backgroundColor: blueprint.bg,
      color: blueprint.muted,
      border: "none",
      borderRight: `1px solid ${blueprint.nodeBorder}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: `${blueprint.accent}10`,
    },
    ".cm-activeLine": {
      backgroundColor: `${blueprint.accent}08`,
    },
    ".cm-matchingBracket": {
      backgroundColor: `${blueprint.accent}30`,
      outline: `1px solid ${blueprint.accent}50`,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: blueprint.nodeBorder,
      border: "none",
      color: blueprint.muted,
    },
    ".cm-tooltip": {
      backgroundColor: blueprint.nodeBg,
      border: `1px solid ${blueprint.nodeBorder}`,
      color: blueprint.nodeBody,
    },
  },
  { dark: true },
);

const blueprintHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc" },
  { tag: tags.typeName, color: blueprint.nodeHeader },
  { tag: tags.variableName, color: "#67e8f9" },
  { tag: tags.operator, color: "#fb923c" },
  { tag: tags.bracket, color: "#fbbf24" },
  { tag: tags.number, color: "#34d399" },
  { tag: tags.comment, color: blueprint.muted, fontStyle: "italic" },
  { tag: tags.string, color: "#86efac" },
]);

export const fgaTheme = [
  blueprintEditorTheme,
  syntaxHighlighting(blueprintHighlight),
];
