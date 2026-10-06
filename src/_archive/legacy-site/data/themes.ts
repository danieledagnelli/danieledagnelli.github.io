export interface Theme {
  id: string;
  path: string;
  label: string;
  storageKey: string;
  accentColor: string;
}

export const themes: Theme[] = [
  { id: 'cyberpunk', path: '/cyberpunk', label: 'Cyberpunk Terminal', storageKey: 'v2-intro', accentColor: '#00ff41' },
  { id: 'botanist', path: '/botanist', label: 'Botanical Journal', storageKey: 'botanist-intro', accentColor: '#4a7c29' },
  { id: 'space', path: '/space', label: 'Deep Space Dossier', storageKey: 'space-intro', accentColor: '#00a8ff' },
  { id: 'chef', path: '/chef', label: 'Kitchen Portfolio', storageKey: 'chef-intro', accentColor: '#d4930d' },
  { id: 'architect', path: '/architect', label: 'Blueprint Studio', storageKey: 'architect-intro', accentColor: '#4a9eff' },
  { id: 'cinema', path: '/cinema', label: 'Film Production', storageKey: 'cinema-intro', accentColor: '#d4af37' },
  { id: 'pirate', path: '/pirate', label: 'Pirate Logbook', storageKey: 'pirate-intro', accentColor: '#8b3a3a' },
  { id: 'rpg', path: '/rpg', label: 'RPG Quest', storageKey: 'rpg-intro', accentColor: '#d4a744' },
  { id: 'safari', path: '/safari', label: 'Safari Expedition', storageKey: 'safari-intro', accentColor: '#c9a84c' },
  { id: 'vinyl', path: '/vinyl', label: 'Vinyl Collection', storageKey: 'vinyl-intro', accentColor: '#cc2a2a' },
  { id: 'observatory', path: '/observatory', label: 'Observatory Log', storageKey: 'observatory-intro', accentColor: '#4a8aff' },
  { id: 'noir', path: '/noir', label: 'Film Noir Detective', storageKey: 'noir-intro-seen', accentColor: '#8b1a1a' },
  { id: 'newspaper', path: '/newspaper', label: '1920s Newspaper', storageKey: 'newspaper-intro-seen', accentColor: '#8b4513' },
  { id: 'museum', path: '/museum', label: 'Museum Exhibition', storageKey: 'museum-intro-seen', accentColor: '#b8860b' },
  { id: 'radio', path: '/radio', label: 'Vintage Radio', storageKey: 'radio-intro-seen', accentColor: '#d4930d' },
  { id: 'submarine', path: '/submarine', label: 'Submarine Ops', storageKey: 'submarine-intro-seen', accentColor: '#00cc66' },
  { id: 'arcade', path: '/arcade', label: 'Retro Arcade', storageKey: 'arcade-intro-seen', accentColor: '#00ccff' },
  { id: 'train', path: '/train', label: 'Orient Express', storageKey: 'train-intro-seen', accentColor: '#c9a84c' },
  { id: 'opera', path: '/opera', label: 'Grand Opera', storageKey: 'opera-intro-seen', accentColor: '#d4a744' },
  { id: 'laboratory', path: '/laboratory', label: 'Scientific Paper', storageKey: 'laboratory-intro-seen', accentColor: '#c0392b' },
  { id: 'dojo', path: '/dojo', label: 'Martial Arts Dojo', storageKey: 'dojo-intro-seen', accentColor: '#cc3333' },
];
