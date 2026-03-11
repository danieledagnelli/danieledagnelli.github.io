export interface Theme {
  id: string;
  path: string;
  label: string;
  storageKey: string;
}

export const themes: Theme[] = [
  { id: 'cyberpunk', path: '/cyberpunk', label: 'Cyberpunk Terminal', storageKey: 'v2-intro' },
  { id: 'botanist', path: '/botanist', label: 'Botanical Journal', storageKey: 'botanist-intro' },
  { id: 'space', path: '/space', label: 'Deep Space Dossier', storageKey: 'space-intro' },
  { id: 'chef', path: '/chef', label: 'Kitchen Portfolio', storageKey: 'chef-intro' },
  { id: 'architect', path: '/architect', label: 'Blueprint Studio', storageKey: 'architect-intro' },
  { id: 'cinema', path: '/cinema', label: 'Film Production', storageKey: 'cinema-intro' },
  { id: 'pirate', path: '/pirate', label: 'Pirate Logbook', storageKey: 'pirate-intro' },
  { id: 'rpg', path: '/rpg', label: 'RPG Quest', storageKey: 'rpg-intro' },
  { id: 'safari', path: '/safari', label: 'Safari Expedition', storageKey: 'safari-intro' },
  { id: 'vinyl', path: '/vinyl', label: 'Vinyl Collection', storageKey: 'vinyl-intro' },
  { id: 'observatory', path: '/observatory', label: 'Observatory Log', storageKey: 'observatory-intro' },
  { id: 'noir', path: '/noir', label: 'Film Noir Detective', storageKey: 'noir-intro-seen' },
  { id: 'newspaper', path: '/newspaper', label: '1920s Newspaper', storageKey: 'newspaper-intro-seen' },
  { id: 'museum', path: '/museum', label: 'Museum Exhibition', storageKey: 'museum-intro-seen' },
  { id: 'radio', path: '/radio', label: 'Vintage Radio', storageKey: 'radio-intro-seen' },
  { id: 'submarine', path: '/submarine', label: 'Submarine Ops', storageKey: 'submarine-intro-seen' },
  { id: 'arcade', path: '/arcade', label: 'Retro Arcade', storageKey: 'arcade-intro-seen' },
  { id: 'train', path: '/train', label: 'Orient Express', storageKey: 'train-intro-seen' },
  { id: 'opera', path: '/opera', label: 'Grand Opera', storageKey: 'opera-intro-seen' },
  { id: 'laboratory', path: '/laboratory', label: 'Scientific Paper', storageKey: 'laboratory-intro-seen' },
  { id: 'dojo', path: '/dojo', label: 'Martial Arts Dojo', storageKey: 'dojo-intro-seen' },
];
