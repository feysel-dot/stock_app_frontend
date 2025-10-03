import "antd/dist/reset.css"; // ✅ Ant Design v5 reset styles
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { App as AntdApp } from "antd";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ✅ Provide Ant Design context */}
    <AntdApp>
      <App />
    </AntdApp>
  </React.StrictMode>
);
