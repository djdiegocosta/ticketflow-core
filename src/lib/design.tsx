import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "./theme";
import { useOrganization, useUpdateDesignSettings } from "./settings-queries";

export type AccentColor = "green" | "blue" | "nubank" | "red";

interface ColorSet {
  accent: string;
  hover: string;
  muted: string;
  text: string;
  icon: string;
}

export const ACCENT_COLORS: Record<AccentColor, { light: ColorSet; dark: ColorSet }> = {
  green: {
    light: { accent: "#008a50", hover: "#007045", muted: "#e8f5ef", text: "#006641", icon: "#00e676" },
    dark: { accent: "#4ade80", hover: "#22c55e", muted: "#0d2a1a", text: "#4ade80", icon: "#39ff8a" },
  },
  blue: {
    light: { accent: "#3b82f6", hover: "#2563eb", muted: "#eff6ff", text: "#1d4ed8", icon: "#00b0ff" },
    dark: { accent: "#60a5fa", hover: "#3b82f6", muted: "#0d203d", text: "#60a5fa", icon: "#40c4ff" },
  },
  nubank: {
    light: { accent: "hsl(270, 60%, 50%)", hover: "hsl(270, 60%, 45%)", muted: "hsl(270, 30%, 92%)", text: "hsl(270, 60%, 40%)", icon: "#d500f9" },
    dark: { accent: "hsl(270, 70%, 60%)", hover: "hsl(270, 70%, 55%)", muted: "hsl(270, 40%, 18%)", text: "hsl(270, 20%, 98%)", icon: "#e040fb" },
  },
  red: {
    light: { accent: "#ef4444", hover: "#dc2626", muted: "#fef2f2", text: "#b91c1c", icon: "#ff1744" },
    dark: { accent: "#f87171", hover: "#ef4444", muted: "#3d0a0a", text: "#f87171", icon: "#ff5252" },
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
