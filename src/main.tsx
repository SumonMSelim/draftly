import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import "./ui/styles/theme.css";
import "./ui/styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
