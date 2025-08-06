import React from "react";

const InputField = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  error,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {label && (
        <label
          htmlFor={name}
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "500",
            color: error ? "#e53e3e" : "#333",
          }}
        >
          {label} {required && <span style={{ color: "#e53e3e" }}>*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={className}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: `1px solid ${error ? "#e53e3e" : "#ddd"}`,
          borderRadius: "4px",
          fontSize: "1rem",
          outline: "none",
          transition: "border-color 0.2s",
          backgroundColor: error ? "#fef5f5" : "white",
        }}
        {...props}
      />
      {error && (
        <span
          style={{
            color: "#e53e3e",
            fontSize: "0.875rem",
            marginTop: "0.25rem",
            display: "block",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default InputField;
