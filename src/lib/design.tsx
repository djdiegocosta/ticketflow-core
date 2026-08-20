import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "./theme";
import { useOrganization, useUpdateDesignSettings } from "./settings-queries";

export type AccentColor = "green" | "blue" | "purple" | "red";
export type CornerStyle = "straight" | "rounded";

interface ColorSet {
  accent: string;
  hover: string;
  muted: string;
  text: string;
}

const ACCENT_COLORS: Record<AccentColor, { light: ColorSet; dark: ColorSet }> = {
  green: {
    light: { accent: "#00e676", hover: "#00c853", muted: "#e8fff4", text: "#00a844" },
    dark: { accent: "#00e676", hover: "#00c853", muted: "#0d2a1a", text: "#00e676" },
  },
  blue: {
    light: { accent: "#00B0FF", hover: "#0091EA", muted: "#e1f5fe", text: "#01579B" },
    dark: { accent: "#4FC3F7", hover: "#00B0FF", muted: "#0a2540", text: "#4FC3F7" },
  },
  purple: {
    light: { accent: "#D500F9", hover: "#AA00FF", muted: "#f3e5f5", text: "#4A148C" },
    dark: { accent: "#E040FB", hover: "#D500F9", muted: "#2a0a3d", text: "#E040FB" },
  },
  red: {
    light: { accent: "#FF1744", hover: "#D50000", muted: "#ffebee", text: "#B71C1C" },
    dark: { accent: "#FF5252", hover: "#FF1744", muted: "#3d0a0a", text: "#FF5252" },
  },
};

const CORNER_STYLES = {
  straight: { sm: "0px", md: "0px", lg: "0px", xl: "0px" },
  rounded: { sm: "6px", md: "10px", lg: "14px", xl: "20px" },
};

const STORAGE_COLOR_KEY = "ticketflow-accent";
const STORAGE_RADIUS_KEY = "ticketflow-radius";

const DesignContext = createContext<{
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
  radius: CornerStyle;
  setRadius: (style: CornerStyle) => void;
}>({ accent: "green", setAccent: () => {}, radius: "straight", setRadius: () => {} });

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>("green");
  const [radius, setRadiusState] = useState<CornerStyle>("straight");
  const { theme } = useTheme();

  useEffect(() => {
    const savedColor = window.localStorage.getItem(STORAGE_COLOR_KEY) as AccentColor;
    if (savedColor && ACCENT_COLORS[savedColor]) setAccentState(savedColor);

    const savedRadius = window.localStorage.getItem(STORAGE_RADIUS_KEY) as CornerStyle;
    if (savedRadius && CORNER_STYLES[savedRadius]) setRadiusState(savedRadius);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    const colorSet = ACCENT_COLORS[accent][isDark ? "dark" : "light"];
    
    root.style.setProperty("--accent", colorSet.accent);
    root.style.setProperty("--accent-hover", colorSet.hover);
    root.style.setProperty("--accent-muted", colorSet.muted);
    root.style.setProperty("--accent-text", colorSet.text);
    
    // Sync with shadcn primary tokens
    root.style.setProperty("--primary", colorSet.accent);
    root.style.setProperty("--ring", colorSet.accent);
  }, [accent, theme]);

  useEffect(() => {
    const root = document.documentElement;
    const style = CORNER_STYLES[radius];
    root.style.setProperty("--radius-sm", style.sm);
    root.style.setProperty("--radius-md", style.md);
    root.style.setProperty("--radius-lg", style.lg);
    root.style.setProperty("--radius-xl", style.xl);
    root.style.setProperty("--radius", style.md);
  }, [radius]);

  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
    window.localStorage.setItem(STORAGE_COLOR_KEY, color);
  }, []);

  const setRadius = useCallback((style: CornerStyle) => {
    setRadiusState(style);
    window.localStorage.setItem(STORAGE_RADIUS_KEY, style);
  }, []);

  return (
    <DesignContext.Provider value={{ accent, setAccent, radius, setRadius }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  return useContext(DesignContext);
}
