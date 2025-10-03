const ARCHETYPES_STORAGE_KEY = 'conjuring-studio-archetypes';

const defaultArchetypes: string[] = [
    "Businessman", "Bohemian", "Adventurer", "Athlete", "Surfer", 
    "Minimalist", "Rafined", "Rebel", "Skater", "Bike", 
    "Gentleman", "Hipster"
];

export const getArchetypes = (): string[] => {
  try {
    const stored = localStorage.getItem(ARCHETYPES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load archetypes from localStorage", e);
  }
  return [...defaultArchetypes];
};

export const saveArchetypes = (archetypes: string[]) => {
  try {
    const cleaned = archetypes.map(s => s.trim()).filter(Boolean);
    localStorage.setItem(ARCHETYPES_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error("Failed to save archetypes to localStorage", e);
  }
};

export const resetArchetypes = () => {
  try {
    localStorage.removeItem(ARCHETYPES_STORAGE_KEY);
  } catch(e) {
     console.error("Failed to remove archetypes from localStorage", e);
  }
  return [...defaultArchetypes];
};
