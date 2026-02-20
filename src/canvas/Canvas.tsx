import { ReactFlowProvider } from '@xyflow/react';
import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaGraph from "./FgaGraph";

const Canvas = () => {
  const nodes = useViewerStore((s) => s.nodes);
  const parseError = useViewerStore((s) => s.parseError);

  if (nodes.length === 0) {
    const msg = parseError ? "Parse error" : "No authorization model";
    return (
      <div
        className="h-full w-full flex items-center justify-center"
        style={{ background: blueprint.bg }}
      >
        <span style={{ color: blueprint.nodeBody, fontSize: 14 }}>{msg}</span>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FgaGraph />
    </ReactFlowProvider>
  );
};

export default Canvas;
