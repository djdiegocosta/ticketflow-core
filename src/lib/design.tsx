import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AccentColor = "green" | "blue" | "purple" | "red";
type CornerStyle = "straight" | "rounded";

const ACCENT_COLORS = {
  green: { accent: "#00e676", hover: "#00c853", muted: "#e8fff4", text: "#00a844" },
  blue: { accent: "#00B0FF", hover: "#0091EA", muted: "#e1f5fe", text: "#01579B" },
  purple: { accent: "#D500F9", hover: "#AA00FF", muted: "#f3e5f5", text: "#4A148C" },
  red: { accent: "#FF1744", hover: "#D50000", muted: "#ffebee", text: "#B71C1C" },
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

  useEffect(() => {
    const savedColor = window.localStorage.getItem(STORAGE_COLOR_KEY) as AccentColor;
    if (savedColor && ACCENT_COLORS[savedColor]) setAccentState(savedColor);

    const savedRadius = window.localStorage.getItem(STORAGE_RADIUS_KEY) as CornerStyle;
    if (savedRadius && CORNER_STYLES[savedRadius]) setRadiusState(savedRadius);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accent];
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-hover", colors.hover);
    root.style.setProperty("--accent-muted", colors.muted);
    root.style.setProperty("--accent-text", colors.text);
    // Sync with shadcn primary tokens used in some components if needed
    root.style.setProperty("--primary", colors.accent);
    root.style.setProperty("--ring", colors.accent);
  }, [accent]);

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