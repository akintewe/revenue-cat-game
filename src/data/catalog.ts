export type CoverColorKey =
  | 'teal'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'gold'
  | 'navy'
  | 'red'
  | 'green'
  | 'blue'
  | 'slate';

export type CatalogGame = {
  id: string;
  title: string;
  platform: string;
  year: number;
  genre: string;
  abbreviation: string;
  colorKey: CoverColorKey;
};

// A small offline catalog standing in for a real games database (IGDB/RAWG)
// until that integration is wired up.
export const CATALOG: CatalogGame[] = [
  { id: 'elden-ring', title: 'Elden Ring', platform: 'PS5', year: 2022, genre: 'Action RPG', abbreviation: 'ER', colorKey: 'gold' },
  { id: 'balatro', title: 'Balatro', platform: 'Switch', year: 2024, genre: 'Card Roguelike', abbreviation: 'BA', colorKey: 'red' },
  { id: 'hades-2', title: 'Hades II', platform: 'PC', year: 2025, genre: 'Roguelike', abbreviation: 'HA', colorKey: 'purple' },
  { id: 'pentiment', title: 'Pentiment', platform: 'PC', year: 2022, genre: 'Narrative', abbreviation: 'PE', colorKey: 'green' },
  { id: 'tunic', title: 'Tunic', platform: 'Xbox Series X', year: 2022, genre: 'Action Adventure', abbreviation: 'TU', colorKey: 'teal' },
  { id: 'chained-echoes', title: 'Chained Echoes', platform: 'Switch', year: 2022, genre: 'RPG', abbreviation: 'CE', colorKey: 'orange' },
  { id: 'outer-wilds', title: 'Outer Wilds', platform: 'PC', year: 2019, genre: 'Exploration', abbreviation: 'OW', colorKey: 'navy' },
  { id: 'return-of-the-obra-dinn', title: 'Return of the Obra Dinn', platform: 'PC', year: 2018, genre: 'Mystery', abbreviation: 'RO', colorKey: 'slate' },
  { id: 'citizen-sleeper', title: 'Citizen Sleeper', platform: 'PC', year: 2022, genre: 'Narrative RPG', abbreviation: 'CS', colorKey: 'purple' },
  { id: 'hollow-knight-silksong', title: 'Hollow Knight: Silksong', platform: 'Switch', year: 2026, genre: 'Metroidvania', abbreviation: 'HK', colorKey: 'orange' },
  { id: 'judas', title: 'Judas', platform: 'PS5', year: 2026, genre: 'Immersive Sim', abbreviation: 'JU', colorKey: 'red' },
  { id: 'clair-obscur-expedition-33', title: 'Clair Obscur: Expedition 33', platform: 'PC', year: 2026, genre: 'Turn-Based RPG', abbreviation: 'CO', colorKey: 'gold' },
  { id: 'kirby-air-riders', title: 'Kirby Air Riders', platform: 'Switch 2', year: 2026, genre: 'Racing', abbreviation: 'KA', colorKey: 'pink' },
  { id: 'metroid-dread', title: 'Metroid Dread', platform: 'Switch', year: 2021, genre: 'Metroidvania', abbreviation: 'MD', colorKey: 'red' },
  { id: 'metroid-prime-remastered', title: 'Metroid Prime Remastered', platform: 'Switch', year: 2023, genre: 'Action Adventure', abbreviation: 'MP', colorKey: 'orange' },
  { id: 'metroid-prime-4-beyond', title: 'Metroid Prime 4: Beyond', platform: 'Switch 2', year: 2025, genre: 'Action Adventure', abbreviation: 'MP', colorKey: 'blue' },
  { id: 'metroid-samus-returns', title: 'Metroid: Samus Returns', platform: '3DS', year: 2017, genre: 'Metroidvania', abbreviation: 'MS', colorKey: 'slate' },
  { id: 'super-metroid', title: 'Super Metroid', platform: 'SNES', year: 1994, genre: 'Metroidvania', abbreviation: 'SM', colorKey: 'orange' },
  { id: 'metroid-fusion', title: 'Metroid Fusion', platform: 'GBA', year: 2002, genre: 'Metroidvania', abbreviation: 'MF', colorKey: 'purple' },
];

export function findCatalogGame(id: string): CatalogGame | undefined {
  return CATALOG.find((game) => game.id === id);
}

export function searchCatalog(query: string): CatalogGame[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return CATALOG.filter((game) => game.title.toLowerCase().includes(normalized));
}
