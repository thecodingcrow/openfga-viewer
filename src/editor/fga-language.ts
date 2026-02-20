import { StreamLanguage, type StreamParser } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface FgaState {
  inRelations: boolean;
}

const fgaParser: StreamParser<FgaState> = {
  startState: () => ({ inRelations: false }),

  token(stream, state) {
    if (stream.eatSpace()) return null;

    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match(/^model\b/)) return "keyword";
    if (stream.match(/^schema\b/)) return "keyword";
    if (stream.match(/^type\b/)) return "typeName";
    if (stream.match(/^relations\b/)) {
      state.inRelations = true;
      return "keyword";
    }
    if (stream.match(/^define\b/)) return "keyword";
    if (stream.match(/^condition\b/)) return "keyword";

    if (stream.match(/^(and|or|but not|from)\b/)) return "operator";

    if (stream.match(/^\[/)) return "bracket";
    if (stream.match(/^]/)) return "bracket";

    if (stream.match(/^\d+\.\d+/)) return "number";

    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return state.inRelations ? "variableName" : "typeName";
    }

    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
  },
};

export const fgaLanguage = StreamLanguage.define(fgaParser);

export { tags };
