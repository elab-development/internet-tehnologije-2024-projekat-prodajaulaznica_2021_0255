import React, { useState } from "react";
import Button from "../Button";
import InputField from "../InputField";

const PasswordChange = () => {
  const [isChanging, setIsChanging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
    setSuccess("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.current_password) {
      newErrors.current_password = "Trenutna lozinka je obavezna";
    }

    if (!formData.new_password) {
      newErrors.new_password = "Nova lozinka je obavezna";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "Nova lozinka mora imati najmanje 8 karaktera";
    }

    if (formData.new_password !== formData.new_password_confirmation) {
      newErrors.new_password_confirmation = "Lozinke se ne poklapaju";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Simulate API call to change password
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess("Lozinka je uspešno promenjena");
      setFormData({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setIsChanging(false);
    } catch (error) {
      setErrors({ general: "Greška pri promeni lozinke" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsChanging(false);
    setFormData({
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    });
    setErrors({});
    setSuccess("");
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h3>Promena lozinke</h3>
        {!isChanging && (
          <Button
            variant="outline"
            size="small"
            onClick={() => setIsChanging(true)}
          >
            Promeni lozinku
          </Button>
        )}
      </div>

      {success && (
        <div
          style={{
            color: "green",
            marginBottom: "1rem",
            padding: "0.5rem",
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            borderRadius: "4px",
          }}
        >
          {success}
        </div>
      )}

      {errors.general && (
        <div
          style={{
            color: "red",
            marginBottom: "1rem",
            padding: "0.5rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
          }}
        >
          {errors.general}
        </div>
      )}

      {isChanging ? (
        <form onSubmit={handleSubmit}>
          <InputField
            label="Trenutna lozinka"
            type="password"
            name="current_password"
            value={formData.current_password}
            onChange={handleChange}
            error={errors.current_password}
            required
          />

          <InputField
            label="Nova lozinka"
            type="password"
            name="new_password"
            value={formData.new_password}
            onChange={handleChange}
            error={errors.new_password}
            required
          />

          <InputField
            label="Potvrdi novu lozinku"
            type="password"
            name="new_password_confirmation"
            value={formData.new_password_confirmation}
            onChange={handleChange}
            error={errors.new_password_confirmation}
            required
          />

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <Button type="submit" disabled={loading} size="small">
              {loading ? "Menjanje..." : "Promeni lozinku"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              size="small"
            >
              Otkaži
            </Button>
          </div>
        </form>
      ) : (
        <p style={{ color: "#666", margin: 0 }}>
          Kliknite na dugme da promenite svoju lozinku.
        </p>
      )}
    </div>
  );
};

export default PasswordChange;
