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
    light: { accent: "hsl(270, 60%, 50%)", hover: "hsl(270, 60%, 44%)", muted: "hsl(270, 30%, 92%)", text: "hsl(270, 60%, 40%)", icon: "#d500f9" },
    dark: { accent: "hsl(270, 70%, 60%)", hover: "hsl(270, 70%, 66%)", muted: "hsl(270, 40%, 18%)", text: "hsl(270, 20%, 98%)", icon: "#e040fb" },
  },
  red: {
    light: { accent: "hsl(356, 84%, 48%)", hover: "hsl(356, 84%, 42%)", muted: "hsl(356, 84%, 96%)", text: "hsl(356, 84%, 30%)", icon: "#ff1744" },
    dark: { accent: "hsl(356, 84%, 48%)", hover: "hsl(356, 84%, 54%)", muted: "hsl(356, 84%, 15%)", text: "hsl(356, 84%, 80%)", icon: "#ff5252" },
  },
};

/**
 * Tema "Vermelho" completo (fundo, texto, bordas, gráficos), fornecido pelo
 * cliente. Substitui os tokens nativos de cor quando esse tema está ativo.
 * Fonte, espaçamento e raio de canto ficam fora — esses são globais do
 * sistema, não variam por tema de cor.
 */
export const FULL_THEME_OVERRIDES: Partial<Record<AccentColor, { light: Record<string, string>; dark: Record<string, string> }>> = {
  red: {
    light: {
      "--bg-primary": "hsl(0, 0%, 100%)",
      "--bg-secondary": "hsl(210, 10%, 97%)",
      "--bg-tertiary": "hsl(210, 10%, 94%)",
      "--text-primary": "hsl(210, 10%, 15%)",
      "--text-secondary": "hsl(210, 10%, 40%)",
      "--text-disabled": "hsl(210, 10%, 62%)",
      "--border-default": "hsl(210, 10%, 90%)",
      "--border-subtle": "hsl(210, 10%, 92%)",
      "--error": "hsl(0, 84%, 60%)",
      "--error-muted": "hsl(0, 84%, 96%)",
      "--error-text": "hsl(0, 70%, 40%)",
      "--chart-1": "hsl(356, 84%, 48%)",
      "--chart-2": "hsl(210, 10%, 20%)",
      "--chart-3": "hsl(142, 70%, 45%)",
      "--chart-4": "hsl(47, 95%, 55%)",
      "--chart-5": "hsl(25, 95%, 55%)",
    },
    dark: {
      "--bg-primary": "hsl(210, 10%, 4%)",
      "--bg-secondary": "hsl(210, 10%, 7%)",
      "--bg-tertiary": "hsl(210, 10%, 15%)",
      "--text-primary": "hsl(0, 0%, 98%)",
      "--text-secondary": "hsl(210, 10%, 65%)",
      "--text-disabled": "hsl(210, 10%, 42%)",
      "--border-default": "hsl(210, 10%, 16%)",
      "--border-subtle": "hsl(210, 10%, 14%)",
      "--error": "hsl(0, 62%, 30%)",
      "--error-muted": "hsl(0, 50%, 15%)",
      "--error-text": "hsl(0, 70%, 65%)",
      "--chart-1": "hsl(356, 84%, 48%)",
      "--chart-2": "hsl(210, 10%, 80%)",
      "--chart-3": "hsl(142, 70%, 45%)",
      "--chart-4": "hsl(47, 95%, 55%)",
      "--chart-5": "hsl(25, 95%, 55%)",
    },
  },
  roxo: {
    light: {
      "--bg-primary": "hsl(270, 20%, 98%)",
      "--bg-secondary": "hsl(270, 20%, 96%)",
      "--bg-tertiary": "hsl(270, 20%, 90%)",
      "--text-primary": "hsl(270, 40%, 10%)",
      "--text-secondary": "hsl(270, 10%, 40%)",
      "--text-disabled": "hsl(270, 10%, 62%)",
      "--border-default": "hsl(270, 15%, 85%)",
      "--border-subtle": "hsl(270, 15%, 90%)",
      "--error": "hsl(0, 84%, 60%)",
      "--error-muted": "hsl(0, 84%, 96%)",
      "--error-text": "hsl(0, 70%, 40%)",
      "--chart-1": "hsl(270, 60%, 50%)",
      "--chart-2": "hsl(290, 50%, 45%)",
      "--chart-3": "hsl(250, 50%, 45%)",
      "--chart-4": "hsl(310, 50%, 50%)",
      "--chart-5": "hsl(270, 30%, 60%)",
    },
    dark: {
      "--bg-primary": "hsl(270, 50%, 4%)",
      "--bg-secondary": "hsl(270, 45%, 7%)",
      "--bg-tertiary": "hsl(270, 30%, 15%)",
      "--text-primary": "hsl(270, 20%, 98%)",
      "--text-secondary": "hsl(270, 10%, 65%)",
      "--text-disabled": "hsl(270, 10%, 42%)",
      "--border-default": "hsl(270, 30%, 18%)",
      "--border-subtle": "hsl(270, 30%, 15%)",
      "--error": "hsl(0, 70%, 40%)",
      "--error-muted": "hsl(0, 50%, 15%)",
      "--error-text": "hsl(0, 70%, 65%)",
      "--chart-1": "hsl(270, 70%, 60%)",
      "--chart-2": "hsl(290, 60%, 55%)",
      "--chart-3": "hsl(250, 60%, 55%)",
      "--chart-4": "hsl(310, 60%, 60%)",
      "--chart-5": "hsl(270, 40%, 70%)",
    },
  },
};

const FULL_THEME_KEYS = [
  "--bg-primary", "--bg-secondary", "--bg-tertiary",
  "--text-primary", "--text-secondary", "--text-disabled",
  "--border-default", "--border-subtle",
  "--error", "--error-muted", "--error-text",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
];

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

  // Tema completo (fundo/texto/bordas/gráficos) — só existe para alguns temas.
  // Reseta os tokens para o padrão do sistema antes de aplicar (ou não) o tema ativo.
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    FULL_THEME_KEYS.forEach((key) => root.style.removeProperty(key));
    const override = FULL_THEME_OVERRIDES[accent];
    if (override) {
      const vars = isDark ? override.dark : override.light;
      Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    }
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
