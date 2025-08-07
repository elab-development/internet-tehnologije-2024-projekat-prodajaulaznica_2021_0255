import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Button from "../Button";

const LogoutButton = ({
  variant = "outline",
  size = "small",
  children = "Odjava",
}) => {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (window.confirm("Da li ste sigurni da se želite odjaviti?")) {
      setIsLoggingOut(true);
      await logout();
      // No need to set loading to false as component will unmount
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? "Odjavljivanje..." : children}
    </Button>
  );
};

export default LogoutButton;
