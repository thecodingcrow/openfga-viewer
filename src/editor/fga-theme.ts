import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { blueprint } from "../theme/colors";

const blueprintEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: blueprint.surface,
      color: blueprint.nodeBody,
      fontSize: "0.8125rem",
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    ".cm-content": {
      caretColor: blueprint.accent,
      padding: "0.25rem 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: blueprint.accent,
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: `${blueprint.accent}22`,
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: `${blueprint.muted}99`,
      border: "none",
      paddingRight: "0.25rem",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      paddingLeft: "0.75rem",
      minWidth: "2rem",
      fontSize: "0.75rem",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: blueprint.muted,
    },
    ".cm-activeLine": {
      backgroundColor: `${blueprint.accent}06`,
    },
    ".cm-matchingBracket": {
      backgroundColor: `${blueprint.accent}30`,
      outline: `0.0625rem solid ${blueprint.accent}50`,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: blueprint.nodeBorder,
      border: "none",
      color: blueprint.muted,
    },
    ".cm-tooltip": {
      backgroundColor: blueprint.nodeBg,
      border: `0.0625rem solid ${blueprint.nodeBorder}`,
      color: blueprint.nodeBody,
    },
    ".cm-scroller": {
      scrollbarWidth: "thin",
      scrollbarColor: `${blueprint.surfaceBorder} transparent`,
    },
    ".cm-scroller::-webkit-scrollbar": {
      width: "0.3125rem",
      height: "0.3125rem",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "transparent",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: blueprint.surfaceBorder,
      borderRadius: "0.1875rem",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: blueprint.muted,
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
