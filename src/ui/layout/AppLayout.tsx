import type { ReactNode } from "react";

export interface AppLayoutProps {
  header: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
  statusBar: ReactNode;
}

/** Top-level page shell (spec §19): top bar, toolbar, main content, status bar. */
export function AppLayout({ header, toolbar, children, statusBar }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">{header}</header>
      <div className="app-toolbar-row">{toolbar}</div>
      <main className="app-main">{children}</main>
      <footer className="app-status-bar">{statusBar}</footer>
    </div>
  );
}

export default AppLayout;
