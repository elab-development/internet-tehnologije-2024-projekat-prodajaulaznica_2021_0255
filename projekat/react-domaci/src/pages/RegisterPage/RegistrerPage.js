import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear specific field error when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
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

    if (!formData.password) {
      newErrors.password = "Lozinka je obavezna";
    } else if (formData.password.length < 8) {
      newErrors.password = "Lozinka mora imati najmanje 8 karaktera";
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "Lozinke se ne poklapaju";
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

    const result = await register(formData);

    if (result.success) {
      navigate("/");
    } else {
      if (result.errors) {
        setErrors(result.errors);
      } else {
        setErrors({ general: result.message });
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto", padding: "2rem" }}>
      <h2>Registracija</h2>

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

      <form onSubmit={handleSubmit}>
        <InputField
          label="Ime i prezime"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Vaše ime i prezime"
          error={errors.name}
          required
        />

        <InputField
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          error={errors.email}
          required
        />

        <InputField
          label="Lozinka"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          error={errors.password}
          required
        />

        <InputField
          label="Potvrdite lozinku"
          type="password"
          name="password_confirmation"
          value={formData.password_confirmation}
          onChange={handleChange}
          placeholder="••••••••"
          error={errors.password_confirmation}
          required
        />

        <Button
          type="submit"
          size="large"
          style={{ width: "100%", marginTop: "1rem" }}
          disabled={loading}
        >
          {loading ? "Registrovanje..." : "Registrujte se"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "1rem", color: "#666" }}>
        Već imate nalog? <a href="/login">Prijavite se</a>
      </p>
    </div>
  );
};

export default RegisterPage;
