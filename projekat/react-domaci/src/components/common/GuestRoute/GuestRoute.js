import React from "react";
import ProtectedRoute from "../ProtectedRoute";

const GuestRoute = ({ children }) => {
  return <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>;
};

export default GuestRoute;
