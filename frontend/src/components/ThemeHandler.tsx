import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme/theme';
import { ColorModeContext } from '../context/ColorModeContext';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../routes/routes';

interface ThemeHandlerProps {
  children: React.ReactNode;
}

const ThemeHandler: React.FC<ThemeHandlerProps> = ({ children }) => {
  const location = useLocation();
  const isPublicRoute = [ROUTES.LOGIN, ROUTES.REGISTER].includes(location.pathname as any);

  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Force light mode on login/register pages
  const activeMode = isPublicRoute ? 'light' : mode;

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(activeMode), [activeMode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default ThemeHandler;
