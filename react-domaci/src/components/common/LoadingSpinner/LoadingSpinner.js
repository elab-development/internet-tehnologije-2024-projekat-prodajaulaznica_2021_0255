import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = ({
  size = "medium",
  color = "primary",
  message = "Učitavanje...",
  showMessage = true,
  className = "",
}) => {
  const spinnerClass =
    `loading-spinner spinner-${size} spinner-${color} ${className}`.trim();

  return (
    <div className="loading-container">
      <div className={spinnerClass}></div>
      {showMessage && message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
