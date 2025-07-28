import React, { useState } from "react";
import "./InputField.css";

const InputField = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  icon,
  className = "",
  name,
  id,
  autoComplete = "off",
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  const inputClass = `
    input-field 
    ${error ? "input-field-error" : ""} 
    ${disabled ? "input-field-disabled" : ""} 
    ${isFocused ? "input-field-focused" : ""}
    ${icon ? "input-field-with-icon" : ""}
    ${className}
  `.trim();

  return (
    <div className="input-wrapper">
      {label && (
        <label
          htmlFor={id || name}
          className={`input-label ${required ? "input-label-required" : ""}`}
        >
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}

        <input
          type={type}
          id={id || name}
          name={name}
          value={value || ""}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={inputClass}
        />
      </div>

      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default InputField;
