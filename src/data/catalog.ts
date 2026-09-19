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
  /** Absent for remote-catalog games IGDB has no release date for. */
  year?: number;
  genre: string;
  abbreviation: string;
  colorKey: CoverColorKey;
  /** ISO date (YYYY-MM-DD). Present only for games that haven't released yet. */
  releaseDate?: string;
  /** Present only for PC-platform games. */
  pcRequirements?: PCRequirements;
  /** Cover art URL. The colorKey/abbreviation swatch is the fallback if this fails to load. */
  coverImageUrl?: string;
  /** IGDB's own aggregate critic score, 0-100. Not Metacritic. Remote games only. */
  criticScore?: number;
  /** "Normal" completion estimate in hours. Only a small slice of remote games have this. */
  timeToBeatHours?: number;
  /** How many playthroughs timeToBeatHours is averaged from — always show alongside the hours, never alone. */
  timeToBeatCount?: number;
  /** How precise the release date actually is — 'day' is a real announced date, the rest are placeholders. */
  releasePrecision?: 'day' | 'month' | 'quarter' | 'year';
  /** IGDB's raw, untruncated description. Collapse whitespace and clamp for display — never assumed pre-trimmed. */
  summary?: string;
};

// A small offline catalog standing in for a real games database (IGDB/RAWG)
// until that integration is wired up. Cover art links to Wikipedia-hosted box art.
export const CATALOG: CatalogGame[] = [
  {
    id: 'elden-ring',
    title: 'Elden Ring',
    platform: 'PS5',
    year: 2022,
    genre: 'Action RPG',
    abbreviation: 'ER',
    colorKey: 'gold',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
  },
  {
    id: 'balatro',
    title: 'Balatro',
    platform: 'Switch',
    year: 2024,
    genre: 'Card Roguelike',
    abbreviation: 'BA',
    colorKey: 'red',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/89/Balatro_cover.jpg',
  },
  {
    id: 'hades-2',
    title: 'Hades II',
    platform: 'PC',
    year: 2025,
    genre: 'Roguelike',
    abbreviation: 'HA',
    colorKey: 'purple',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Hades_2_cover_art.jpeg',
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
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Pentiment_cover_wide.jpg',
    pcRequirements: {
      minimum: 'Intel i3-3210 / AMD FX-6300, 4GB RAM, GTX 650 Ti, 12GB storage',
      recommended: 'Intel i5-4460 / AMD Ryzen 3 1200, 8GB RAM, GTX 960, 12GB SSD',
    },
  },
  {
    id: 'tunic',
    title: 'Tunic',
    platform: 'Xbox Series X',
    year: 2022,
    genre: 'Action Adventure',
    abbreviation: 'TU',
    colorKey: 'teal',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/8/85/Tunic_cover_art.jpg',
  },
  {
    id: 'chained-echoes',
    title: 'Chained Echoes',
    platform: 'Switch',
    year: 2022,
    genre: 'RPG',
    abbreviation: 'CE',
    colorKey: 'orange',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f3/Chained_Echoes_cover_art.jpg',
  },
  {
    id: 'outer-wilds',
    title: 'Outer Wilds',
    platform: 'PC',
    year: 2019,
    genre: 'Exploration',
    abbreviation: 'OW',
    colorKey: 'navy',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f6/Outer_Wilds_Steam_artwork.jpg',
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
    coverImageUrl:
      'https://upload.wikimedia.org/wikipedia/en/d/d6/Return_of_the_Obra_Dinn_logo-title.jpg',
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
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/3/31/Citizen_Sleeper_cover_art.jpg',
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
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/0/05/Silksong.jpg',
  },
  {
    id: 'judas',
    title: 'Judas',
    platform: 'PS5',
    year: 2026,
    genre: 'Immersive Sim',
    abbreviation: 'JU',
    colorKey: 'red',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e1/Judas_key_art.jpg',
  },
  {
    id: 'clair-obscur-expedition-33',
    title: 'Clair Obscur: Expedition 33',
    platform: 'PC',
    year: 2026,
    genre: 'Turn-Based RPG',
    abbreviation: 'CO',
    colorKey: 'gold',
    coverImageUrl:
      'https://upload.wikimedia.org/wikipedia/en/5/5a/Clair_Obscur%2C_Expedition_33_Cover_1.webp',
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
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/bc/AirRidersKey.jpg',
  },
  {
    id: 'metroid-dread',
    title: 'Metroid Dread',
    platform: 'Switch',
    year: 2021,
    genre: 'Metroidvania',
    abbreviation: 'MD',
    colorKey: 'red',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f7/Metroid_Dread_Banner.png',
  },
  {
    id: 'metroid-prime-remastered',
    title: 'Metroid Prime Remastered',
    platform: 'Switch',
    year: 2023,
    genre: 'Action Adventure',
    abbreviation: 'MP',
    colorKey: 'orange',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/b/ba/MetroidPrimebox.jpg',
  },
  {
    id: 'metroid-prime-4-beyond',
    title: 'Metroid Prime 4: Beyond',
    platform: 'Switch 2',
    year: 2025,
    genre: 'Action Adventure',
    abbreviation: 'MP',
    colorKey: 'blue',
    coverImageUrl:
      'https://upload.wikimedia.org/wikipedia/en/4/48/Metroid_Prime_4_Beyond_cover_art.png',
  },
  {
    id: 'metroid-samus-returns',
    title: 'Metroid: Samus Returns',
    platform: '3DS',
    year: 2017,
    genre: 'Metroidvania',
    abbreviation: 'MS',
    colorKey: 'slate',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/1/16/Metroid_Samus_Returns.jpg',
  },
  {
    id: 'super-metroid',
    title: 'Super Metroid',
    platform: 'SNES',
    year: 1994,
    genre: 'Metroidvania',
    abbreviation: 'SM',
    colorKey: 'orange',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e4/Smetroidbox.jpg',
  },
  {
    id: 'metroid-fusion',
    title: 'Metroid Fusion',
    platform: 'GBA',
    year: 2002,
    genre: 'Metroidvania',
    abbreviation: 'MF',
    colorKey: 'purple',
    coverImageUrl: 'https://upload.wikimedia.org/wikipedia/en/4/45/Metroid_Fusion_box.jpg',
  },
];

export function findCatalogGame(id: string): CatalogGame | undefined {
  return CATALOG.find((game) => game.id === id);
}

export function searchCatalog(query: string): CatalogGame[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return CATALOG.filter((game) => game.title.toLowerCase().includes(normalized));
}
