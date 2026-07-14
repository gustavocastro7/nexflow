'use client';

import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { getTheme } from './theme/theme';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');

  const showNotification = useCallback((msg: string, sev: AlertColor = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const showError = useCallback((msg: string) => showNotification(msg, 'error'), [showNotification]);
  const showSuccess = useCallback((msg: string) => showNotification(msg, 'success'), [showNotification]);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showError, showSuccess }}>
      {children}
      <Snackbar open={open} autoHideDuration={5000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%', boxShadow: 3 }}>
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeMode');
      return (saved === 'light' || saved === 'dark') ? saved : 'light';
    }
    return 'light';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', next);
          return next;
        });
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>{children}</NotificationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
