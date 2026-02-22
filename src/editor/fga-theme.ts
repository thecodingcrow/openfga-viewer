import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-secondary)",
      fontSize: "0.8125rem",
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    ".cm-content": {
      caretColor: "var(--color-accent)",
      padding: "0.25rem 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(212, 160, 23, 0.12)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--color-text-muted)",
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
      color: "var(--color-text-muted)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(212, 160, 23, 0.04)",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(212, 160, 23, 0.2)",
      color: "var(--color-text-primary) !important",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--color-border)",
      border: "none",
      color: "var(--color-text-muted)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--color-surface-raised)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-secondary)",
    },
    ".cm-scroller": {
      scrollbarWidth: "thin",
      scrollbarColor: "var(--color-border-subtle) transparent",
    },
    ".cm-scroller::-webkit-scrollbar": {
      width: "0.3125rem",
      height: "0.3125rem",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "transparent",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "var(--color-border-subtle)",
      borderRadius: "0.1875rem",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: "var(--color-text-muted)",
    },
  },
  { dark: true },
);

const mutedHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#b098d4" },      // dusty lavender
  { tag: tags.typeName, color: "#ebebeb" },      // primary text -- types are primary content
  { tag: tags.variableName, color: "#9cc4c4" },  // muted teal
  { tag: tags.operator, color: "#c8a070" },      // warm sand
  { tag: tags.bracket, color: "#a0a0a0" },       // neutral
  { tag: tags.number, color: "#8fb8a0" },        // sage
  { tag: tags.comment, color: "#666666", fontStyle: "italic" }, // warm muted
  { tag: tags.string, color: "#a4c99e" },        // soft green
]);

export const fgaTheme = [
  editorTheme,
  syntaxHighlighting(mutedHighlight),
];
