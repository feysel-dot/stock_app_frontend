import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import NotAuthorized from "../pages/NotAuthorized";

const ProtectedRoute = ({ allowed = [], children }) => {
  const { user } = useContext(AuthContext);

  if (!user) return null; // Shouldn't occur — wrapped in App
  if (!allowed.includes(user.role)) return <NotAuthorized />;
  return children;
};

export default ProtectedRoute;
