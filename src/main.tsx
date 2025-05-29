import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css";

// Get the window label
const windowLabel = document.querySelector('meta[name="tauri-window"]')?.getAttribute("content");
console.log("Window label:", windowLabel);

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

// Render different components based on the window
if (windowLabel === "main") {
  console.log("Rendering App component");
  ReactDOM.createRoot(rootElement as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.log("Not rendering App - window label doesn't match");
}
