import { ReactFlowProvider } from '@xyflow/react';
import { useViewerStore } from "../store/viewer-store";
import { blueprint } from "../theme/colors";
import FgaGraph from "./FgaGraph";
import { Breadcrumb } from "./Breadcrumb";

const Canvas = () => {
  const nodes = useViewerStore((s) => s.nodes);
  const parseError = useViewerStore((s) => s.parseError);

  if (nodes.length === 0) {
    const msg = parseError ? "Parse error" : "No authorization model";
    return (
      <div
        className="relative h-full w-full flex items-center justify-center"
        style={{ background: blueprint.bg }}
      >
        <span style={{ color: blueprint.nodeBody, fontSize: 14 }}>{msg}</span>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full flex flex-col">
        <Breadcrumb />
        <div className="flex-1 min-h-0">
          <FgaGraph />
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default Canvas;
