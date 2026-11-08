import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// A file dropped outside a drop zone shouldn't make the window navigate to it.
for (const type of ["dragover", "drop"]) {
  window.addEventListener(type, (e) => {
    if (!(e.target as HTMLElement)?.closest?.(".dropzone")) e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
