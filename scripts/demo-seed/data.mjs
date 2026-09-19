// Demo crowd for the Shipaton project. seed.mjs reads this file and writes it to Supabase.
// Games are keyed by [exact games.title, release year]. seed.mjs resolves them to ids.

export const GAMES = {
  // Souls, RPG and big action games
  eldenRing: ['Elden Ring', 2022],
  nightreign: ['Elden Ring Nightreign', 2025],
  sekiro: ['Sekiro: Shadows Die Twice', 2019],
  bloodborne: ['Bloodborne', 2015],
  darkSouls3: ['Dark Souls III', 2016],
  liesOfP: ['Lies of P', 2023],
  wukong: ['Black Myth: Wukong', 2024],
  onimusha: ['Onimusha: Way of the Sword', 2026],
  mhWilds: ['Monster Hunter Wilds', 2025],
  bg3: ["Baldur's Gate III", 2023],
  clairObscur: ['Clair Obscur: Expedition 33', 2025],
  witcher3: ['The Witcher 3: Wild Hunt', 2015],
  kcd2: ['Kingdom Come: Deliverance II', 2025],
  metaphor: ['Metaphor: ReFantazio', 2024],
  p5r: ['Persona 5 Royal', 2019],
  ff7rebirth: ['Final Fantasy VII Rebirth', 2024],
  disco: ['Disco Elysium', 2019],
  skyrim: ['The Elder Scrolls V: Skyrim', 2011],
  me2: ['Mass Effect 2', 2010],
  cyberpunk: ['Cyberpunk 2077', 2020],
  hades2: ['Hades II', 2025],
  seaOfStars: ['Sea of Stars', 2023],
  gow2018: ['God of War', 2018],
  ragnarok: ['God of War Ragnarök', 2022],
  yotei: ['Ghost of Yotei', 2025],
  tsushima: ['Ghost of Tsushima', 2020],
  rdr2: ['Red Dead Redemption 2', 2018],
  spiderman2: ["Marvel's Spider-Man 2", 2023],
  wolverine: ["Marvel's Wolverine", 2026],
  ds2: ['Death Stranding 2: On the Beach', 2025],
  astroBot: ['Astro Bot', 2024],
  stellarBlade: ['Stellar Blade', 2024],
  crimsonDesert: ['Crimson Desert', 2026],
  bond: ['007 First Light', 2026],
  indy: ['Indiana Jones and the Great Circle', 2024],
  gta5: ['Grand Theft Auto V', 2013],
  horizon: ['Horizon Zero Dawn', 2017],
  tlou2: ['The Last of Us Part II', 2020],

  // Shooters, sports and fighting
  valorant: ['Valorant', 2020],
  apex: ['Apex Legends', 2019],
  rivals: ['Marvel Rivals', 2024],
  bo7: ['Call of Duty: Black Ops 7', 2025],
  bf6: ['Battlefield 6', 2025],
  helldivers2: ['Helldivers 2', 2024],
  fortnite: ['Fortnite', 2020],
  csgo: ['Counter-Strike: Global Offensive', 2012],
  doomDA: ['Doom: The Dark Ages', 2025],
  bl4: ['Borderlands 4', 2025],
  marathon: ['Marathon', 2026],
  overwatch: ['Overwatch', 2016],
  fc26: ['EA Sports FC 26', 2025],
  fc25: ['EA Sports FC 25', 2024],
  rocketLeague: ['Rocket League', 2015],
  tekken8: ['Tekken 8', 2024],
  sf6: ['Street Fighter 6', 2023],

  // Cozy and indie
  stardew: ['Stardew Valley', 2016],
  acnh: ['Animal Crossing: New Horizons', 2020],
  dredge: ['Dredge', 2023],
  cotl: ['Cult of the Lamb', 2022],
  daveDiver: ['Dave the Diver', 2023],
  terraria: ['Terraria', 2011],
  minecraft: ['Minecraft: Java Edition', 2011],
  schedule1: ['Schedule I', 2025],
  hytale: ['Hytale', 2026],
  palworld: ['Palworld', 2026],
  silksong: ['Hollow Knight: Silksong', 2025],
  hollowKnight: ['Hollow Knight', 2017],
  balatro: ['Balatro', 2024],
  celeste: ['Celeste', 2018],
  hades: ['Hades', 2020],
  outerWilds: ['Outer Wilds', 2019],
  bluePrince: ['Blue Prince', 2025],
  pizzaTower: ['Pizza Tower', 2023],
  undertale: ['Undertale', 2015],
  inside: ['Inside', 2016],
  edithFinch: ['What Remains of Edith Finch', 2017],
  dispatch: ['Dispatch', 2025],

  // Nintendo
  mkWorld: ['Mario Kart World', 2025],
  dkBananza: ['Donkey Kong Bananza', 2025],
  totk: ['The Legend of Zelda: Tears of the Kingdom', 2023],
  botw: ['The Legend of Zelda: Breath of the Wild', 2017],
  odyssey: ['Super Mario Odyssey', 2017],
  wonder: ['Super Mario Bros. Wonder', 2023],
  plza: ['Pokémon Legends: Z-A', 2025],
  kirbyFL: ['Kirby and the Forgotten Land', 2022],
  metroid4: ['Metroid Prime 4: Beyond', 2025],
  smash: ['Super Smash Bros. Ultimate', 2018],
  kirbyAir: ['Kirby Air Riders', 2025],

  // Co-op and horror
  itTakesTwo: ['It Takes Two', 2021],
  splitFiction: ['Split Fiction', 2025],
  peak: ['Peak', 2025],
  repo: ['R.E.P.O.', 2025],
  lethal: ['Lethal Company', 2023],
  reRequiem: ['Resident Evil Requiem', 2026],
  re2: ['Resident Evil 2', 2019],
  re7: ['Resident Evil 7: Biohazard', 2017],
  silentHillF: ['Silent Hill f', 2025],
  alanWake2: ['Alan Wake II', 2023],
  deadSpace: ['Dead Space', 2008],

  // Classics and strategy
  hl2: ['Half-Life 2', 2004],
  portal: ['Portal', 2007],
  portal2: ['Portal 2', 2011],
  hl1: ['Half-Life', 1998],
  bioshock: ['BioShock', 2007],
  superMetroid: ['Super Metroid', 1994],
  chrono: ['Chrono Trigger', 1995],
  oot: ['The Legend of Zelda: Ocarina of Time', 1998],
  mgs: ['Metal Gear Solid', 1998],
  diablo2: ['Diablo II', 2000],
  starcraft: ['StarCraft', 1998],
  sanAndreas: ['Grand Theft Auto: San Andreas', 2004],
  newVegas: ['Fallout: New Vegas', 2010],
  civ5: ["Sid Meier's Civilization V", 2010],
  civ6: ["Sid Meier's Civilization VI", 2016],
  xcom2: ['XCOM 2', 2016],
  sc2: ['StarCraft II: Wings of Liberty', 2010],
  aoe2: ['Age of Empires II: The Age of Kings', 1999],

  // Not out yet (as of September 2026). Used for watches and wishlists only.
  gta6: ['Grand Theft Auto VI', 2026],
  gearsEDay: ['Gears of War: E-Day', 2026],
  mw4: ['Call of Duty: Modern Warfare 4', 2026],
  fc27: ['EA Sports FC 27', 2026],
  phantomBlade: ['Phantom Blade 0', 2026],
  townfall: ['Silent Hill: Townfall', 2026],
  mcDungeons2: ['Minecraft Dungeons II', 2026],
  dqm: ['Dragon Quest Monsters: The Withered World', 2026],
  strangerHeaven: ['Stranger Than Heaven', 2027],
  metroidRavenous: ['Metroid Ravenous', 2027],
  fable: ['Fable', 2027],
  exodus: ['Exodus', 2027],
  kh4: ['Kingdom Hearts IV', 2027],
  marvel1943: ['Marvel 1943: Rise of Hydra', 2027],
  pokemonWinds: ['Pokémon Winds', 2027],
  duskbloods: ['The Duskbloods', 2026],
  witcher4: ['The Witcher IV', 2028],
  intergalactic: ['Intergalactic: The Heretic Prophet', 2027],
  swRacer: ['Star Wars: Galactic Racer', 2026],
  harvestMoon: ['Harvest Moon: Echoes of Teradea', 2026],
  witchbrook: ['Witchbrook', 2026],
  toem2: ['Toem 2', 2026],
  graveyardKeeper2: ['Graveyard Keeper II', 2026],
  kirbyWorldBeyond: ['Kirby and the World Beyond', 2027],
};

// Games people play forever instead of finishing. They are never 'beaten'.
export const ENDLESS = new Set([
  'valorant', 'apex', 'rivals', 'bo7', 'bf6', 'helldivers2', 'fortnite', 'csgo', 'overwatch',
  'fc26', 'fc25', 'rocketLeague', 'tekken8', 'sf6', 'minecraft', 'terraria', 'lethal', 'repo',
  'peak', 'marathon', 'palworld', 'schedule1', 'hytale', 'smash', 'mkWorld', 'acnh', 'stardew',
]);

// The games already on the real accounts' shelves. Friends who own them make
// "Popular with friends" and friend overlap light up for the real users.
export const SHARED = ['skyrim', 'gta5', 'portal2', 'witcher3', 'portal', 'gow2018'];

export const POOLS = {
  souls: ['eldenRing', 'nightreign', 'sekiro', 'bloodborne', 'darkSouls3', 'liesOfP', 'wukong', 'onimusha', 'mhWilds', 'hollowKnight'],
  rpg: ['bg3', 'clairObscur', 'witcher3', 'kcd2', 'metaphor', 'p5r', 'ff7rebirth', 'disco', 'skyrim', 'me2', 'cyberpunk', 'hades2', 'seaOfStars', 'newVegas'],
  action: ['gow2018', 'ragnarok', 'yotei', 'tsushima', 'rdr2', 'spiderman2', 'wolverine', 'ds2', 'astroBot', 'stellarBlade', 'crimsonDesert', 'bond', 'indy', 'gta5', 'horizon', 'tlou2'],
  shooter: ['valorant', 'apex', 'rivals', 'bo7', 'bf6', 'helldivers2', 'fortnite', 'csgo', 'doomDA', 'bl4', 'marathon', 'overwatch'],
  sports: ['fc26', 'fc25', 'rocketLeague', 'tekken8', 'sf6'],
  cozy: ['stardew', 'acnh', 'dredge', 'cotl', 'daveDiver', 'terraria', 'minecraft', 'schedule1', 'hytale', 'palworld'],
  indie: ['silksong', 'hollowKnight', 'balatro', 'celeste', 'hades', 'outerWilds', 'bluePrince', 'pizzaTower', 'undertale', 'inside', 'edithFinch', 'dispatch', 'seaOfStars'],
  nintendo: ['mkWorld', 'dkBananza', 'totk', 'botw', 'odyssey', 'wonder', 'plza', 'kirbyFL', 'metroid4', 'smash', 'kirbyAir', 'acnh'],
  coop: ['itTakesTwo', 'splitFiction', 'peak', 'repo', 'lethal', 'helldivers2'],
  horror: ['reRequiem', 're2', 're7', 'silentHillF', 'alanWake2', 'deadSpace', 'lethal'],
  classic: ['hl2', 'portal', 'portal2', 'hl1', 'bioshock', 'superMetroid', 'chrono', 'oot', 'mgs', 'diablo2', 'starcraft', 'sanAndreas', 'newVegas'],
  strategy: ['bg3', 'civ5', 'civ6', 'xcom2', 'sc2', 'aoe2', 'balatro', 'disco'],
};

export const UPCOMING = [
  'gta6', 'gearsEDay', 'mw4', 'fc27', 'phantomBlade', 'townfall', 'mcDungeons2', 'dqm', 'strangerHeaven',
  'metroidRavenous', 'fable', 'exodus', 'kh4', 'marvel1943', 'pokemonWinds', 'duskbloods', 'witcher4',
  'intergalactic', 'swRacer', 'harvestMoon', 'witchbrook', 'toem2', 'graveyardKeeper2', 'kirbyWorldBeyond',
];

// Platform ids from the platforms table.
const PS5 = 167, PS4 = 48, PC = 6, MAC = 14, IOS = 39, XSX = 169, SWITCH = 130, SWITCH2 = 508;

// squads: friend groups. People in the same squad mostly follow each other.
// pools: what they play. size: how many games on the shelf.
export const USERS = [
  { handle: 'tobi_souls', name: 'Tobi Adeyemi', bio: 'Elden Ring twice. Still not over Malenia.', color: 'purple', platforms: [PS5, PC], squads: ['souls'], pools: ['souls', 'rpg', 'action'], size: [16, 22] },
  { handle: 'adaeze_rpg', name: 'Adaeze Okafor', bio: 'Turn-based enjoyer. BG3 ruined other RPGs for me.', color: 'teal', platforms: [PC, PS5], squads: ['souls'], pools: ['rpg', 'indie', 'strategy'], size: [18, 26] },
  { handle: 'kenji_parry', name: 'Kenji Mori', bio: 'Sekiro lives in my head rent free. Parry everything.', color: 'navy', platforms: [PS5, PC], squads: ['souls'], pools: ['souls', 'action', 'nintendo'], size: [14, 20] },
  { handle: 'zainab_quests', name: 'Zainab Bello', bio: 'Side quests over main quests. Every time.', color: 'gold', platforms: [PC, PS5], squads: ['souls'], pools: ['rpg', 'action', 'cozy'], size: [16, 24] },
  { handle: 'femi_lore', name: 'Femi Ogunleye', bio: 'I read every item description. Ask me about Bloodborne.', color: 'red', platforms: [PS5, PS4], squads: ['souls'], pools: ['souls', 'action', 'horror'], size: [12, 18] },
  { handle: 'maya_expedition', name: 'Maya Laurent', bio: 'Story games and good soundtracks. Currently: Death Stranding 2.', color: 'pink', platforms: [PC, XSX], squads: ['souls', 'cozy'], pools: ['rpg', 'action', 'indie'], size: [14, 20] },
  { handle: 'chidi_fc', name: 'Chidi Nwosu', bio: 'Ultimate Team addict. Arsenal till I die.', color: 'red', platforms: [PS5, PS4], squads: ['fps'], pools: ['sports', 'shooter', 'action'], size: [10, 14] },
  { handle: 'seyi_clutch', name: 'Seyi Balogun', bio: 'Valorant Immortal 1. Looking for a duo who comms.', color: 'blue', platforms: [PC], squads: ['fps'], pools: ['shooter', 'coop', 'indie'], size: [10, 16] },
  { handle: 'emeka_ranked', name: 'Emeka Obi', bio: 'CoD and FC. Mostly FC.', color: 'green', platforms: [PS5, XSX], squads: ['fps'], pools: ['shooter', 'sports', 'action'], size: [10, 15] },
  { handle: 'bola_bxbx', name: 'Bolaji Ade', bio: 'Helldivers for democracy. GTA VI countdown is on.', color: 'orange', platforms: [XSX, PC], squads: ['fps'], pools: ['shooter', 'coop', 'action'], size: [12, 18] },
  { handle: 'marcus_aim', name: 'Marcus Reid', bio: 'Apex, Marvel Rivals, CS. Sleep is optional.', color: 'slate', platforms: [PC], squads: ['fps'], pools: ['shooter', 'sports', 'classic'], size: [12, 16] },
  { handle: 'damilola_gg', name: 'Damilola Ajayi', bio: 'Weekend warrior. Tekken 8 and FC.', color: 'purple', platforms: [PS5], squads: ['fps'], pools: ['sports', 'action', 'shooter'], size: [9, 13] },
  { handle: 'kemi_cozy', name: 'Kemi Adebayo', bio: 'Stardew, Animal Crossing and a cup of tea.', color: 'green', platforms: [SWITCH, SWITCH2, PC], squads: ['cozy'], pools: ['cozy', 'indie', 'nintendo'], size: [16, 24] },
  { handle: 'ifeoma_pixels', name: 'Ifeoma Eze', bio: 'Indie games with great soundtracks.', color: 'teal', platforms: [PC, MAC], squads: ['cozy'], pools: ['indie', 'cozy', 'classic'], size: [18, 26] },
  { handle: 'priya_plays', name: 'Priya Shah', bio: 'Balatro is a lifestyle, not a game.', color: 'pink', platforms: [SWITCH2, PC, IOS], squads: ['cozy', 'nintendo'], pools: ['indie', 'nintendo', 'coop'], size: [14, 20] },
  { handle: 'leo_hollow', name: 'Leo Fischer', bio: 'Silksong 100% or bust.', color: 'navy', platforms: [PC, SWITCH2], squads: ['cozy'], pools: ['indie', 'souls', 'nintendo'], size: [16, 22] },
  { handle: 'sofia_farms', name: 'Sofia Martins', bio: 'Farming sims, cats and Dredge.', color: 'gold', platforms: [PC], squads: ['cozy'], pools: ['cozy', 'indie'], size: [12, 16] },
  { handle: 'uche_mushroom', name: 'Uche Okeke', bio: 'Mario Kart World lobby host. Be nice or get blue-shelled.', color: 'red', platforms: [SWITCH2, SWITCH], squads: ['nintendo'], pools: ['nintendo', 'coop', 'indie'], size: [14, 20] },
  { handle: 'ngozi_hyrule', name: 'Ngozi Umeh', bio: 'Zelda first, questions later.', color: 'green', platforms: [SWITCH, SWITCH2], squads: ['nintendo'], pools: ['nintendo', 'rpg', 'indie'], size: [14, 20] },
  { handle: 'jonah_bananza', name: 'Jonah Price', bio: 'DK Bananza broke my controller. Worth it.', color: 'orange', platforms: [SWITCH2], squads: ['nintendo'], pools: ['nintendo', 'coop'], size: [10, 14] },
  { handle: 'yusuf_pokemon', name: 'Yusuf Danjuma', bio: 'Shiny hunter. Currently grinding Z-A.', color: 'blue', platforms: [SWITCH2, SWITCH], squads: ['nintendo'], pools: ['nintendo', 'cozy', 'rpg'], size: [12, 16] },
  { handle: 'tunde_backlog', name: 'Tunde Bakare', bio: 'Backlog of 200 games and counting.', color: 'slate', platforms: [PC, PS5], squads: ['cozy', 'souls'], pools: ['rpg', 'indie', 'classic', 'action'], size: [26, 34], backlogBias: 0.55 },
  { handle: 'sade_speedruns', name: 'Sade Coker', bio: 'Celeste any% runner. Pizza Tower next.', color: 'purple', platforms: [PC, SWITCH], squads: ['cozy', 'nintendo'], pools: ['indie', 'nintendo', 'classic'], size: [14, 20] },
  { handle: 'dayo_couch', name: 'Dayo Olatunji', bio: 'Co-op only. It Takes Two, Split Fiction, Peak.', color: 'teal', platforms: [PS5, SWITCH2], squads: ['fps', 'nintendo', 'cozy'], pools: ['coop', 'nintendo', 'sports'], size: [12, 18] },
  { handle: 'amara_horror', name: 'Amara Nnaji', bio: 'Resident Evil and Silent Hill. Lights off.', color: 'navy', platforms: [PS5, PC], squads: ['souls'], pools: ['horror', 'action', 'souls'], size: [12, 18], shareActivity: false },
  { handle: 'lekan_retro', name: 'Lekan Afolabi', bio: 'Old games on new hardware. Half-Life 3 believer.', color: 'gold', platforms: [PC], squads: ['souls'], pools: ['classic', 'strategy'], size: [14, 20], shareActivity: false, quiet: true },
  { handle: 'rhea_openworld', name: 'Rhea Thompson', bio: 'Open worlds only. Night City is the best city in games.', color: 'pink', platforms: [PC, PS5], squads: ['souls', 'fps'], pools: ['action', 'rpg', 'shooter'], size: [16, 22] },
  { handle: 'nnamdi_strat', name: 'Nnamdi Eze', bio: 'Civ, XCOM, BG3. One more turn.', color: 'slate', platforms: [PC], squads: ['souls'], pools: ['strategy', 'rpg', 'classic'], size: [14, 20] },
];

const ALL = USERS.map((u) => u.handle);
const FPS = USERS.filter((u) => u.squads.includes('fps')).map((u) => u.handle);
const except = (...skip) => ALL.filter((h) => !skip.includes(h));

// Real accounts, matched by handle. Accounts that do not exist are skipped.
// follows: demo users this account follows. followedBy: demo users who follow it.
export const REAL_LINKS = [
  {
    handle: 'aidelojejoshua',
    follows: except('lekan_retro', 'sofia_farms', 'damilola_gg', 'yusuf_pokemon', 'marcus_aim', 'jonah_bananza'),
    followedBy: except('sofia_farms', 'lekan_retro', 'marcus_aim', 'yusuf_pokemon'),
  },
  {
    handle: 'solaakintewe',
    follows: [...FPS, 'tunde_backlog', 'kemi_cozy', 'rhea_openworld'],
    followedBy: [...FPS, 'tunde_backlog', 'kemi_cozy'],
  },
  {
    handle: 'nathanakin084',
    follows: ['chidi_fc', 'emeka_ranked', 'bola_bxbx', 'tobi_souls', 'rhea_openworld', 'uche_mushroom', 'dayo_couch', 'tunde_backlog', 'priya_plays', 'adaeze_rpg'],
    followedBy: ['chidi_fc', 'emeka_ranked', 'bola_bxbx', 'dayo_couch', 'tunde_backlog', 'uche_mushroom', 'rhea_openworld'],
  },
  {
    handle: 'nathanakin638',
    follows: ['tobi_souls', 'kenji_parry', 'zainab_quests', 'adaeze_rpg', 'ngozi_hyrule', 'rhea_openworld', 'tunde_backlog', 'seyi_clutch', 'kemi_cozy', 'leo_hollow'],
    followedBy: ['tobi_souls', 'zainab_quests', 'adaeze_rpg', 'ngozi_hyrule', 'tunde_backlog', 'leo_hollow'],
  },
];

// Replies from demo users on posts the real accounts already made.
// match is an ILIKE pattern on the post body.
export const REAL_POST_REPLIES = [
  { author: 'solaakintewe', match: 'Hello everyone%', replies: [['tunde_backlog', 'Welcome! 👋'], ['kemi_cozy', 'Hi Sola! Follow me for cozy recs.']] },
  { author: 'solaakintewe', match: 'I don%t have a ps5%', replies: [['chidi_fc', 'PC gang will adopt you.'], ['dayo_couch', 'Switch 2 is also a valid lifestyle.']] },
];

// ago: days before the seed runs. hour: hours played at the time of the post.
// status: what the post says about the author's shelf. 'watch' means not out yet.
// category: the feed chip. 'trophies' for finishes, ranks, 100% runs and personal bests,
// 'questions' for posts that ask the reader something, 'memes' for jokes and funny moments.
// poll: the options, and the hours from now until the poll ends. A negative value means it ended.
// repostedBy: demo users who repost the post. photo: the post carries the game's IGDB screenshot.
export const POSTS = [
  { by: 'tobi_souls', game: 'nightreign', status: 'playing', hour: 31, ago: 12.4, category: 'memes', body: 'Three-player Nightreign runs with @kenji_parry and @femi_lore until 2am. Lost to the final boss by a sliver. Going again tonight.', replies: [['kenji_parry', 'Tonight we win. Bring flasks.'], ['femi_lore', 'I carried both of you and I want that noted.']] },
  { by: 'adaeze_rpg', game: 'clairObscur', status: 'beaten', hour: 58, ago: 11.8, category: 'trophies', body: 'Finished Clair Obscur. 58 hours and I have no words for the ending. Go play it. #clairobscur', link: 'https://store.steampowered.com/app/1903340/', replies: [['maya_expedition', 'I am 22 hours in. Do not spoil anything!!'], ['nnamdi_strat', 'Buying it tonight.'], ['zainab_quests', 'Adding it to the backlog. Again.']], repostedBy: ['maya_expedition', 'nnamdi_strat'] },
  { by: 'chidi_fc', game: 'fc26', status: 'playing', hour: 412, ago: 11.2, category: 'memes', body: '412 hours on FC 26 and I still cannot defend a through ball. FC 27 better fix this. #fc26', replies: [['emeka_ranked', 'Nobody can defend in FC. It is a feature.'], ['damilola_gg', 'Skill issue 😭']] },
  { by: 'kemi_cozy', game: 'stardew', status: 'playing', hour: 140, ago: 10.9, category: 'trophies', body: 'Year 3 spring on the farm. The greenhouse is finally running. Peak serenity. #stardewvalley' },
  { by: 'seyi_clutch', game: 'valorant', status: 'playing', hour: 860, ago: 10.5, category: 'trophies', body: 'Hit Immortal 1 last night. Need a duo who actually comms. Apply within.', replies: [['marcus_aim', 'I can smoke. I cannot comm. Deal?']] },
  { by: 'leo_hollow', game: 'silksong', status: 'beaten', hour: 64, ago: 10.1, category: 'trophies', body: 'Silksong 100%. Every tool, every bench, every crest. 64 hours well spent, and a year on it still has no business being this good. #silksong', link: 'https://store.steampowered.com/app/1030300/', replies: [['ifeoma_pixels', 'How long did the last few tools take you?'], ['leo_hollow', 'About 10 hours of pure suffering.'], ['sade_speedruns', 'Speedrun when?']], repostedBy: ['ifeoma_pixels', 'sade_speedruns'] },
  { by: 'uche_mushroom', game: 'mkWorld', status: 'playing', hour: 45, ago: 9.8, category: 'memes', body: 'Mario Kart World lobby tonight at 9pm. Winner picks the next track. No blue shell complaints. #mariokartworld', replies: [['jonah_bananza', 'I am in. I will not be nice.'], ['yusuf_pokemon', 'Save me a spot pls']], repostedBy: ['jonah_bananza', 'yusuf_pokemon'] },
  { by: 'maya_expedition', game: 'clairObscur', status: 'playing', hour: 22, ago: 9.6, category: 'trophies', body: '22 hours into Clair Obscur. The parry timing finally clicked, and the soundtrack is doing unreasonable things to me.' },
  { by: 'priya_plays', game: 'balatro', status: 'beaten', hour: 96, ago: 9.3, category: 'trophies', body: 'Beat Gold Stake with a flush build. 96 hours. I have a problem and I am not fixing it.', link: 'https://store.steampowered.com/app/2379780/', replies: [['kemi_cozy', 'Just one more run 😭'], ['ifeoma_pixels', 'Stop posting this, I have work tomorrow']], repostedBy: ['kemi_cozy'] },
  { by: 'amara_horror', game: 'reRequiem', status: 'beaten', hour: 11, ago: 9.0, category: 'trophies', body: 'Resident Evil Requiem finished. Played it lights off with headphones on. Never again. Also starting it again tomorrow.', replies: [['rhea_openworld', 'Saving this one for October.']] },
  { by: 'dayo_couch', game: 'splitFiction', status: 'beaten', hour: 15, ago: 8.7, category: 'trophies', body: 'Split Fiction co-op with my sister. We argued for 15 hours straight and it was the best time.' },
  { by: 'bola_bxbx', game: 'helldivers2', status: 'playing', hour: 230, ago: 8.4, category: 'memes', body: 'Called an orbital strike on my own squad. Twice. For democracy. #helldivers2' },
  { by: 'ngozi_hyrule', game: 'totk', status: 'playing', hour: 180, ago: 8.1, category: 'memes', body: '180 hours into Tears of the Kingdom and I just found a sky island I never saw. This game does not end. #totk', replies: [['uche_mushroom', 'Which island?? I thought I was done too.']] },
  { by: 'rhea_openworld', game: 'cyberpunk', status: 'beaten', hour: 95, ago: 7.8, category: 'trophies', body: 'Third Cyberpunk playthrough done. Night City in the rain on a good screen is still the best city in games.' },
  { by: 'nnamdi_strat', game: 'bg3', status: 'beaten', hour: 210, ago: 7.5, category: 'trophies', body: 'Honour Mode clear. 210 hours across three runs. Karlach deserved better and I will not take questions. #bg3', replies: [['adaeze_rpg', 'Justice for Karlach.'], ['rhea_openworld', 'Honour Mode is unhinged. Congrats.']], repostedBy: ['adaeze_rpg'] },
  { by: 'tunde_backlog', game: null, ago: 7.3, category: 'questions', body: 'Backlog audit: 64 games, 11 started, 3 finished this year. Give me something under 10 hours.', replies: [['sade_speedruns', 'Celeste. 10 hours if you are lucky.'], ['ifeoma_pixels', 'What Remains of Edith Finch. 2 hours. Trust me.'], ['lekan_retro', 'Portal 2. No debate.'], ['kemi_cozy', 'Dredge!']] },
  { by: 'jonah_bananza', game: 'dkBananza', status: 'playing', hour: 28, ago: 7.0, category: 'memes', body: 'DK Bananza is pure chaos. Punched through half a level to skip a puzzle. Still counts.' },
  { by: 'kenji_parry', game: 'sekiro', status: 'beaten', hour: 88, ago: 6.8, category: 'trophies', body: 'Sekiro charmless run done. Isshin took three hours on his own. Hands still shaking.', replies: [['tobi_souls', 'Charmless?? Respect.'], ['femi_lore', 'Madness.']], repostedBy: ['tobi_souls', 'femi_lore'] },
  { by: 'zainab_quests', game: 'kcd2', status: 'playing', hour: 74, ago: 6.5, category: 'memes', body: '74 hours into Kingdom Come II and Henry still reads like a toddler. Loving every minute.' },
  { by: 'emeka_ranked', game: 'bo7', status: 'playing', hour: 120, ago: 6.2, category: 'trophies', body: 'Black Ops 7 camo grind done on every SMG. Now waiting for MW4 in October.' },
  { by: 'ifeoma_pixels', game: 'bluePrince', status: 'playing', hour: 19, ago: 6.0, category: 'memes', body: 'Blue Prince has filled my notebook with arrows and room names. Day 30-something. No spoilers please.' },
  // lekan_retro, yusuf_pokemon, marcus_aim, sofia_farms, damilola_gg and jonah_bananza are the
  // demo users aidelojejoshua does not follow. A repost of their post by someone he does follow
  // is what puts the "reposted by" line in his feed.
  { by: 'lekan_retro', game: 'portal', status: 'beaten', hour: 4, ago: 5.9, category: 'memes', body: 'Portal still holds up. The cake is still a lie.', repostedBy: ['tunde_backlog'] },
  { by: 'yusuf_pokemon', game: 'plza', status: 'playing', hour: 67, ago: 5.8, category: 'memes', body: 'Shiny hunt update: 1400 encounters, zero shinies. Z-A is testing me.', replies: [['priya_plays', 'Keep going. It always shows up the moment you give up.']] },
  { by: 'sade_speedruns', game: 'celeste', status: 'beaten', hour: 210, ago: 5.5, category: 'trophies', body: 'New Celeste any% PB. Shaved four seconds off Chapter 7. Sleep can wait.' },
  { by: 'marcus_aim', game: 'rivals', status: 'playing', hour: 340, ago: 5.3, category: 'trophies', body: 'Hit Grandmaster in Marvel Rivals. Duo queue is open if you can play support.' },
  { by: 'sofia_farms', game: 'dredge', status: 'beaten', hour: 12, ago: 5.0, category: 'trophies', body: 'Dredge done in 12 hours. The fish were not okay and neither am I.' },
  { by: 'femi_lore', game: 'bloodborne', status: 'playing', hour: 70, ago: 4.8, category: 'memes', body: 'Replaying Bloodborne for the lore. Every item description is a paragraph of nightmares.' },
  { by: 'lekan_retro', game: 'hl2', status: 'playing', hour: 14, ago: 4.6, category: 'memes', body: 'Half-Life 2 one more time. The gravity gun still feels like the future.' },
  { by: 'damilola_gg', game: 'tekken8', status: 'playing', hour: 150, ago: 4.4, category: 'trophies', body: 'Finally out of Fighter rank in Tekken 8 after 150 hours. Paul main forever.' },
  { by: 'adaeze_rpg', game: 'metaphor', status: 'playing', hour: 34, ago: 4.1, category: 'memes', body: 'Started Metaphor: ReFantazio now that Clair Obscur is done. 34 hours in. Best menus Atlus has ever made.' },
  { by: 'tobi_souls', game: 'wukong', status: 'beaten', hour: 44, ago: 3.9, category: 'trophies', body: 'Wukong finished. The bosses are unreal. So are the invisible walls.' },
  { by: 'chidi_fc', game: 'fc27', status: 'watch', ago: 3.7, category: 'memes', body: 'FC 27 countdown is on. Pre-ordered, day off booked. Do not call me.', replies: [['emeka_ranked', 'Same. Division 1 by Sunday.'], ['damilola_gg', 'Booked the day off too lol']] },
  { by: 'kemi_cozy', game: 'acnh', status: 'playing', hour: 300, ago: 3.5, category: 'trophies', body: 'Island rating hit five stars after 300 hours. What do I do with my life now.' },
  { by: 'seyi_clutch', game: 'gearsEDay', status: 'watch', ago: 3.2, category: 'questions', body: 'Anyone else hyped for Gears E-Day in October? First Gears since secondary school.' },
  { by: 'leo_hollow', game: 'hades2', status: 'playing', hour: 38, ago: 3.0, category: 'memes', body: '38 hours into Hades II. The Surface route is brutal and I love it.' },
  { by: 'maya_expedition', game: 'ds2', status: 'playing', hour: 25, ago: 2.8, category: 'memes', body: '25 hours into Death Stranding 2. Delivering packages should not be this emotional.' },
  { by: 'uche_mushroom', game: 'dkBananza', status: 'beaten', hour: 30, ago: 2.6, category: 'trophies', body: 'Beat DK Bananza. The final level is Nintendo showing off.' },
  { by: 'priya_plays', game: 'peak', status: 'playing', hour: 8, ago: 2.4, category: 'memes', body: 'Peak with @dayo_couch and two strangers. We did not reach the peak.' },
  { by: 'rhea_openworld', game: 'wolverine', status: 'playing', hour: 9, ago: 2.2, category: 'memes', body: 'Wolverine came out on Tuesday and I have already lost 9 hours. The combat feels heavy in the best way.', replies: [['femi_lore', 'Same boat. Six hours in.']] },
  { by: 'amara_horror', game: 'townfall', status: 'watch', ago: 2.0, category: 'memes', body: 'Silent Hill: Townfall next week. Clearing my schedule. Lights off, headphones on.' },
  { by: 'uche_mushroom', game: null, ago: 2.0, category: 'questions', body: 'Mario Kart World: which item ends friendships fastest?', poll: { endsInHours: -24, options: ['Blue shell', 'Lightning', 'Red shell', 'Bullet Bill'] }, replies: [['jonah_bananza', 'Blue shell. Ask me how I know.']] },
  { by: 'femi_lore', game: 'wolverine', status: 'playing', hour: 6, ago: 1.9, category: 'questions', body: 'Six hours into Wolverine. Somebody tell me the story keeps this up.' },
  { by: 'nnamdi_strat', game: 'clairObscur', status: 'playing', hour: 41, ago: 1.7, category: 'memes', body: 'Everyone here told me to play Clair Obscur. 41 hours later: you were right. Turn-based with parries is genius.' },
  { by: 'tunde_backlog', game: 'portal2', status: 'beaten', hour: 9, ago: 1.6, category: 'trophies', body: "Took the feed's advice and played Portal 2. Done in 9 hours. Why did I wait 15 years.", replies: [['lekan_retro', 'Told you.'], ['sade_speedruns', 'Co-op next?']] },
  { by: 'bola_bxbx', game: 'gta6', status: 'watch', ago: 1.5, category: 'memes', body: 'Two months to GTA VI. Week off booked. My manager does not know yet.', replies: [['chidi_fc', 'Two months. TWO MONTHS.'], ['seyi_clutch', 'Same, taking the whole week.']], repostedBy: ['chidi_fc', 'seyi_clutch', 'emeka_ranked'] },
  { by: 'sofia_farms', game: 'stardew', status: 'playing', hour: 88, ago: 1.4, category: 'memes', body: 'Co-op Stardew with @kemi_cozy. She organised all my chests. I have never felt so seen.', repostedBy: ['kemi_cozy'] },
  { by: 'ngozi_hyrule', game: 'kirbyAir', status: 'playing', hour: 18, ago: 1.3, category: 'memes', body: 'Kirby Air Riders is now the most chaotic party game I own.' },
  { by: 'dayo_couch', game: 'itTakesTwo', status: 'beaten', hour: 14, ago: 1.2, category: 'trophies', body: "Replayed It Takes Two for my cousin's first time. The elephant scene still hurts." },
  { by: 'ifeoma_pixels', game: null, ago: 1.2, category: 'questions', body: 'Best game soundtrack of the last two years?', poll: { endsInHours: 72, options: ['Silksong', 'Clair Obscur', 'Hades II', 'Death Stranding 2'] }, replies: [['leo_hollow', 'Silksong and it is not close.'], ['maya_expedition', 'Clair Obscur. I will die on this hill.']] },
  { by: 'zainab_quests', game: 'witcher3', status: 'playing', hour: 160, ago: 1.1, category: 'memes', body: 'Witcher 3 again before Witcher IV. Blood and Wine is still the best expansion ever made.', replies: [['nnamdi_strat', 'Blood and Wine is better than most full games.'], ['maya_expedition', 'Toussaint is the prettiest place in any game.']] },
  { by: 'jonah_bananza', game: 'mkWorld', status: 'playing', hour: 22, ago: 1.0, category: 'memes', body: "@uche_mushroom's Mario Kart lobby is a war crime. Good games though.", repostedBy: ['uche_mushroom'] },
  { by: 'kenji_parry', game: 'onimusha', status: 'beaten', hour: 16, ago: 0.9, category: 'trophies', body: 'Onimusha: Way of the Sword finished in 16 hours. The parry system is Sekiro-adjacent and I am here for it.' },
  // Ends 2 hours 18 minutes after the seed runs.
  { by: 'tobi_souls', game: null, ago: 0.9, category: 'questions', body: 'Which of these would you play all year if you had the chance?', poll: { endsInHours: 2.3, options: ['Elden Ring', 'The Last of Us', 'Spider-Man 2'] }, replies: [['kenji_parry', 'Elden Ring. Easy.'], ['rhea_openworld', 'Spider-Man 2 for the swinging alone.']] },
  { by: 'sade_speedruns', game: 'pizzaTower', status: 'beaten', hour: 12, ago: 0.8, category: 'trophies', body: 'P rank on every Pizza Tower level. My thumbs are gone.', repostedBy: ['leo_hollow'] },
  { by: 'damilola_gg', game: 'fc26', status: 'playing', hour: 190, ago: 0.75, category: 'memes', body: '@chidi_fc beat me 4-1 and has not stopped talking about it. Rematch Sunday. #fc26', replies: [['chidi_fc', '4-1 and it could have been 6.']], repostedBy: ['chidi_fc'] },
  { by: 'ifeoma_pixels', game: 'silksong', status: 'playing', hour: 30, ago: 0.7, category: 'memes', body: '30 hours into Silksong. The music in the Citadel is unreal. #silksong', photo: true },
  { by: 'marcus_aim', game: 'bf6', status: 'playing', hour: 90, ago: 0.6, category: 'memes', body: 'Battlefield 6 destruction is back to Bad Company levels. Took down a whole building with one tank shell.', photo: true, repostedBy: ['seyi_clutch', 'bola_bxbx'] },
  { by: 'chidi_fc', game: null, ago: 0.55, category: 'questions', body: 'Which FC 27 mode are you starting on day one?', poll: { endsInHours: 24, options: ['Ultimate Team', 'Career Mode', 'Clubs', 'Rush'] }, replies: [['emeka_ranked', 'Ultimate Team. Was there ever a choice?']] },
  { by: 'emeka_ranked', game: 'fc26', status: 'playing', hour: 280, ago: 0.5, category: 'memes', body: 'Last weekend of FC 26 Ultimate Team. Selling everything. See you in 27. #fc26' },
  { by: 'adaeze_rpg', game: 'bg3', status: 'beaten', hour: 130, ago: 0.45, category: 'questions', body: 'Someone talk me out of a fourth BG3 run.', replies: [['nnamdi_strat', 'No. Do it. Durge run.'], ['zainab_quests', 'Play Clair Obscur again instead 😌']] },
  { by: 'yusuf_pokemon', game: 'plza', status: 'playing', hour: 72, ago: 0.35, category: 'trophies', body: 'IT HAPPENED. Shiny after 1650 encounters. Framing this screenshot.', replies: [['priya_plays', 'LETS GOOO'], ['uche_mushroom', 'Told you it would show up.']], photo: true, repostedBy: ['priya_plays', 'uche_mushroom'] },
  { by: 'tobi_souls', game: 'eldenRing', status: 'beaten', hour: 280, ago: 0.25, category: 'trophies', body: 'Elden Ring NG+3 done. Malenia is still the hardest boss I have ever fought. #eldenring', replies: [['kenji_parry', 'NG+3 Malenia?? Respect.']], photo: true, repostedBy: ['kenji_parry', 'femi_lore'] },
  { by: 'kemi_cozy', game: 'stardew', status: 'playing', hour: 145, ago: 0.15, category: 'memes', body: 'Pierre raised his prices again. The farm is fine though.' },
];

export const GENERIC_REPLIES = [
  'W',
  'Post of the week.',
  'Adding this to my backlog.',
  'No way 😭',
  'Okay, I need to try this.',
  'How is the performance?',
  'Save me a spot next time.',
  'Respect.',
  'This app is going to ruin my wallet.',
  'Same energy tonight.',
  'Congrats!!',
  'You are making me want to reinstall.',
  'Let me know when you are on.',
];

export const NOTES = {
  beaten: ['Platinum done.', '100% complete.', 'Played co-op with the squad.', 'Need to replay on hard.', 'Best ending I have seen in years.', 'Did every side quest.'],
  playing: ['Chipping away on weekends.', 'One more run, then bed.', 'Playing with the group chat.'],
  dropped: ['Not for me.', 'Will come back to it one day.', 'Lost my save. Could not face it.', 'Too grindy.'],
  backlog: ['Bought on sale.', 'Everyone says it is great.', 'Saving it for the holidays.'],
};
