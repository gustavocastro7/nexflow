'use client';

import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1e3a5f' },
            background: { default: '#f8fafc', paper: '#ffffff' },
          }
        : {
            primary: { main: '#90caf9' },
            background: { default: '#121212', paper: '#1e1e1e' },
          }),
    },
    typography: {
      fontFamily: '"Inter", system-ui, Avenir, Helvetica, Arial, sans-serif',
    },
    shape: { borderRadius: 8 },
  });
