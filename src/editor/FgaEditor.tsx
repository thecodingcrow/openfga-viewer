import { useRef, useEffect, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { fgaLanguage } from "./fga-language";
import { fgaTheme } from "./fga-theme";
import { useViewerStore } from "../store/viewer-store";

const DEBOUNCE_MS = 300;

const FgaEditor = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fgaSource = useViewerStore((s) => s.fgaSource);
  const setSource = useViewerStore((s) => s.setSource);
  const parse = useViewerStore((s) => s.parse);

  const handleChange = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSource(value);
        parse(value);
      }, DEBOUNCE_MS);
    },
    [setSource, parse],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: fgaSource,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        foldGutter(),
        fgaLanguage,
        ...fgaTheme,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleChange(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      clearTimeout(timerRef.current);
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:outline-none"
    />
  );
};

export default FgaEditor;
