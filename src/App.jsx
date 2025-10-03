// FILE: src/App.jsx
import "antd/dist/reset.css";
import React, { Suspense, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ConfigProvider, Spin, theme, Result, Button } from "antd";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { AuthProvider, AuthContext } from "./context/AuthContext.jsx";
import { DashboardProvider } from "./context/DashboardContext.jsx";
import GroupedSalesTable from "./components/GroupedSalesTable.jsx";
import AppLayout from "./layout/AppLayout.jsx";

import MetaManager from "./pages/MetaManager.jsx";
import { App as AntdApp } from "antd";

import SalesSuite from "./pages/SalesSuite.jsx";
import AdminUserManager from "./components/AdminUserManager.jsx";

// Lazy-loaded pages
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const SalesTable = React.lazy(() => import("./pages/SalesTable"));
const ProductList = React.lazy(() => import("./pages/ProductList"));
const CustomerList = React.lazy(() => import("./pages/CustomerList"));
const ResetRequest = React.lazy(() => import("./pages/ResetRequest"));
const Report = React.lazy(() => import("./pages/Report"));

// 404 fallback
const NotFound = () => (
  <div style={{ textAlign: "center", marginTop: 50 }}>
    404 – Page Not Found
    <Result
      status="403"
      title="403 - Not Authorized"
      subTitle="You do not have permission to access this page."
      extra={
        <Button type="primary" onClick={() => Navigate("/")}>
          Back to Dashboard
        </Button>
      }
    />
  </div>
);

const AppRoutes = () => {
  const { user, themeDark } = useContext(AuthContext);
  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ConfigProvider
      theme={{ algorithm: themeDark ? darkAlgorithm : defaultAlgorithm }}
    >
      <Router>
        <Suspense fallback={<Spin fullscreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-request" element={<ResetRequest />} />

            {user ? (
              <Route element={<AppLayout />}>
                {/* Dashboard */}
                <Route index element={<Dashboard />} />

                {/* Protected Routes */}
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute allowed={["sales", "manager"]}>
                      <SalesTable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grouped-sales"
                  element={
                    <ProtectedRoute allowed={["sales", "manager"]}>
                      <GroupedSalesTable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute allowed={["manager"]}>
                      <Report />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new-sale"
                  element={
                    <ProtectedRoute allowed={["sales"]}>
                      <SalesSuite />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <ProtectedRoute allowed={["sales", "manager"]}>
                      <ProductList />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowed={["admin", "manager"]}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute allowed={["admin", "manager"]}>
                      <CustomerList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meta"
                  element={
                    <ProtectedRoute allowed={["admin"]}>
                      <MetaManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowed={["admin"]}>
                      <AdminUserManager />
                    </ProtectedRoute>
                  }
                />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}

            {/* Fallback 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ConfigProvider>
  );
};

const App = () => (
  <AuthProvider>
    <DashboardProvider>
      <AntdApp>
        <AppRoutes />
      </AntdApp>
    </DashboardProvider>
  </AuthProvider>
);

export default App;
