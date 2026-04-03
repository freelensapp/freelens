// ThemeSwitcher component to allow users to switch between themes.

import React from 'react';
import { useTheme } from './ThemeProvider';
import { setCustomTheme } from './themeConfig';

const ThemeSwitcher = () => {
  const { setTheme } = useTheme();

  const handleThemeChange = (newTheme) => {
    setCustomTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <div>
      <button onClick={() => handleThemeChange({ primaryColor: '#e67e22', textColor: '#34495e' })}>Change Theme</button>
    </div>
  );
};

export default ThemeSwitcher;
