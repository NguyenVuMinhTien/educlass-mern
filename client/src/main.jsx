import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.jsx";
import { AuthProvider } from "./auth.jsx";
import { Feedback } from "./ui.jsx";
import "@fontsource-variable/inter";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Feedback>
          <App />
        </Feedback>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
