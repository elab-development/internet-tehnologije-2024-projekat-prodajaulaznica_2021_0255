import React from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Breadcrumbs from "../common/Breadcrumbs";
import "./Layout.css";

const Layout = ({ children }) => {
  const location = useLocation();

  // Ne prikazujemo breadcrumbs na početnoj stranici
  const showBreadcrumbs = location.pathname !== "/";

  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        {showBreadcrumbs && <Breadcrumbs />}
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
