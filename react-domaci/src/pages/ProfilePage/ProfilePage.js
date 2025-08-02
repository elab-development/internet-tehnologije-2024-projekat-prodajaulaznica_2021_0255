import React from "react";
import Button from "../../components/common/Button";

const ProfilePage = () => {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>👤 Korisnički profil</h2>
      <p>Ova stranica je u razvoju.</p>
      <Button variant="outline" onClick={() => window.history.back()}>
        ← Nazad
      </Button>
    </div>
  );
};

export default ProfilePage;
