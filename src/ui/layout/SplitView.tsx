import type { ReactNode } from "react";

export interface SplitViewProps {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
}

/** Desktop side-by-side split view that becomes tabs on mobile (spec §21/§37). */
export function SplitView({ leftLabel, rightLabel, left, right }: SplitViewProps) {
  return (
    <div className="split-view-container">
      <div className="split-view" data-tabbed="true">
        <div className="split-pane split-pane-editor" aria-label={leftLabel}>
          <div className="split-pane-label">{leftLabel}</div>
          {left}
        </div>
        <div className="split-pane split-pane-source" aria-label={rightLabel}>
          <div className="split-pane-label">{rightLabel}</div>
          {right}
        </div>
      </div>
    </div>
  );
}

export default SplitView;
