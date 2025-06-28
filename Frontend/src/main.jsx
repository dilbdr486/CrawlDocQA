import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AppStoreContext } from "./store/storeContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppStoreContext>
        <App />
      </AppStoreContext>
    </BrowserRouter>
  </StrictMode>
);
