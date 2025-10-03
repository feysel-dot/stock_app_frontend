import { createContext, useState } from "react";

export const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const [refreshDashboard, setRefreshDashboard] = useState(false);

  return (
    <DashboardContext.Provider
      value={{ refreshDashboard, setRefreshDashboard }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
