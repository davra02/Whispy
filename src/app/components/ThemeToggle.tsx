import React, { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Detectar y aplicar el tema almacenado en el localStorage
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    
    if (storedTheme) {
      setTheme(storedTheme);
      // Limpiar clases existentes y aplicar la correcta
      document.documentElement.classList.remove('light', 'dark');
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } else {
      // Si no hay tema guardado, usar light por defecto
      setTheme('light');
      document.documentElement.classList.remove('light', 'dark');
      // No añadir 'light' porque Tailwind usa 'dark' como modificador
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // Actualizar el tema en el DOM
    document.documentElement.classList.remove('light', 'dark');
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Guardar el tema en el localStorage
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-md hover:shadow-lg transition-all duration-300"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle;