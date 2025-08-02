import React from "react";
import Button from "../../components/common/Button";
import InputField from "../../components/common/InputField";

const LoginPage = () => {
  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto", padding: "2rem" }}>
      <h2>🔐 Prijava</h2>
      <InputField label="Email" type="email" placeholder="vaš@email.com" />
      <InputField label="Lozinka" type="password" placeholder="••••••••" />
      <Button size="large" style={{ width: "100%", marginTop: "1rem" }}>
        Prijavite se
      </Button>
      <p style={{ textAlign: "center", marginTop: "1rem", color: "#666" }}>
        Ova stranica je u razvoju.
      </p>
    </div>
  );
};

export default LoginPage;
