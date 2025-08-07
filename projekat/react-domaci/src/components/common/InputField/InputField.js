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
  rows,
  ...props
}) => {
  const isTextarea = type === "textarea";

  const inputStyles = {
    width: "100%",
    padding: "0.75rem",
    border: `1px solid ${error ? "#e53e3e" : "#ddd"}`,
    borderRadius: "4px",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: error ? "#fef5f5" : "white",
    resize: isTextarea ? "vertical" : "none",
    minHeight: isTextarea ? "100px" : "auto",
  };

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

      {isTextarea ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={className}
          rows={rows || 4}
          style={inputStyles}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={className}
          style={inputStyles}
          {...props}
        />
      )}

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
