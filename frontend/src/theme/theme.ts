import { createTheme, alpha } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';
  
  // Modern Color Palette
  const primaryMain = '#20ACAC'; // Teal
  const secondaryMain = '#169EFF'; // Blue
  const backgroundDefault = isDark ? '#0F172A' : '#F8FAFC'; // Slate 900 / Slate 50
  const backgroundPaper = isDark ? '#1E293B' : '#FFFFFF'; // Slate 800 / White
  
  return {
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: alpha(primaryMain, 0.8),
        dark: alpha(primaryMain, 1.0),
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: secondaryMain,
        light: alpha(secondaryMain, 0.8),
        dark: alpha(secondaryMain, 1.0),
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      success: {
        main: '#10B981',
      },
      error: {
        main: '#E11D48',
      },
      warning: {
        main: '#F59E0B',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#1E293B',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? alpha('#94A3B8', 0.1) : alpha('#64748B', 0.1),
    },
    typography: {
      fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
      fontSize: 11.2, // MUI base font size (14 * 0.8)
      h1: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontSize: '1.1rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      subtitle1: { fontSize: '1rem' },
      subtitle2: { fontSize: '0.875rem' },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      button: { 
        fontSize: '0.875rem',
        fontWeight: 600, 
        textTransform: 'none',
        letterSpacing: '0.01em'
      },
      caption: { fontSize: '0.75rem' },
      overline: { fontSize: '0.75rem' },
    },
    shape: {
      borderRadius: 8, // More discrete, professional look
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '10px 24px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryMain} 0%, ${alpha(primaryMain, 0.8)} 100%)`,
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 8,
            border: `1px solid ${isDark ? alpha('#F1F5F9', 0.08) : alpha('#1E293B', 0.08)}`,
            boxShadow: isDark 
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? alpha(backgroundDefault, 0.8) : alpha('#FFFFFF', 0.8),
            backdropFilter: 'blur(8px)',
            color: isDark ? '#F1F5F9' : '#1E293B',
            borderBottom: `1px solid ${isDark ? alpha('#F1F5F9', 0.08) : alpha('#1E293B', 0.08)}`,
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              backgroundColor: isDark ? alpha('#FFFFFF', 0.03) : alpha('#000000', 0.01),
              '&:hover': {
                backgroundColor: isDark ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
              },
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? backgroundDefault : '#FFFFFF',
            borderRight: `1px solid ${isDark ? alpha('#F1F5F9', 0.08) : alpha('#1E293B', 0.08)}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: '4px 8px',
            '&.Mui-selected': {
              backgroundColor: alpha(primaryMain, 0.1),
              color: primaryMain,
              '& .MuiListItemIcon-root': { color: primaryMain },
              '&:hover': {
                backgroundColor: alpha(primaryMain, 0.15),
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            backgroundColor: isDark ? alpha(backgroundPaper, 0.5) : alpha(backgroundDefault, 0.5),
          },
          root: {
            borderColor: isDark ? alpha('#F1F5F9', 0.05) : alpha('#1E293B', 0.05),
          },
        },
      },
    },
  };
};

export const getTheme = (mode: 'light' | 'dark') => createTheme(getThemeOptions(mode));

export default getTheme('dark'); // Default
