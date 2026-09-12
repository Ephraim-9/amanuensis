import { ThemeDefinition } from './types';

export const THEMES: ThemeDefinition[] = [
  {
    id: 'serika-dark',
    name: 'Serika Dark',
    bgColor: '#323437',
    mainColor: '#e2b714',
    subColor: '#646669',
    textColor: '#d1d0c5',
    caretColor: '#e2b714',
    errorColor: '#ca4754',
  },
  {
    id: 'carbon',
    name: 'Carbon',
    bgColor: '#313131',
    mainColor: '#f66e0d',
    subColor: '#616161',
    textColor: '#f5e6c8',
    caretColor: '#f66e0d',
    errorColor: '#e45c5c',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    bgColor: '#282a36',
    mainColor: '#bd93f9',
    subColor: '#6272a4',
    textColor: '#f8f8f2',
    caretColor: '#50fa7b',
    errorColor: '#ff5555',
  },
  {
    id: 'nord',
    name: 'Nord',
    bgColor: '#2e3440',
    mainColor: '#88c0d0',
    subColor: '#4c566a',
    textColor: '#eceff4',
    caretColor: '#81a1c1',
    errorColor: '#bf616a',
  },
  {
    id: 'olivia',
    name: 'Olivia',
    bgColor: '#1c1b1d',
    mainColor: '#deaf9d',
    subColor: '#4a464c',
    textColor: '#f2efed',
    caretColor: '#deaf9d',
    errorColor: '#e05555',
  },
  {
    id: 'botanical',
    name: 'Botanical',
    bgColor: '#1e2827',
    mainColor: '#7b9c98',
    subColor: '#3c4c4a',
    textColor: '#eaf1f1',
    caretColor: '#7b9c98',
    errorColor: '#d66853',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    bgColor: '#000b1e',
    mainColor: '#00ffc2',
    subColor: '#583279',
    textColor: '#ffea00',
    caretColor: '#00ffc2',
    errorColor: '#ff0055',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    bgColor: '#000000',
    mainColor: '#15ff00',
    subColor: '#005500',
    textColor: '#00ff41',
    caretColor: '#15ff00',
    errorColor: '#ff2222',
  },
];

export function getTheme(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement;
  root.style.setProperty('--bg-color', theme.bgColor);
  root.style.setProperty('--main-color', theme.mainColor);
  root.style.setProperty('--sub-color', theme.subColor);
  root.style.setProperty('--text-color', theme.textColor);
  root.style.setProperty('--caret-color', theme.caretColor);
  root.style.setProperty('--error-color', theme.errorColor);
}
