import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  useMediaQuery,
  alpha,
  CircularProgress,
  Paper
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  AccountTree as AccountTreeIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LanguageIcon from '@mui/icons-material/Language';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ColorModeContext } from '../context/ColorModeContext';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes/routes';
import apiClient from '../api/client';
import type { Workspace, User } from '../types';

const drawerWidth = 260;

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const checkAuth = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');
    const wsStr = sessionStorage.getItem('activeWorkspace');

    console.log('checkAuth called:');
    console.log('  token:', token ? 'present' : 'missing');
    console.log('  userStr:', userStr);
    console.log('  wsStr:', wsStr);

    if (!token || !userStr) {
      console.log('  Redirecting to login: token or user missing.');
      navigate(ROUTES.LOGIN);
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as User;
      console.log('  Parsed user:', parsedUser);
      const parsedWS = wsStr ? JSON.parse(wsStr) as any : null;
      // Migrate old format if necessary
      if (parsedWS && parsedWS.name && !parsedWS.default_workspace_id) {
        parsedWS.default_workspace_id = parsedWS.id;  
      }
      console.log('  Parsed activeWorkspace:', parsedWS);
      
      setUser(parsedUser);
      setActiveWorkspace(parsedWS as Workspace);

      if (!parsedWS && location.pathname !== ROUTES.WORKSPACES) {
        console.log('  Redirecting to workspaces: activeWorkspace missing.');
        navigate(ROUTES.WORKSPACES);
        return;
      }

      // Fetch workspaces for the menu
      try {
        console.log(`  Fetching workspaces for user ID: ${parsedUser.id} with profile: ${parsedUser.profile}`);
        const response = await apiClient.get<Workspace[]>(`/workspaces/user/${parsedUser.id}`);
        console.log('  Workspaces fetched:', response.data);
        setWorkspaces(Array.isArray(response.data) ? response.data : []);
      } catch (err: unknown) {
        console.error('Error loading workspaces in menu', err);
      }

      setIsLoading(false);
    } catch (e: unknown) {
      console.error('Session parsing error', e);
      sessionStorage.clear();
      navigate(ROUTES.LOGIN);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleWorkspaceChange = (event: SelectChangeEvent) => {
    const wsId = event.target.value;
    const selected = workspaces.find(w => w.id === wsId);
    if (selected) {
      sessionStorage.setItem('activeWorkspace', JSON.stringify(selected));
      window.location.reload(); 
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate(ROUTES.LOGIN);
  };

  const menuItems = useMemo(() => {
    const items = [
      { text: t('sidebar.dashboard'), icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
      { text: t('sidebar.cost_centers'), icon: <AccountTreeIcon />, path: ROUTES.COST_CENTERS },
      { text: t('sidebar.collaborators'), icon: <PeopleIcon />, path: ROUTES.COLLABORATORS },
      { text: t('sidebar.invoices'), icon: <ReceiptIcon />, path: ROUTES.INVOICES },
      { text: t('sidebar.reports'), icon: <AssessmentIcon />, path: ROUTES.REPORTS },
    ];

    // Only add Users menu item if user state is available and profile is admin or jedi
    if (user?.profile === 'admin' || user?.profile === 'jedi') {
      items.push({ text: t('sidebar.users'), icon: <PeopleIcon />, path: ROUTES.USERS });
    }

    return items;
  }, [user?.profile, t]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 3, py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box 
          component="img"
          src="/logo.jpg"
          alt="Teleen Logo"
          sx={{ 
            width: 60, 
            height: 60, 
            borderRadius: 1.5, 
            objectFit: 'contain',
            bgcolor: 'white',
            p: 0.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>teleen</Typography>
      </Toolbar>
      
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700, px: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
          Active Workspace
        </Typography>
        {user?.profile === 'jedi' ? (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <Select
              value={activeWorkspace?.id || ''}
              onChange={handleWorkspaceChange}
              displayEmpty
              variant="outlined"
              sx={{ 
                fontSize: '0.875rem', fontWeight: 600,
                bgcolor: theme.palette.mode === 'dark' ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              }}
            >
              {!activeWorkspace && (
                <MenuItem value="" disabled>Select a Workspace</MenuItem>
              )}
              {workspaces.map((ws) => (
                <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Box sx={{ 
            mt: 1, px: 2, py: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
              {activeWorkspace?.name || 'None Selected'}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: 2, mb: 2, opacity: 0.5 }} />

      <List sx={{ px: 2, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              onClick={() => { navigate(item.path); if(isMobile) setMobileOpen(false); }}
              selected={location.pathname === item.path}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? theme.palette.primary.main : theme.palette.text.secondary }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ fontSize: '0.925rem', fontWeight: location.pathname === item.path ? 700 : 500 }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2, mt: 'auto' }}>
        {user ? ( // Conditional rendering for user info
          <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.875rem' }}>
                {user.name?.charAt(0) || '?'} {/* Fallback for avatar character */}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user.name || 'User Name Missing'}</Typography> {/* Fallback */}
                <Typography variant="caption" noWrap sx={{ color: theme.palette.text.secondary }}>{user.profile || 'Profile Missing'}</Typography> {/* Fallback */}
              </Box>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', p: 1 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="caption">Loading user info...</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  // Log the user state just before rendering the main layout structure
  console.log('User state in Layout JSX:', user);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 'none',
          border: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><MenuIcon /></IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, display: { xs: 'none', md: 'block' } }}>Dashboard /</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'Página'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton 
              onClick={(e) => setLangAnchorEl(e.currentTarget)} 
              size="small" 
              sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}
            >
              <LanguageIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={() => setLangAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { i18n.changeLanguage('pt-BR'); setLangAnchorEl(null); }}>🇧🇷 Português</MenuItem>
              <MenuItem onClick={() => { i18n.changeLanguage('en'); setLangAnchorEl(null); }}>🇺🇸 English</MenuItem>
              <MenuItem onClick={() => { i18n.changeLanguage('es'); setLangAnchorEl(null); }}>🇪🇸 Español</MenuItem>
            </Menu>

            <IconButton onClick={colorMode.toggleColorMode} size="small" sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
              {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>

            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5, ml: 1 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.main, border: `2px solid ${theme.palette.background.paper}` }}>
                {user?.name?.charAt(0)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ sx: { minWidth: 200, mt: 1.5, borderRadius: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate(ROUTES.PROFILE); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                {t('common.profile')}
              </MenuItem>
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate(`${ROUTES.PROFILE}?tab=workspaces`); }}>
                <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
                {t('common.workspaces')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: theme.palette.error.main }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon>
                {t('common.logout')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent" open
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 2, sm: 4 }, 
        width: { sm: `calc(100% - ${drawerWidth}px)` }, 
        mt: 8, 
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
