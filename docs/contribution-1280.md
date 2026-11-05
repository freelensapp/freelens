# 🎨 **Custom Theme & Color Feature** – Freelens  
*Bounty: $50 USD – Desarrollado para @mau16ro*  

---  

## 1️⃣ Resumen ejecutivo  

| **Objetivo** | Permitir a los usuarios cambiar los colores de la UI de Freelens, crear, guardar y cargar temas personalizados de forma sencilla y persistente. |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **Beneficios** | • Mejora la experiencia de usuario (UX).<br>• Incrementa la accesibilidad (p.ej. modo alto‑contraste).<br>• Reduce tickets de “no hay opción de color”. |
| **Alcance** | - Implementación de un **Theme Engine** basado en **CSS variables** y **React Context**.<br>- UI de gestión de temas (selector, editor, pre‑sets).<br>- Persistencia en **localStorage** y, opcionalmente, vía **API** (endpoint `/api/themes`).<br>- Tests unitarios (Jest + React Testing Library). |
| **Tecnologías** | React 18, TypeScript 5, styled‑components (o Emotion) *opcional*, Tailwind (si se usa), Jest, React Testing Library, ESLint/Prettier. |
| **Entregables** | - Código fuente listo para producción.<br>- Tests con cobertura ≥ 90 %.<br>- Guía de instalación y migración. |

---  

## 2️⃣ Arquitectura de la solución  

```
src/
├─ theme/
│   ├─ types.ts               # Tipos de Theme y Palette
│   ├─ defaultThemes.ts       # Paletas predefinidas (light, dark, etc.)
│   ├─ ThemeContext.tsx       # Context + Provider
│   ├─ useTheme.ts            # Hook de conveniencia
│   ├─ ThemeUtils.ts          # Helpers (CSS var injection, validation)
│   └─ ThemeEditor/
│       ├─ ThemeEditor.tsx    # UI para crear/editar temas
│       └─ ColorPicker.tsx   # Componente de selección de color
├─ api/
│   └─ themes.ts              # (opcional) cliente HTTP para guardar temas
├─ components/
│   └─ ThemeSwitcher.tsx      # Dropdown que muestra los temas disponibles
└─ App.tsx                    # Envoltorio con ThemeProvider
```

### 2.1 Flujo de datos  

1. **Carga inicial** – `ThemeProvider` lee `localStorage['freelens_theme']`. Si no existe, usa el tema *light* por defecto.  
2. **Cambio de tema** – Cualquier componente llama a `setTheme(newTheme)` del contexto.  
3. **Persistencia** – `ThemeProvider` escribe el tema seleccionado en `localStorage` y, si la API está habilitada, envía un `POST /api/themes`.  
4. **Aplicación del estilo** – `ThemeUtils.applyThemeVariables(theme)` itera la paleta y actualiza los **CSS variables** en `:root`. Todos los componentes usan esas variables (`var(--color-primary)`, `var(--bg-surface)`, …).  

### 2.2 Decisiones de diseño  

| Decisión | Motivo |
|----------|--------|
| **CSS Variables** | Permiten que cualquier hoja de estilos (Tailwind, SCSS, styled‑components) consuma los colores sin recompilar. |
| **React Context** | Evita prop‑drilling y permite cambiar el tema desde cualquier nivel. |
| **Persistencia local** | Funciona sin backend y satisface la mayoría de los casos de uso. La API opcional permite sincronizar entre dispositivos. |
| **Typed Theme** | Garantiza que todos los colores estén definidos y evita errores de tipado en tiempo de compilación. |
| **Separate Editor** | Mantiene la UI de configuración aislada del resto del código y facilita pruebas unitarias. |

---  

## 3️⃣ Código fuente (TypeScript)  

> **Nota:** Cada archivo incluye comentarios y está tipado. Copia la estructura tal cual dentro de tu proyecto `src/`.  

### 3.1 `src/theme/types.ts`

```ts
/** Tipos de colores que admite la UI */
export type ColorKey =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'error'
  | 'onPrimary'
  | 'onSecondary'
  | 'onAccent'
  | 'onBackground'
  | 'onSurface'
  | 'onError';

/** Paleta de colores para un tema */
export interface Palette {
  [key in ColorKey]: string; // hex, rgb(), hsl() …
}

/** Descripción completa de un tema */
export interface Theme {
  /** Identificador único (uuid o slug) */
  id: string;
  /** Nombre amigable que verá el usuario */
  name: string;
  /** Paleta de colores */
  palette: Palette;
  /** Marca el tema como pre‑definido (no se puede eliminar) */
  builtin?: boolean;
}

/** Estructura de los valores que se guardan en localStorage */
export interface StoredTheme {
  id: string;
}
```

### 3.2 `src/theme/defaultThemes.ts`

```ts
import { Theme } from './types';
import { v4 as uuidv4 } from 'uuid';

export const lightTheme: Theme = {
  id: uuidv4(),
  name: 'Light',
  builtin: true,
  palette: {
    primary: '#1976d2',
    secondary: '#9c27b0',
    accent: '#ff9800',
    background: '#fafafa',
    surface: '#ffffff',
    error: '#f44336',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onAccent: '#ffffff',
    onBackground: '#212121',
    onSurface: '#212121',
    onError: '#ffffff',
  },
};

export const darkTheme: Theme = {
  id: uuidv4(),
  name: 'Dark',
  builtin: true,
  palette: {
    primary: '#90caf9',
    secondary: '#ce93d8',
    accent: '#ffb74d',
    background: '#121212',
    surface: '#1e1e1e',
    error: '#ef5350',
    onPrimary: '#212121',
    onSecondary: '#212121',
    onAccent: '#212121',
    onBackground: '#e0e0e0',
    onSurface: '#e0e0e0',
    onError: '#212121',
  },
};

/** Array con los temas incluidos por defecto */
export const builtinThemes: Theme[] = [lightTheme, darkTheme];
```

### 3.3 `src/theme/ThemeUtils.ts`

```ts
import { Theme } from './types';

/**
 * Aplica la paleta del tema como CSS variables en :root.
 * Cada key se convierte en `--color-{key}`.
 */
export const applyThemeVariables = (theme: Theme): void => {
  const root = document.documentElement;
  Object.entries(theme.palette).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // También guardamos el nombre para uso externo (p. ej. analytics)
  root.setAttribute('data-theme-name', theme.name);
};

/**
 * Valida que una cadena sea un color CSS válido.
 * Simplemente intenta asignarla a un elemento dummy.
 */
export const isValidCSSColor = (color: string): boolean => {
  const s = new Option().style;
  s.color = '';
  s.color = color;
  return s.color !== '';
};
```

### 3.4 `src/theme/ThemeContext.tsx`

```tsx
import React, {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { Theme, StoredTheme } from './types';
import { builtinThemes, lightTheme } from './defaultThemes';
import { applyThemeVariables } from './ThemeUtils';
import { v4 as uuidv4 } from 'uuid';

interface ThemeContextProps {
  /** Tema activo */
  current: Theme;
  /** Lista completa (builtin + custom) */
  allThemes: Theme[];
  /** Cambiar a otro tema existente */
  setThemeById: (id: string) => void;
  /** Crear y activar un nuevo tema */
  createCustomTheme: (name: string, palette: Theme['palette']) => Theme;
  /** Eliminar tema custom (no builtin) */
  deleteCustomTheme: (id: string) => void;
}

/** Valor por defecto (solo para evitar null checks) */
const ThemeContext = createContext<ThemeContextProps>({
  current: lightTheme,
  allThemes: builtinThemes,
  setThemeById: () => {},
  createCustomTheme: () => lightTheme,
  deleteCustomTheme: () => {},
});

export const ThemeProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [themes, setThemes] = useState<Theme[]>(builtinThemes);
  const [activeTheme, setActiveTheme] = useState<Theme>(lightTheme);

  /** Carga del tema guardado en localStorage */
  const loadStoredTheme = useCallback(() => {
    const stored: StoredTheme | null = JSON.parse(
      localStorage.getItem('freelens_theme') ?? 'null',
    );
    if (stored) {
      const found = themes.find((t) => t.id === stored.id);
      if (found) setActiveTheme(found);
    }
  }, [themes]);

  /** Persistir selección */
  const persistTheme = (theme: Theme) => {
    localStorage.setItem('freelens_theme', JSON.stringify({ id: theme.id }));
    // Si existe una API, se podría enviar aquí:
    // api.saveUserTheme(theme);
  };

  /** Cambiar tema por ID */
  const setThemeById = (id: string) => {
    const theme = themes.find((t) => t.id === id);
    if (theme) {
      setActiveTheme(theme);
      applyThemeVariables(theme);
      persistTheme(theme);
    } else {
      console.warn(`[Theme] No se encontró tema con id ${id}`);
    }
  };

  /** Crear nuevo tema custom */
  const createCustomTheme = (
    name: string,
    palette: Theme['palette'],
  ): Theme => {
    const newTheme: Theme = {
      id: uuidv4(),
      name,
      palette,
    };
    setThemes((prev) => [...prev, newTheme]);
    setThemeById(newTheme.id);
    return newTheme;
  };

  /** Eliminar tema custom */
  const deleteCustomTheme = (id: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== id && !t.builtin));
    // Si el tema activo se elimina, volver al light
    if (activeTheme.id === id) setThemeById(lightTheme.id);
  };

  // Efecto de montaje: cargar tema y aplicar variables
  useEffect(() => {
    // Primero, aplicar variables del tema por defecto (light) para evitar flash.
    applyThemeVariables(activeTheme);
    // Después cargar de storage (si existe)
    loadStoredTheme();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cada vez que activeTheme cambie, aplicar variables.
  useEffect(() => {
    applyThemeVariables(activeTheme);
  }, [activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        current: activeTheme,
        allThemes: themes,
        setThemeById,
        createCustomTheme,
        deleteCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
```

### 3.5 `src/theme/useTheme.ts`

```ts
import { useContext } from 'react';
import ThemeContext from './ThemeContext';

/**
 * Hook de conveniencia para consumir el ThemeContext.
 * Lanza error si se usa fuera de ThemeProvider.
 */
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
};
```

### 3.6 UI – Selector de temas  

#### `src/components/ThemeSwitcher.tsx`

```tsx
import React from 'react';
import { useTheme } from '../theme/useTheme';
import { Menu, Transition } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

export const ThemeSwitcher = () => {
  const { allThemes, current, setThemeById } = useTheme();

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center gap-2 rounded-md bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium">
          Tema: {current.name}
          <ChevronDownIcon className="h-4 w-4" />
        </Menu.Button>
      </div>

      <Transition
        as={React.Fragment}
        enter