import React, { useState, useEffect } from "react";
import InputField from "../common/InputField";
import Button from "../common/Button";
import apiService from "../../services/api";

const EventForm = ({ event = null, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    thumbnail_url: "",
    start_date: "",
    end_date: "",
    location: "",
    price: "",
    total_tickets: "",
    category_id: "",
    featured: false,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load categories and populate form if editing
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategories();
        if (response.success) {
          setCategories(response.data || []);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();

    // If editing, populate form
    if (event) {
      setFormData({
        name: event.name || "",
        description: event.description || "",
        image_url: event.image_url || "",
        thumbnail_url: event.thumbnail_url || "",
        start_date: event.start_date ? event.start_date.slice(0, 16) : "",
        end_date: event.end_date ? event.end_date.slice(0, 16) : "",
        location: event.location || "",
        price: event.price || "",
        total_tickets: event.total_tickets || "",
        category_id: event.category?.id || "",
        featured: event.featured || false,
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Naziv događaja je obavezan";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Opis događaja je obavezan";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Datum početka je obavezan";
    }

    if (!formData.end_date) {
      newErrors.end_date = "Datum završetka je obavezan";
    }

    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) >= new Date(formData.end_date)
    ) {
      newErrors.end_date = "Datum završetka mora biti nakon datuma početka";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Lokacija je obavezna";
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = "Cena mora biti pozitivna vrednost";
    }

    if (!formData.total_tickets || parseInt(formData.total_tickets) < 1) {
      newErrors.total_tickets = "Broj karata mora biti veći od 0";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Kategorija je obavezna";
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
      const eventData = {
        ...formData,
        price: parseFloat(formData.price),
        total_tickets: parseInt(formData.total_tickets),
        available_tickets: event
          ? event.available_tickets
          : parseInt(formData.total_tickets),
      };

      let response;
      if (event) {
        response = await apiService.updateEvent(event.id, eventData);
      } else {
        response = await apiService.createEvent(eventData);
      }

      if (response.success) {
        onSave(response.data);
      } else {
        setErrors({
          general: response.message || "Greška pri čuvanju događaja",
        });
      }
    } catch (error) {
      setErrors({
        general: error.message || "Greška pri čuvanju događaja",
        ...error.errors,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <h2>{event ? "Uredi događaj" : "Kreiraj novi događaj"}</h2>

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        <InputField
          label="Naziv događaja"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Kategorija *
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: `1px solid ${errors.category_id ? "#e53e3e" : "#ddd"}`,
              borderRadius: "4px",
              backgroundColor: errors.category_id ? "#fef5f5" : "white",
            }}
          >
            <option value="">Izaberite kategoriju</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <span style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
              {errors.category_id}
            </span>
          )}
        </div>
      </div>

      <InputField
        label="Opis događaja"
        name="description"
        value={formData.description}
        onChange={handleChange}
        error={errors.description}
        type="textarea"
        rows={4}
        required
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        <InputField
          label="Datum i vreme početka"
          name="start_date"
          type="datetime-local"
          value={formData.start_date}
          onChange={handleChange}
          error={errors.start_date}
          required
        />

        <InputField
          label="Datum i vreme završetka"
          name="end_date"
          type="datetime-local"
          value={formData.end_date}
          onChange={handleChange}
          error={errors.end_date}
          required
        />
      </div>

      <InputField
        label="Lokacija"
        name="location"
        value={formData.location}
        onChange={handleChange}
        error={errors.location}
        required
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <InputField
          label="Cena karte (RSD)"
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
          error={errors.price}
          required
        />

        <InputField
          label="Ukupan broj karata"
          name="total_tickets"
          type="number"
          min="1"
          value={formData.total_tickets}
          onChange={handleChange}
          error={errors.total_tickets}
          required
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        <InputField
          label="URL glavne slike"
          name="image_url"
          type="url"
          value={formData.image_url}
          onChange={handleChange}
          error={errors.image_url}
        />

        <InputField
          label="URL thumbnail slike"
          name="thumbnail_url"
          type="url"
          value={formData.thumbnail_url}
          onChange={handleChange}
          error={errors.thumbnail_url}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name="featured"
            checked={formData.featured}
            onChange={handleChange}
          />
          Popularni događaj
        </label>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <Button type="submit" disabled={loading} size="large">
          {loading
            ? "Čuvanje..."
            : event
            ? "Ažuriraj događaj"
            : "Kreiraj događaj"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="large"
        >
          Otkaži
        </Button>
      </div>
    </form>
  );
};

export default EventForm;
