import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Breadcrumbs.css";

const Breadcrumbs = ({ customPath = null }) => {
  const location = useLocation();

  // Koristimo customPath ako je prosleđen, inače trenutnu lokaciju
  const pathname = customPath || location.pathname;
  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  // Mapiranje putanja na čitljive nazive
  const pathNameMap = {
    "": "Početna",
    events: "Događaji",
    cart: "Korpa",
    profile: "Profil",
    login: "Prijava",
  };

  // Funkcija za dobijanje imena stranice
  const getPageName = (segment, index, segments) => {
    // Ako je poslednji segment i počinje brojem, verovatno je ID
    if (index === segments.length - 1 && /^\d+$/.test(segment)) {
      return "Detalji";
    }

    return (
      pathNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    );
  };

  // Generišemo breadcrumb stavke
  const breadcrumbItems = [
    // Uvek dodajemo početnu stranicu
    {
      path: "/",
      name: "Početna",
      active: pathname === "/",
    },
  ];

  // Dodajemo ostale segmente
  let currentPath = "";
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    breadcrumbItems.push({
      path: currentPath,
      name: getPageName(segment, index, pathSegments),
      active: isLast,
    });
  });

  // Ako imamo samo početnu stranicu, ne prikazujemo breadcrumbs
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb navigacija">
      <ol className="breadcrumb-list">
        {breadcrumbItems.map((item, index) => (
          <li
            key={item.path}
            className={`breadcrumb-item ${item.active ? "active" : ""}`}
          >
            {item.active ? (
              <span className="breadcrumb-current" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link to={item.path} className="breadcrumb-link">
                {item.name}
              </Link>
            )}

            {index < breadcrumbItems.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                ▶️
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
