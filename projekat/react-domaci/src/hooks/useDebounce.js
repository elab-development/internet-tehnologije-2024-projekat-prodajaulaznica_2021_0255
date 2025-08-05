import { useState, useEffect } from "react";

// Custom hook za debouncing - optimizuje pretraživanje
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Postavlja timer koji će se pokrenuti nakon 'delay' milisekundi
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup funkcija koja otkazuje prethodni timer
    // Ovo se pokreće pri svakoj promeni 'value' ili 'delay'
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
