import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Paletas de colores disponibles
export const COLOR_PALETTES = {
  light: {
    name: 'Claro',
    primary: '#4f46e5', // indigo
    secondary: '#6366f1',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    accent: '#8b5cf6'
  },
  dark: {
    name: 'Oscuro',
    primary: '#6366f1',
    secondary: '#818cf8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#a78bfa'
  },
  blue: {
    name: 'Azul Océano',
    primary: '#0284c7',
    secondary: '#0ea5e9',
    background: '#f0f9ff',
    surface: '#e0f2fe',
    text: '#082f49',
    textSecondary: '#0369a1',
    border: '#bae6fd',
    accent: '#38bdf8'
  },
  purple: {
    name: 'Púrpura Real',
    primary: '#7c3aed',
    secondary: '#8b5cf6',
    background: '#faf5ff',
    surface: '#f3e8ff',
    text: '#3b0764',
    textSecondary: '#6b21a8',
    border: '#e9d5ff',
    accent: '#a78bfa'
  },
  green: {
    name: 'Verde Bosque',
    primary: '#059669',
    secondary: '#10b981',
    background: '#f0fdf4',
    surface: '#dcfce7',
    text: '#064e3b',
    textSecondary: '#047857',
    border: '#bbf7d0',
    accent: '#34d399'
  },
  rose: {
    name: 'Rosa Elegante',
    primary: '#e11d48',
    secondary: '#f43f5e',
    background: '#fff1f2',
    surface: '#ffe4e6',
    text: '#881337',
    textSecondary: '#be123c',
    border: '#fecdd3',
    accent: '#fb7185'
  },
  amber: {
    name: 'Ámbar Dorado',
    primary: '#d97706',
    secondary: '#f59e0b',
    background: '#fffbeb',
    surface: '#fef3c7',
    text: '#78350f',
    textSecondary: '#92400e',
    border: '#fde68a',
    accent: '#fbbf24'
  },
  slate: {
    name: 'Pizarra Moderna',
    primary: '#475569',
    secondary: '#64748b',
    background: '#f8fafc',
    surface: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#cbd5e1',
    accent: '#94a3b8'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentPalette, setCurrentPalette] = useState('light');
  const [assistantConfig, setAssistantConfig] = useState({
    name: 'Jika',
    photo: '',
    tone: 'amable'
  });

  useEffect(() => {
    // Cargar tema guardado
    const savedPalette = localStorage.getItem('theme-palette');
    if (savedPalette && COLOR_PALETTES[savedPalette]) {
      setCurrentPalette(savedPalette);
    }

    // Cargar configuración del asistente
    const savedConfig = localStorage.getItem('assistant-config');
    if (savedConfig) {
      try {
        setAssistantConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading assistant config:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Aplicar tema a CSS variables
    const palette = COLOR_PALETTES[currentPalette];
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-secondary', palette.secondary);
    root.style.setProperty('--color-background', palette.background);
    root.style.setProperty('--color-surface', palette.surface);
    root.style.setProperty('--color-text', palette.text);
    root.style.setProperty('--color-text-secondary', palette.textSecondary);
    root.style.setProperty('--color-border', palette.border);
    root.style.setProperty('--color-accent', palette.accent);

    // Guardar en localStorage
    localStorage.setItem('theme-palette', currentPalette);
  }, [currentPalette]);

  const changePalette = (paletteName) => {
    if (COLOR_PALETTES[paletteName]) {
      setCurrentPalette(paletteName);
    }
  };

  const updateAssistantConfig = (config) => {
    setAssistantConfig(config);
    localStorage.setItem('assistant-config', JSON.stringify(config));
  };

  return (
    <ThemeContext.Provider value={{ 
      currentPalette, 
      changePalette, 
      palette: COLOR_PALETTES[currentPalette],
      assistantConfig,
      updateAssistantConfig
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
