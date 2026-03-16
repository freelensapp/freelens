// ThemeProvider component that provides theme configuration to the entire app.

import React, { createContext, useContext, useState } from 'react';
import { getCurrentTheme } from './themeConfig';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getCurrentTheme());

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
