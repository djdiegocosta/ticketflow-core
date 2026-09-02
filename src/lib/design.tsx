import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "./theme";
import { useOrganization, useUpdateDesignSettings } from "./settings-queries";

export type AccentColor = "green" | "blue" | "roxo" | "red";

interface ColorSet {
  accent: string;
  hover: string;
  muted: string;
  text: string;
  icon: string;
}

export const ACCENT_COLORS: Record<AccentColor, { light: ColorSet; dark: ColorSet }> = {
  green: {
    light: { accent: "#16a34a", hover: "#15803d", muted: "#dcfce7", text: "#15803d", icon: "#00e676" },
    dark: { accent: "#4ade80", hover: "#22c55e", muted: "#0d2a1a", text: "#4ade80", icon: "#39ff8a" },
  },
  blue: {
    light: { accent: "#2563eb", hover: "#1d4ed8", muted: "#dbeafe", text: "#1d4ed8", icon: "#00b0ff" },
    dark: { accent: "#60a5fa", hover: "#3b82f6", muted: "#0d203d", text: "#60a5fa", icon: "#40c4ff" },
  },
  roxo: {
    light: { accent: "#7c3aed", hover: "#6d28d9", muted: "#ede9fe", text: "#6d28d9", icon: "#d500f9" },
    dark: { accent: "#a78bfa", hover: "#8b5cf6", muted: "#2e1065", text: "#c4b5fd", icon: "#e040fb" },
  },
  red: {
    light: { accent: "#dc2626", hover: "#b91c1c", muted: "#fee2e2", text: "#b91c1c", icon: "#ff1744" },
    dark: { accent: "#f87171", hover: "#ef4444", muted: "#450a0a", text: "#fca5a5", icon: "#ff5252" },
  },
};

const STORAGE_COLOR_KEY = "ticketflow-accent";

const DesignContext = createContext<{
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
}>({ accent: "green", setAccent: () => {} });

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>("green");
  const { theme } = useTheme();
  const { data: organization } = useOrganization();
  const updateDesign = useUpdateDesignSettings();

  // Load from localStorage as initial fallback
  useEffect(() => {
    const savedColor = window.localStorage.getItem(STORAGE_COLOR_KEY) as AccentColor;
    if (savedColor && ACCENT_COLORS[savedColor]) setAccentState(savedColor);
  }, []);

  // Sync with organization data when available (has precedence)
  useEffect(() => {
    if (organization) {
      if (organization.accent_color && ACCENT_COLORS[organization.accent_color as AccentColor]) {
        setAccentState(organization.accent_color as AccentColor);
      }
    }
  }, [organization]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    const colorSet = ACCENT_COLORS[accent][isDark ? "dark" : "light"];
    
    root.style.setProperty("--accent", colorSet.accent);
    root.style.setProperty("--accent-hover", colorSet.hover);
    root.style.setProperty("--accent-muted", colorSet.muted);
    root.style.setProperty("--accent-text", colorSet.text);
    root.style.setProperty("--icon-brand", colorSet.icon);
    
    // Sync with shadcn primary tokens
    root.style.setProperty("--primary", colorSet.accent);
    root.style.setProperty("--ring", colorSet.accent);
  }, [accent, theme]);

  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
    window.localStorage.setItem(STORAGE_COLOR_KEY, color);
    if (organization) {
      updateDesign.mutate({ accent_color: color });
    }
  }, [organization, updateDesign]);

  return (
    <DesignContext.Provider value={{ accent, setAccent }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  return useContext(DesignContext);
}
