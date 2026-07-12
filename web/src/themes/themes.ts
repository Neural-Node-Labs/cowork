export interface ThemeVars {
  '--bg': string;
  '--surface': string;
  '--surface-2': string;
  '--border': string;
  '--text': string;
  '--text-muted': string;
  '--text-faint': string;
  '--accent': string;
  '--accent-contrast': string;
  '--success': string;
  '--warning': string;
  '--danger': string;
  '--thought': string;
  '--action': string;
  '--observation': string;
  '--final': string;
}

export interface Theme {
  id: string;
  name: string;
  /** 3 dot preview colors shown in the picker: [bg, surface/border, accent] */
  swatch: [string, string, string];
  vars: ThemeVars;
}

export const themes: Theme[] = [
  {
    id: 'terminal-dark',
    name: 'Terminal',
    swatch: ['#0b0f0d', '#173420', '#4ade80'],
    vars: {
      '--bg': '#0b0f0d',
      '--surface': '#101613',
      '--surface-2': '#161f1a',
      '--border': '#1f2e24',
      '--text': '#d7f5df',
      '--text-muted': '#7fa98c',
      '--text-faint': '#4d6b57',
      '--accent': '#4ade80',
      '--accent-contrast': '#062b12',
      '--success': '#4ade80',
      '--warning': '#f2c14e',
      '--danger': '#ff6b6b',
      '--thought': '#7dd3fc',
      '--action': '#f2c14e',
      '--observation': '#4ade80',
      '--final': '#c084fc'
    }
  },
  {
    id: 'paper-light',
    name: 'Paper',
    swatch: ['#f6f2e9', '#e4dcc8', '#b5502f'],
    vars: {
      '--bg': '#f6f2e9',
      '--surface': '#fffdf8',
      '--surface-2': '#efe8d8',
      '--border': '#ded4bc',
      '--text': '#2a2420',
      '--text-muted': '#6b6153',
      '--text-faint': '#a89d89',
      '--accent': '#b5502f',
      '--accent-contrast': '#fffaf3',
      '--success': '#3f7d4f',
      '--warning': '#a9741f',
      '--danger': '#b3392c',
      '--thought': '#2f6fa0',
      '--action': '#a9741f',
      '--observation': '#3f7d4f',
      '--final': '#6a4c93'
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    swatch: ['#2e3440', '#3b4252', '#88c0d0'],
    vars: {
      '--bg': '#2e3440',
      '--surface': '#3b4252',
      '--surface-2': '#434c5e',
      '--border': '#4c566a',
      '--text': '#e5e9f0',
      '--text-muted': '#b7c0d1',
      '--text-faint': '#7c8aa5',
      '--accent': '#88c0d0',
      '--accent-contrast': '#1a2029',
      '--success': '#a3be8c',
      '--warning': '#ebcb8b',
      '--danger': '#bf616a',
      '--thought': '#81a1c1',
      '--action': '#ebcb8b',
      '--observation': '#a3be8c',
      '--final': '#b48ead'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    swatch: ['#282a36', '#44475a', '#ff79c6'],
    vars: {
      '--bg': '#282a36',
      '--surface': '#2f3140',
      '--surface-2': '#383a4a',
      '--border': '#44475a',
      '--text': '#f8f8f2',
      '--text-muted': '#b8b9c9',
      '--text-faint': '#767892',
      '--accent': '#ff79c6',
      '--accent-contrast': '#2b1520',
      '--success': '#50fa7b',
      '--warning': '#f1fa8c',
      '--danger': '#ff5555',
      '--thought': '#8be9fd',
      '--action': '#f1fa8c',
      '--observation': '#50fa7b',
      '--final': '#bd93f9'
    }
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    swatch: ['#002b36', '#073642', '#b58900'],
    vars: {
      '--bg': '#002b36',
      '--surface': '#073642',
      '--surface-2': '#0a3f4c',
      '--border': '#0d4854',
      '--text': '#eee8d5',
      '--text-muted': '#93a1a1',
      '--text-faint': '#5a7373',
      '--accent': '#b58900',
      '--accent-contrast': '#00232b',
      '--success': '#859900',
      '--warning': '#cb4b16',
      '--danger': '#dc322f',
      '--thought': '#268bd2',
      '--action': '#b58900',
      '--observation': '#859900',
      '--final': '#6c71c4'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    swatch: ['#fdf6e3', '#eee8d5', '#268bd2'],
    vars: {
      '--bg': '#fdf6e3',
      '--surface': '#fffdf5',
      '--surface-2': '#f3edd9',
      '--border': '#e3dbc3',
      '--text': '#073642',
      '--text-muted': '#657b7f',
      '--text-faint': '#93a1a1',
      '--accent': '#268bd2',
      '--accent-contrast': '#fdf6e3',
      '--success': '#859900',
      '--warning': '#b58900',
      '--danger': '#dc322f',
      '--thought': '#268bd2',
      '--action': '#b58900',
      '--observation': '#859900',
      '--final': '#6c71c4'
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    swatch: ['#272822', '#3e3d32', '#f92672'],
    vars: {
      '--bg': '#272822',
      '--surface': '#2e2f28',
      '--surface-2': '#35362d',
      '--border': '#49493f',
      '--text': '#f8f8f2',
      '--text-muted': '#bdbcb0',
      '--text-faint': '#797a6f',
      '--accent': '#f92672',
      '--accent-contrast': '#2b0714',
      '--success': '#a6e22e',
      '--warning': '#e6db74',
      '--danger': '#f92672',
      '--thought': '#66d9ef',
      '--action': '#e6db74',
      '--observation': '#a6e22e',
      '--final': '#ae81ff'
    }
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    swatch: ['#0a1929', '#0f2942', '#2dd4bf'],
    vars: {
      '--bg': '#0a1929',
      '--surface': '#0f2033',
      '--surface-2': '#123049',
      '--border': '#1c3d59',
      '--text': '#dcecf5',
      '--text-muted': '#89aec4',
      '--text-faint': '#4f7690',
      '--accent': '#2dd4bf',
      '--accent-contrast': '#04211d',
      '--success': '#2dd4bf',
      '--warning': '#facc15',
      '--danger': '#fb7185',
      '--thought': '#60a5fa',
      '--action': '#facc15',
      '--observation': '#2dd4bf',
      '--final': '#c084fc'
    }
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    swatch: ['#1c1017', '#2b1620', '#fb923c'],
    vars: {
      '--bg': '#1c1017',
      '--surface': '#231419',
      '--surface-2': '#2e1a21',
      '--border': '#40232a',
      '--text': '#f8e9e2',
      '--text-muted': '#cfa3a0',
      '--text-faint': '#8d6a68',
      '--accent': '#fb923c',
      '--accent-contrast': '#2b1204',
      '--success': '#f472b6',
      '--warning': '#fbbf24',
      '--danger': '#f43f5e',
      '--thought': '#f472b6',
      '--action': '#fbbf24',
      '--observation': '#fb7185',
      '--final': '#c084fc'
    }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    swatch: ['#000000', '#000000', '#ffe100'],
    vars: {
      '--bg': '#000000',
      '--surface': '#0a0a0a',
      '--surface-2': '#161616',
      '--border': '#ffffff',
      '--text': '#ffffff',
      '--text-muted': '#e0e0e0',
      '--text-faint': '#a0a0a0',
      '--accent': '#ffe100',
      '--accent-contrast': '#000000',
      '--success': '#00ff7f',
      '--warning': '#ffe100',
      '--danger': '#ff3b3b',
      '--thought': '#4dd8ff',
      '--action': '#ffe100',
      '--observation': '#00ff7f',
      '--final': '#ff8cf0'
    }
  }
];

export const DEFAULT_THEME_ID = 'terminal-dark';

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
