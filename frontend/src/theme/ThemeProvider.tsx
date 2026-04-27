import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "tinted-dark" | "system";
export type Density = "comfortable" | "compact";

const THEME_KEY = "junior_school_theme_pref";
const DENSITY_KEY = "junior_school_density";
const FONT_KEY = "junior_school_font_family";

export type FontPreference = "Inter" | "Outfit" | "Poppins" | "Manrope" | "Plus Jakarta Sans";

type ThemeContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (v: ThemePreference) => void;
  resolvedTheme: "light" | "dark" | "tinted-dark";
  density: Density;
  setDensity: (v: Density) => void;
  fontFamily: FontPreference;
  setFontFamily: (v: FontPreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "tinted-dark" || v === "system") return v as ThemePreference;
  } catch {
    /* ignore */
  }
  return "light";
}

function readStoredDensity(): Density {
  try {
    const v = localStorage.getItem(DENSITY_KEY);
    if (v === "comfortable" || v === "compact") return v;
  } catch {
    /* ignore */
  }
  return "comfortable";
}

function readStoredFont(): FontPreference {
  try {
    const v = localStorage.getItem(FONT_KEY);
    if (v === "Inter" || v === "Outfit" || v === "Poppins" || v === "Manrope" || v === "Plus Jakarta Sans") return v as FontPreference;
  } catch {
    /* ignore */
  }
  return "Inter";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>(readStoredTheme);
  const [density, setDensityState] = useState<Density>(readStoredDensity);
  const [fontFamily, setFontFamilyState] = useState<FontPreference>(readStoredFont);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.body.style.fontFamily = `'${fontFamily}', sans-serif`;
  }, [fontFamily]);

  const resolvedTheme: "light" | "dark" | "tinted-dark" =
    themePreference === "system"
      ? systemDark
        ? "dark"
        : "light"
      : themePreference;

  const setThemePreference = useCallback((v: ThemePreference) => {
    setThemePreferenceState(v);
    try {
      localStorage.setItem(THEME_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const setDensity = useCallback((v: Density) => {
    setDensityState(v);
    try {
      localStorage.setItem(DENSITY_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const setFontFamily = useCallback((v: FontPreference) => {
    setFontFamilyState(v);
    try {
      localStorage.setItem(FONT_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      resolvedTheme,
      density,
      setDensity,
      fontFamily,
      setFontFamily,
    }),
    [
      themePreference,
      setThemePreference,
      resolvedTheme,
      density,
      setDensity,
      fontFamily,
      setFontFamily,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
