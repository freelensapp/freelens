// Unit test for the theme configuration module

import { setCustomTheme, getCurrentTheme } from './themeConfig';

describe('Theme Configuration', () => {
  it('should return the default theme configuration', () => {
    const defaultTheme = getCurrentTheme();
    expect(defaultTheme.primaryColor).toBe('#3498db');
    expect(defaultTheme.secondaryColor).toBe('#2ecc71');
    expect(defaultTheme.backgroundColor).toBe('#ecf0f1');
    expect(defaultTheme.textColor).toBe('#2c3e50');
    expect(defaultTheme.accentColor).toBe('#e74c3c');
  });

  it('should update the theme with new custom colors', () => {
    setCustomTheme({ primaryColor: '#9b59b6', textColor: '#34495e' });
    const updatedTheme = getCurrentTheme();
    expect(updatedTheme.primaryColor).toBe('#9b59b6');
    expect(updatedTheme.textColor).toBe('#34495e');
  });
});
