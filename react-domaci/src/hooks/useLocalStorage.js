import { useState, useEffect } from "react";

// Custom hook za rad sa localStorage
const useLocalStorage = (key, initialValue) => {
  // State za čuvanje vrednosti
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Pokušaj da učitaš vrednost iz localStorage
      const item = window.localStorage.getItem(key);
      // Parsiraj JSON ili vrati initialValue ako nema ništa
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Ako ima greška prilikom parsiranja, logovaj i vrati initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Funkcija za postavljanje vrednosti
  const setValue = (value) => {
    try {
      // Dozvoli da vrednost bude funkcija tako da imamo istu API kao useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Sačuvaj u state
      setStoredValue(valueToStore);

      // Sačuvaj u localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Funkcija za uklanjanje iz localStorage
  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;
