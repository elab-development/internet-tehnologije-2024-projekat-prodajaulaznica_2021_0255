import React from "react";
import Button from "../../components/common/Button";

const HomePage = () => {
  const handleClick = (message) => {
    alert(message);
  };

  return (
    <div>
      <h2>Dobrodošli na TicketMaster Pro! 🎫</h2>
      <p>Pronađite i kupite karte za najbolje događaje u gradu.</p>

      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Button onClick={() => handleClick("Primary button!")}>
          Kupi karte
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleClick("Secondary button!")}
        >
          Saznaj više
        </Button>

        <Button
          variant="outline"
          onClick={() => handleClick("Outline button!")}
        >
          Kontakt
        </Button>

        <Button
          variant="success"
          size="small"
          onClick={() => handleClick("Success button!")}
        >
          ✓ Uspešno
        </Button>

        <Button variant="danger" loading={true}>
          Loading...
        </Button>

        <Button disabled={true}>Disabled</Button>
      </div>
    </div>
  );
};

export default HomePage;
