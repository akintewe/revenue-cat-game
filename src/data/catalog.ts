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

export type PCRequirements = {
  minimum: string;
  recommended: string;
};

export type CatalogGame = {
  id: string;
  title: string;
  platform: string;
  year: number;
  genre: string;
  abbreviation: string;
  colorKey: CoverColorKey;
  /** ISO date (YYYY-MM-DD). Present only for games that haven't released yet. */
  releaseDate?: string;
  /** Present only for PC-platform games. */
  pcRequirements?: PCRequirements;
};

// A small offline catalog standing in for a real games database (IGDB/RAWG)
// until that integration is wired up.
export const CATALOG: CatalogGame[] = [
  { id: 'elden-ring', title: 'Elden Ring', platform: 'PS5', year: 2022, genre: 'Action RPG', abbreviation: 'ER', colorKey: 'gold' },
  { id: 'balatro', title: 'Balatro', platform: 'Switch', year: 2024, genre: 'Card Roguelike', abbreviation: 'BA', colorKey: 'red' },
  {
    id: 'hades-2',
    title: 'Hades II',
    platform: 'PC',
    year: 2025,
    genre: 'Roguelike',
    abbreviation: 'HA',
    colorKey: 'purple',
    pcRequirements: {
      minimum: 'Intel i5-3470 / AMD FX-8350, 8GB RAM, GTX 970 / RX 570, 20GB storage',
      recommended: 'Intel i7-9700K / AMD Ryzen 7 3700X, 16GB RAM, RTX 2070 / RX 5700 XT, 20GB SSD',
    },
  },
  {
    id: 'pentiment',
    title: 'Pentiment',
    platform: 'PC',
    year: 2022,
    genre: 'Narrative',
    abbreviation: 'PE',
    colorKey: 'green',
    pcRequirements: {
      minimum: 'Intel i3-3210 / AMD FX-6300, 4GB RAM, GTX 650 Ti, 12GB storage',
      recommended: 'Intel i5-4460 / AMD Ryzen 3 1200, 8GB RAM, GTX 960, 12GB SSD',
    },
  },
  { id: 'tunic', title: 'Tunic', platform: 'Xbox Series X', year: 2022, genre: 'Action Adventure', abbreviation: 'TU', colorKey: 'teal' },
  { id: 'chained-echoes', title: 'Chained Echoes', platform: 'Switch', year: 2022, genre: 'RPG', abbreviation: 'CE', colorKey: 'orange' },
  {
    id: 'outer-wilds',
    title: 'Outer Wilds',
    platform: 'PC',
    year: 2019,
    genre: 'Exploration',
    abbreviation: 'OW',
    colorKey: 'navy',
    pcRequirements: {
      minimum: 'Intel i5-750 / AMD Phenom II X4 965, 8GB RAM, GTX 460, 6GB storage',
      recommended: 'Intel i5-4460 / AMD Ryzen 3 1200, 8GB RAM, GTX 960, 6GB SSD',
    },
  },
  {
    id: 'return-of-the-obra-dinn',
    title: 'Return of the Obra Dinn',
    platform: 'PC',
    year: 2018,
    genre: 'Mystery',
    abbreviation: 'RO',
    colorKey: 'slate',
    pcRequirements: {
      minimum: 'Intel i3, 2GB RAM, integrated graphics, 2GB storage',
      recommended: 'Intel i5, 4GB RAM, GTX 460, 2GB storage',
    },
  },
  {
    id: 'citizen-sleeper',
    title: 'Citizen Sleeper',
    platform: 'PC',
    year: 2022,
    genre: 'Narrative RPG',
    abbreviation: 'CS',
    colorKey: 'purple',
    pcRequirements: {
      minimum: 'Intel i3-2100 / AMD FX-4300, 4GB RAM, GTX 650, 4GB storage',
      recommended: 'Intel i5-4460 / AMD Ryzen 3 1200, 8GB RAM, GTX 960, 4GB SSD',
    },
  },
  {
    id: 'hollow-knight-silksong',
    title: 'Hollow Knight: Silksong',
    platform: 'Switch',
    year: 2026,
    genre: 'Metroidvania',
    abbreviation: 'HK',
    colorKey: 'orange',
    releaseDate: '2026-09-12',
  },
  { id: 'judas', title: 'Judas', platform: 'PS5', year: 2026, genre: 'Immersive Sim', abbreviation: 'JU', colorKey: 'red' },
  {
    id: 'clair-obscur-expedition-33',
    title: 'Clair Obscur: Expedition 33',
    platform: 'PC',
    year: 2026,
    genre: 'Turn-Based RPG',
    abbreviation: 'CO',
    colorKey: 'gold',
    pcRequirements: {
      minimum: 'Intel i5-8400 / AMD Ryzen 5 2600, 16GB RAM, GTX 1060 6GB, 60GB storage',
      recommended: 'Intel i7-10700K / AMD Ryzen 7 5800X, 16GB RAM, RTX 3070, 60GB SSD',
    },
  },
  {
    id: 'kirby-air-riders',
    title: 'Kirby Air Riders',
    platform: 'Switch 2',
    year: 2026,
    genre: 'Racing',
    abbreviation: 'KA',
    colorKey: 'pink',
    releaseDate: '2026-11-20',
  },
  { id: 'metroid-dread', title: 'Metroid Dread', platform: 'Switch', year: 2021, genre: 'Metroidvania', abbreviation: 'MD', colorKey: 'red' },
  { id: 'metroid-prime-remastered', title: 'Metroid Prime Remastered', platform: 'Switch', year: 2023, genre: 'Action Adventure', abbreviation: 'MP', colorKey: 'orange' },
  {
    id: 'metroid-prime-4-beyond',
    title: 'Metroid Prime 4: Beyond',
    platform: 'Switch 2',
    year: 2025,
    genre: 'Action Adventure',
    abbreviation: 'MP',
    colorKey: 'blue',
  },
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
