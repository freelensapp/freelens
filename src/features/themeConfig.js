// Theme configuration module to allow customization of the UI colors and theme.

const themeConfig = {
  primaryColor: '#3498db',
  secondaryColor: '#2ecc71',
  backgroundColor: '#ecf0f1',
  textColor: '#2c3e50',
  accentColor: '#e74c3c',
};

export function setCustomTheme(newTheme) {
  themeConfig.primaryColor = newTheme.primaryColor || themeConfig.primaryColor;
  themeConfig.secondaryColor = newTheme.secondaryColor || themeConfig.secondaryColor;
  themeConfig.backgroundColor = newTheme.backgroundColor || themeConfig.backgroundColor;
  themeConfig.textColor = newTheme.textColor || themeConfig.textColor;
  themeConfig.accentColor = newTheme.accentColor || themeConfig.accentColor;
}

export function getCurrentTheme() {
  return themeConfig;
}
