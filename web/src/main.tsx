import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { buildM3TokenCss } from "./theme/m3Tokens.js";
import "./theme/m3.css";

/**
 * Entry point. The M3 tokens are injected as a stylesheet before the first render
 * so the Material components read their theme from the same values the layout CSS
 * uses, with no flash of an unthemed frame.
 */
const tokenStyles = document.createElement("style");
tokenStyles.id = "m3-tokens";
tokenStyles.textContent = buildM3TokenCss();
document.head.prepend(tokenStyles);

const container = document.getElementById("root");
if (!container) {
    throw new Error("index.html is missing the #root element.");
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
