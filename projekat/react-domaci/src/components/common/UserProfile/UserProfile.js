import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Button from "../Button";
import InputField from "../InputField";
import apiService from "../../../services/api";

const UserProfile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(""); // DODAJTE SUCCESS STATE

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
    setSuccess(""); // Clear success message
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });
    setErrors({});
    setSuccess("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });
    setErrors({});
    setSuccess("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Ime je obavezno";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email je obavezan";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email format nije valjan";
    }

    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess("");

    try {
      // POZOVITE STVARNI API
      const response = await apiService.updateUserProfile(formData);

      if (response.success) {
        // Update user in context
        updateUser(response.data);
        setSuccess("Profil je uspešno ažuriran");
        setIsEditing(false);
      } else {
        setErrors({
          general: response.message || "Greška pri ažuriranju profila",
        });
      }
    } catch (error) {
      console.error("Profile update error:", error);

      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({
          general: error.message || "Greška pri ažuriranju profila",
        });
      }
    } finally {
      setLoading(false);
    }
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
        <h3>Informacije o profilu</h3>
        {!isEditing && (
          <Button variant="outline" size="small" onClick={handleEdit}>
            Uredi profil
          </Button>
        )}
      </div>

      {/* SUCCESS MESSAGE */}
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

      {/* OSTATAK KOMPONENTE OSTAJE ISTI */}
      {isEditing ? (
        <div>
          <InputField
            label="Ime i prezime"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <InputField
            label="Email adresa"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <Button onClick={handleSave} disabled={loading} size="small">
              {loading ? "Čuvanje..." : "Sačuvaj"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              size="small"
            >
              Otkaži
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              Ime i prezime:
            </label>
            <p style={{ margin: 0, color: "#666" }}>
              {user?.name || "Nije definisano"}
            </p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              Email adresa:
            </label>
            <p style={{ margin: 0, color: "#666" }}>
              {user?.email || "Nije definisano"}
            </p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: "500",
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              Član od:
            </label>
            <p style={{ margin: 0, color: "#666" }}>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("sr-RS")
                : "Nije definisano"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
