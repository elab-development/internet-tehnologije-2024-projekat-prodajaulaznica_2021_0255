import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.5rem",
        margin: "2rem 0",
        flexWrap: "wrap",
      }}
    >
      {/* First page */}
      {currentPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              backgroundColor: "white",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            ««
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              backgroundColor: "white",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            ‹
          </button>
        </>
      )}

      {/* Page numbers */}
      {getPageNumbers().map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #ddd",
            backgroundColor: pageNum === currentPage ? "#007bff" : "white",
            color: pageNum === currentPage ? "white" : "#333",
            cursor: "pointer",
            borderRadius: "4px",
            fontWeight: pageNum === currentPage ? "bold" : "normal",
          }}
        >
          {pageNum}
        </button>
      ))}

      {/* Last page */}
      {currentPage < totalPages && (
        <>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              backgroundColor: "white",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ddd",
              backgroundColor: "white",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            »»
          </button>
        </>
      )}
    </div>
  );
};

export default Pagination;
