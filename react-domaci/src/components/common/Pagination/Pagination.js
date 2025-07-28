import React from "react";
import Button from "../Button";
import "./Pagination.css";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  showFirstLast = true,
  maxVisiblePages = 5,
}) => {
  // Funkcija za generisanje vidljivih stranica
  const getVisiblePages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Stranica {currentPage} od {totalPages}
      </div>

      <div className="pagination-controls">
        {/* First page */}
        {showFirstLast && currentPage > 1 && (
          <Button
            variant="outline"
            size="small"
            onClick={() => onPageChange(1)}
            className="pagination-btn"
          >
            ⏮️
          </Button>
        )}

        {/* Previous page */}
        <Button
          variant="outline"
          size="small"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          ◀️ Prethodna
        </Button>

        {/* Page numbers */}
        {showPageNumbers && (
          <div className="pagination-numbers">
            {getVisiblePages().map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "primary" : "outline"}
                size="small"
                onClick={() => onPageChange(page)}
                className="pagination-number"
              >
                {page}
              </Button>
            ))}
          </div>
        )}

        {/* Next page */}
        <Button
          variant="outline"
          size="small"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Sledeća ▶️
        </Button>

        {/* Last page */}
        {showFirstLast && currentPage < totalPages && (
          <Button
            variant="outline"
            size="small"
            onClick={() => onPageChange(totalPages)}
            className="pagination-btn"
          >
            ⏭️
          </Button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
