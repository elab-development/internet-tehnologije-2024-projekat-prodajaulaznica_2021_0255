// services/pdfService.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const generateTicketPDF = async (ticketData) => {
  // Kreiraj HTML element za PDF
  const element = document.createElement("div");
  element.innerHTML = createTicketHTML(ticketData);

  // Stilizuj element
  Object.assign(element.style, {
    width: "800px",
    padding: "20px",
    backgroundColor: "white",
    fontFamily: "Arial, sans-serif",
    position: "absolute",
    left: "-9999px", // Sakrij van ekrana
    top: "0",
  });

  // Dodaj u DOM privremeno
  document.body.appendChild(element);

  try {
    // Sačekaj da se SVG učita
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Konvertuj u canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: 800,
      height: element.scrollHeight,
    });

    // Kreiraj PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Dodaj prvu stranu
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Dodaj dodatne strane ako je potrebno
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  } finally {
    // Ukloni iz DOM-a
    document.body.removeChild(element);
  }
};

const createTicketHTML = (ticketData) => `
  <div style="max-width: 750px; margin: 0 auto; padding: 30px; background: white;">
    <!-- Ticket container -->
    <div style="border: 3px dashed #333; border-radius: 15px; padding: 40px; background: white;">
      
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #eee; padding-bottom: 25px; margin-bottom: 35px;">
        <div style="font-size: 32px; font-weight: bold; color: #333; margin-bottom: 15px;">
          🎫 ELEKTRONSKA KARTA
        </div>
        <div style="font-size: 20px; font-family: 'Courier New', monospace; background: #f8f9fa; padding: 10px 20px; border-radius: 8px; display: inline-block; letter-spacing: 2px; font-weight: bold;">
          ${ticketData.ticket_number}
        </div>
      </div>
      
      <!-- Event and ticket info -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 35px;">
        
        <!-- Event info -->
        <div>
          <h3 style="color: #007bff; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #007bff; padding-bottom: 8px;">
            📅 Informacije o događaju
          </h3>
          <div style="space-y: 12px;">
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Naziv:</span>
              <span style="color: #333; text-align: right; max-width: 60%;">${
                ticketData.event.name
              }</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Datum:</span>
              <span style="color: #333;">${ticketData.event.date}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Vreme:</span>
              <span style="color: #333;">${ticketData.event.time}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Lokacija:</span>
              <span style="color: #333; text-align: right; max-width: 60%;">${
                ticketData.event.location
              }</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Kategorija:</span>
              <span style="color: #333;">${ticketData.event.category}</span>
            </div>
          </div>
        </div>
        
        <!-- Ticket info -->
        <div>
          <h3 style="color: #007bff; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #007bff; padding-bottom: 8px;">
            👤 Informacije o karti
          </h3>
          <div style="space-y: 12px;">
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Vlasnik:</span>
              <span style="color: #333; text-align: right; max-width: 60%;">${
                ticketData.user.name
              }</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Email:</span>
              <span style="color: #333; text-align: right; max-width: 60%;">${
                ticketData.user.email
              }</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Cena:</span>
              <span style="color: #333; font-weight: bold;">${formatPrice(
                ticketData.price
              )} RSD</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Kupljeno:</span>
              <span style="color: #333;">${ticketData.purchase_date}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #555;">Status:</span>
              <span style="color: #333; font-weight: bold;">${getStatusText(
                ticketData.status
              )}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- QR Code section -->
      <div style="text-align: center; background: #f8f9fa; padding: 30px; border-radius: 12px; margin: 25px 0;">
        <h3 style="margin-bottom: 20px; color: #333; font-size: 20px;">📱 QR kod za ulaz</h3>
        <div style="display: inline-block; padding: 25px; background: white; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          ${ticketData.qr_code_svg}
        </div>
        <p style="margin-top: 15px; font-weight: bold; color: #333;">Pokažite ovaj kod na ulazu na događaj</p>
      </div>
      
      <!-- Instructions -->
      <div style="background: #e3f2fd; border: 2px solid #2196f3; border-radius: 10px; padding: 20px; margin-top: 25px;">
        <h4 style="margin-top: 0; color: #1976d2; font-size: 18px;">📋 Napomene:</h4>
        <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
          <li style="margin-bottom: 8px;">Ponesitе ovu kartu (štampanu ili na telefonu) i važeći lični dokument</li>
          <li style="margin-bottom: 8px;">QR kod se može skenirati direktno sa ekrana telefona</li>
          <li style="margin-bottom: 8px;">Karta važi samo za navedeni datum i vreme</li>
          <li style="margin-bottom: 8px;">U slučaju problema kontaktirajte organizatore</li>
        </ul>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p style="margin: 0;">Ticket Master Pro | Elektronska karta generisana ${new Date().toLocaleString(
          "sr-RS"
        )}</p>
      </div>
    </div>
  </div>
`;

// Helper funkcije
const formatPrice = (price) => {
  return new Intl.NumberFormat("sr-RS").format(price);
};

const getStatusText = (status) => {
  switch (status) {
    case "active":
      return "Aktivna";
    case "used":
      return "Iskorišćena";
    case "cancelled":
      return "Otkazana";
    default:
      return status;
  }
};
