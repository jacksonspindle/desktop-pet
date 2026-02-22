import { useState, useCallback } from "react";

export interface SpriteTheme {
  id: string;
  name: string;
  idle: string;   // URL to idle sprite sheet
  walk: string;   // URL to walk sprite sheet
  sleep: string;  // URL to sleep sprite sheet
  custom?: boolean;
}

export const BREEDS = ["normal", "chonky", "siamese", "persian", "kitten", "calico"] as const;
export const COLORS = ["orange", "gray", "black", "white", "tux"] as const;

export type Breed = typeof BREEDS[number];
export type Color = typeof COLORS[number];

export const BREED_LABELS: Record<Breed, string> = {
  normal: "Normal",
  chonky: "Chonky",
  siamese: "Siamese",
  persian: "Persian",
  kitten: "Kitten",
  calico: "Calico",
};

export const COLOR_LABELS: Record<Color, string> = {
  orange: "Orange",
  gray: "Gray",
  black: "Black",
  white: "White",
  tux: "Tux",
};

// Eagerly import all sprite PNGs — Vite resolves these at build time
const spriteAssets = import.meta.glob<string>(
  "../assets/sprites/**/*.png",
  { eager: true, import: "default" },
);

function resolveSprite(relativePath: string): string {
  return spriteAssets[`../assets/sprites/${relativePath}`] ?? "";
}

export function getSpritePaths(breed: Breed, color: Color): { idle: string; walk: string; sleep: string } {
  const prefix = breed === "normal" ? color : `breeds/${breed}/${color}`;
  return {
    idle: resolveSprite(`${prefix}/idle.png`),
    walk: resolveSprite(`${prefix}/walk.png`),
    sleep: resolveSprite(`${prefix}/sleep.png`),
  };
}

// Fallback to root sprites (original orange)
const FALLBACK_THEME: SpriteTheme = {
  id: "default",
  name: "Default",
  idle: resolveSprite("idle.png"),
  walk: resolveSprite("walk.png"),
  sleep: resolveSprite("sleep.png"),
};

function loadCustomThemes(): SpriteTheme[] {
  try {
    const saved = localStorage.getItem("custom-themes");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomThemes(themes: SpriteTheme[]) {
  localStorage.setItem("custom-themes", JSON.stringify(themes));
}

// Migrate from old single-theme localStorage key
function migrateOldTheme(): { breed: Breed; color: Color } | null {
  const old = localStorage.getItem("selected-theme");
  if (!old) return null;

  // Clean up old key
  localStorage.removeItem("selected-theme");

  // Check if it was a color (normal breed)
  if ((COLORS as readonly string[]).includes(old)) {
    return { breed: "normal", color: old as Color };
  }

  // Check if it was a breed name
  if ((BREEDS as readonly string[]).includes(old) && old !== "normal") {
    return { breed: old as Breed, color: "orange" };
  }

  return null;
}

export function useTheme() {
  const [customThemes, setCustomThemes] = useState<SpriteTheme[]>(loadCustomThemes);

  const [breed, setBreed] = useState<Breed>(() => {
    const saved = localStorage.getItem("selected-breed");
    if (saved && (BREEDS as readonly string[]).includes(saved)) return saved as Breed;

    // Try migrating from old format
    const migrated = migrateOldTheme();
    if (migrated) {
      localStorage.setItem("selected-breed", migrated.breed);
      localStorage.setItem("selected-color", migrated.color);
      return migrated.breed;
    }

    return "normal";
  });

  const [color, setColor] = useState<Color>(() => {
    const saved = localStorage.getItem("selected-color");
    if (saved && (COLORS as readonly string[]).includes(saved)) return saved as Color;
    return "orange";
  });

  const [customOverrideId, setCustomOverrideId] = useState<string | null>(() => {
    return localStorage.getItem("selected-custom-theme") ?? null;
  });

  const paths = getSpritePaths(breed, color);
  const builtInTheme: SpriteTheme = {
    id: `${breed}-${color}`,
    name: `${BREED_LABELS[breed]} ${COLOR_LABELS[color]}`,
    ...paths,
  };

  // If custom override is set and exists, use it
  const customTheme = customOverrideId
    ? customThemes.find((t) => t.id === customOverrideId)
    : null;
  const currentTheme = customTheme ?? (builtInTheme.idle ? builtInTheme : FALLBACK_THEME);

  const selectBreed = useCallback((b: Breed) => {
    setBreed(b);
    setCustomOverrideId(null);
    localStorage.setItem("selected-breed", b);
    localStorage.removeItem("selected-custom-theme");
  }, []);

  const selectColor = useCallback((c: Color) => {
    setColor(c);
    setCustomOverrideId(null);
    localStorage.setItem("selected-color", c);
    localStorage.removeItem("selected-custom-theme");
  }, []);

  const addCustomTheme = useCallback(
    (name: string, idle: string, walk: string, sleep: string) => {
      const id = `custom-${Date.now()}`;
      const theme: SpriteTheme = { id, name, idle, walk, sleep, custom: true };
      setCustomThemes((prev) => {
        const next = [...prev, theme];
        saveCustomThemes(next);
        return next;
      });
      setCustomOverrideId(id);
      localStorage.setItem("selected-custom-theme", id);
    },
    [],
  );

  const removeCustomTheme = useCallback(
    (id: string) => {
      setCustomThemes((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveCustomThemes(next);
        return next;
      });
      if (customOverrideId === id) {
        setCustomOverrideId(null);
        localStorage.removeItem("selected-custom-theme");
      }
    },
    [customOverrideId],
  );

  return {
    breed,
    color,
    currentTheme,
    customThemes,
    selectBreed,
    selectColor,
    addCustomTheme,
    removeCustomTheme,
  };
}
