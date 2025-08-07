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
    available_tickets: "",
    category_id: "",
    featured: false,
  });

  // Add new state for file uploads
  const [imageFiles, setImageFiles] = useState({
    main: null,
    thumbnail: null,
  });
  const [uploadingImages, setUploadingImages] = useState({
    main: false,
    thumbnail: false,
  });
  const [imagePreview, setImagePreview] = useState({
    main: "",
    thumbnail: "",
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

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
      setIsEditing(true);
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
        available_tickets: event.available_tickets || "",
        category_id: event.category?.id || "",
        featured: event.featured || false,
      });

      // Set existing images for preview
      setImagePreview({
        main: event.image_url || "",
        thumbnail: event.thumbnail_url || "",
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;

    // Special handling for ticket numbers when editing
    if (name === "total_tickets" && isEditing) {
      const newTotal = parseInt(newValue) || 0;
      const currentTotal = parseInt(formData.total_tickets) || 0;
      const currentAvailable = parseInt(formData.available_tickets) || 0;
      const soldTickets = currentTotal - currentAvailable;

      // Calculate new available tickets
      const newAvailable = Math.max(0, newTotal - soldTickets);

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
        available_tickets: newAvailable.toString(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }));
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Add new method for handling file selection
  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          [`${type}_image`]: "Molimo izaberite sliku",
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        setErrors((prev) => ({
          ...prev,
          [`${type}_image`]: "Slika ne sme biti veća od 5MB",
        }));
        return;
      }

      setImageFiles((prev) => ({
        ...prev,
        [type]: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview((prev) => ({
          ...prev,
          [type]: e.target.result,
        }));
      };
      reader.readAsDataURL(file);

      // Clear any previous errors
      setErrors((prev) => ({
        ...prev,
        [`${type}_image`]: "",
      }));
    }
  };

  // Add method for uploading images
  const uploadImage = async (file, type) => {
    setUploadingImages((prev) => ({ ...prev, [type]: true }));

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      formDataUpload.append("type", type);

      const response = await apiService.uploadEventImage(formDataUpload);

      if (response.success) {
        const urlField = type === "main" ? "image_url" : "thumbnail_url";
        setFormData((prev) => ({
          ...prev,
          [urlField]: response.data.url,
        }));

        return response.data.url;
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [`${type}_image`]: error.message || "Greška pri upload-u slike",
      }));
      throw error;
    } finally {
      setUploadingImages((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDuplicate = () => {
    if (!event) return;

    const duplicatedData = {
      ...formData,
      name: `${formData.name} (kopija)`,
      start_date: "",
      end_date: "",
      total_tickets: formData.total_tickets,
      available_tickets: formData.total_tickets,
      featured: false,
    };

    setFormData(duplicatedData);
    setIsEditing(false);
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

    // Check if event is in the past when editing
    if (
      isEditing &&
      formData.start_date &&
      new Date(formData.start_date) < new Date()
    ) {
      // Allow editing past events but show warning
      console.warn("Editing past event");
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

    // When editing, check if new total is less than sold tickets
    if (isEditing) {
      const newTotal = parseInt(formData.total_tickets) || 0;
      const available = parseInt(formData.available_tickets) || 0;
      const sold = newTotal - available;

      if (newTotal < sold) {
        newErrors.total_tickets = `Ukupan broj karata ne može biti manji od broja prodanih karata (${sold})`;
      }
    }

    if (!formData.category_id) {
      newErrors.category_id = "Kategorija je obavezna";
    }

    // Validate URLs if provided
    if (formData.image_url && !isValidUrl(formData.image_url)) {
      newErrors.image_url = "Neispravna URL adresa";
    }

    if (formData.thumbnail_url && !isValidUrl(formData.thumbnail_url)) {
      newErrors.thumbnail_url = "Neispravna URL adresa";
    }

    return newErrors;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Updated handleSubmit method
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
      let finalFormData = { ...formData };

      // Upload images if new files are selected
      if (imageFiles.main) {
        const mainImageUrl = await uploadImage(imageFiles.main, "main");
        finalFormData.image_url = mainImageUrl;
      }

      if (imageFiles.thumbnail) {
        const thumbnailUrl = await uploadImage(
          imageFiles.thumbnail,
          "thumbnail"
        );
        finalFormData.thumbnail_url = thumbnailUrl;
      }

      const eventData = {
        ...finalFormData,
        price: parseFloat(finalFormData.price),
        total_tickets: parseInt(finalFormData.total_tickets),
        available_tickets: isEditing
          ? parseInt(finalFormData.available_tickets)
          : parseInt(finalFormData.total_tickets),
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

  const getSoldTicketsCount = () => {
    if (!isEditing) return 0;
    return (
      (parseInt(formData.total_tickets) || 0) -
      (parseInt(formData.available_tickets) || 0)
    );
  };

  const removeImage = (type) => {
    setImagePreview((prev) => ({ ...prev, [type]: "" }));
    setImageFiles((prev) => ({ ...prev, [type]: null }));
    const urlField = type === "main" ? "image_url" : "thumbnail_url";
    setFormData((prev) => ({ ...prev, [urlField]: "" }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        maxHeight: "80vh",
        overflowY: "auto",
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

      {/* Basic Information */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>
          Osnovne informacije
        </h3>

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
      </div>

      {/* Date and Location */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>
          Datum i lokacija
        </h3>

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
      </div>

      {/* Pricing and Tickets */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>Cena i karte</h3>

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

          {isEditing && (
            <InputField
              label="Dostupne karte"
              name="available_tickets"
              type="number"
              min="0"
              value={formData.available_tickets}
              onChange={handleChange}
              error={errors.available_tickets}
              disabled
            />
          )}
        </div>

        {isEditing && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              marginTop: "1rem",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0" }}>Statistike karata:</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              <div>
                <strong>Ukupno:</strong> {formData.total_tickets}
              </div>
              <div>
                <strong>Prodano:</strong> {getSoldTicketsCount()}
              </div>
              <div>
                <strong>Dostupno:</strong> {formData.available_tickets}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Updated Images section */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>Slike</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
        >
          {/* Main image upload */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Glavna slika
            </label>

            <div
              style={{
                position: "relative",
                border: "2px dashed #ddd",
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "center",
                backgroundColor: "#fafafa",
                cursor: "pointer",
              }}
            >
              {imagePreview.main || formData.image_url ? (
                <div>
                  <img
                    src={imagePreview.main || formData.image_url}
                    alt="Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                    }}
                  />
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage("main");
                      }}
                    >
                      Ukloni
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                    📷
                  </div>
                  <p>Kliknite da izaberete glavnu sliku</p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "main")}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
              />
            </div>

            {uploadingImages.main && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "0.5rem",
                  color: "#666",
                }}
              >
                Uploading...
              </div>
            )}

            {errors.main_image && (
              <span style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
                {errors.main_image}
              </span>
            )}

            <div style={{ marginTop: "1rem" }}>
              <InputField
                label="Ili unesite URL glavne slike"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleChange}
                error={errors.image_url}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {/* Thumbnail upload */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              Thumbnail slika
            </label>

            <div
              style={{
                position: "relative",
                border: "2px dashed #ddd",
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "center",
                backgroundColor: "#fafafa",
                cursor: "pointer",
              }}
            >
              {imagePreview.thumbnail || formData.thumbnail_url ? (
                <div>
                  <img
                    src={imagePreview.thumbnail || formData.thumbnail_url}
                    alt="Thumbnail Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "4px",
                      marginBottom: "1rem",
                    }}
                  />
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        removeImage("thumbnail");
                      }}
                    >
                      Ukloni
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>
                    🖼️
                  </div>
                  <p>Kliknite da izaberete thumbnail</p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "thumbnail")}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
              />
            </div>

            {uploadingImages.thumbnail && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "0.5rem",
                  color: "#666",
                }}
              >
                Uploading...
              </div>
            )}

            {errors.thumbnail_image && (
              <span style={{ color: "#e53e3e", fontSize: "0.875rem" }}>
                {errors.thumbnail_image}
              </span>
            )}

            <div style={{ marginTop: "1rem" }}>
              <InputField
                label="Ili unesite URL thumbnail slike"
                name="thumbnail_url"
                type="url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                error={errors.thumbnail_url}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", color: "#333" }}>Opcije</h3>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleChange}
            />
            <span>Popularni događaj</span>
            <span style={{ fontSize: "0.875rem", color: "#666" }}>
              (prikazaće se na početnoj stranici)
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #eee",
        }}
      >
        <Button type="submit" disabled={loading} size="large">
          {loading
            ? "Čuvanje..."
            : event
            ? "Ažuriraj događaj"
            : "Kreiraj događaj"}
        </Button>

        {event && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDuplicate}
            disabled={loading}
            size="large"
          >
            Dupliraj
          </Button>
        )}

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
