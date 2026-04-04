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
  Paper,
  Tooltip
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
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
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

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 88;

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const currentDrawerWidth = isMobile ? DRAWER_WIDTH : (isCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH);

  const checkAuth = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');
    const wsStr = sessionStorage.getItem('activeWorkspace');

    if (!token || !userStr) {
      navigate(ROUTES.LOGIN);
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as User;
      const parsedWS = wsStr ? JSON.parse(wsStr) as Workspace : null;
      // Migrate old format if necessary
      if (parsedWS && parsedWS.name && !parsedWS.default_workspace_id) {
        parsedWS.default_workspace_id = parsedWS.id;  
      }
      
      setUser(parsedUser);
      setActiveWorkspace(parsedWS as Workspace);

      if (!parsedWS && location.pathname !== ROUTES.WORKSPACES) {
        navigate(ROUTES.WORKSPACES);
        return;
      }

      // Fetch workspaces for the menu
      try {
        const response = await apiClient.get<Workspace[]>(`/workspaces/user/${parsedUser.id}`);
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
  const handleCollapseToggle = () => setIsCollapsed(!isCollapsed);
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden !important' }}>
      <Toolbar sx={{ 
        px: isCollapsed ? 2 : 3, 
        py: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: 2,
        transition: 'all 0.3s',
        minHeight: { xs: 64, sm: isCollapsed ? 70 : 80 }
      }}>
        <Box 
          component="img"
          src="/logo.jpg"
          alt="Teleen Logo"
          sx={{ 
            width: isCollapsed ? 36 : 44, 
            height: isCollapsed ? 36 : 44, 
            borderRadius: 1.5, 
            objectFit: 'contain',
            bgcolor: 'white',
            p: 0.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
            transition: 'all 0.3s'
          }}
        />
        {!isCollapsed && (
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            teleen
          </Typography>
        )}
      </Toolbar>
      
      <Box sx={{ px: 2, mb: 1 }}>
        {!isCollapsed && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700, px: 2, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
            Active Workspace
          </Typography>
        )}
        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center' }}>
          {isCollapsed ? (
            <Tooltip title={activeWorkspace?.name || 'Workspace'} placement="right">
              <Box sx={{ 
                p: 1, 
                borderRadius: 1, 
                bgcolor: theme.palette.mode === 'dark' ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
              </Box>
            </Tooltip>
          ) : (
            user?.profile === 'jedi' ? (
              <FormControl fullWidth size="small">
                <Select
                  value={activeWorkspace?.id || ''}
                  onChange={handleWorkspaceChange}
                  displayEmpty
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.8rem', fontWeight: 600,
                    bgcolor: theme.palette.mode === 'dark' ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    height: 36
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
                px: 1.5, py: 0.8,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? alpha('#FFFFFF', 0.05) : alpha('#000000', 0.02),
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%'
              }}>
                <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: '1.1rem' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', noWrap: true }}>
                  {activeWorkspace?.name || 'None Selected'}
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>

      <Divider sx={{ mx: 2, mb: 0.5, opacity: 0.5 }} />

      <List sx={{ 
        px: 1.5, 
        flexGrow: 1, 
        overflow: 'hidden !important',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
            <Tooltip title={isCollapsed ? item.text : ''} placement="right">
              <ListItemButton 
                onClick={() => { navigate(item.path); if(isMobile) setMobileOpen(false); }}
                selected={location.pathname === item.path}
                sx={{ 
                  py: 0.75,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1 : 1.5,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: isCollapsed ? 0 : 35, 
                  color: location.pathname === item.path ? theme.palette.primary.main : theme.palette.text.secondary,
                  justifyContent: 'center'
                }}>
                  {React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: '1.2rem' } })}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === item.path ? 700 : 500, noWrap: true }} 
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 1.5, mt: 'auto', borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`, overflow: 'hidden !important' }}>
        {isCollapsed ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
            <Tooltip title={user?.name || 'User'} placement="right">
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.8rem' }}>
                {user?.name?.charAt(0) || '?'}
              </Avatar>
            </Tooltip>
          </Box>
        ) : (
          user ? (
            <Paper sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, border: 'none', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: theme.palette.primary.main, fontSize: '0.75rem' }}>
                  {user.name?.charAt(0) || '?'}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{user.name || 'User'}</Typography>
                  <Typography variant="caption" noWrap sx={{ color: theme.palette.text.secondary, fontSize: '0.65rem' }}>{user.profile}</Typography>
                </Box>
              </Box>
            </Paper>
          ) : null
        )}
        
        {!isMobile && (
          <IconButton 
            onClick={handleCollapseToggle}
            size="small"
            sx={{ 
              width: '100%', 
              borderRadius: 1,
              py: 0.25,
              bgcolor: alpha(theme.palette.text.primary, 0.02),
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) }
            }}
          >
            {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', bgcolor: theme.palette.background.default, overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          boxShadow: 'none',
          border: 'none',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 }, minHeight: 64 }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><MenuIcon /></IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, display: { xs: 'none', md: 'block' }, fontSize: '0.8rem' }}>Dashboard /</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
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
              <MenuItem onClick={() => { i18n.changeLanguage('pt-BR'); setLangAnchorEl(null); }} sx={{ fontSize: '0.875rem' }}>🇧🇷 Português</MenuItem>
              <MenuItem onClick={() => { i18n.changeLanguage('en'); setLangAnchorEl(null); }} sx={{ fontSize: '0.875rem' }}>🇺🇸 English</MenuItem>
              <MenuItem onClick={() => { i18n.changeLanguage('es'); setLangAnchorEl(null); }} sx={{ fontSize: '0.875rem' }}>🇪🇸 Español</MenuItem>
            </Menu>

            <IconButton onClick={colorMode.toggleColorMode} size="small" sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
              {theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>

            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5, ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, border: `2px solid ${theme.palette.background.paper}` }}>
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
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate(ROUTES.PROFILE); }} sx={{ fontSize: '0.875rem' }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                {t('common.profile')}
              </MenuItem>
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate(`${ROUTES.PROFILE}?tab=workspaces`); }} sx={{ fontSize: '0.875rem' }}>
                <ListItemIcon><BusinessIcon fontSize="small" /></ListItemIcon>
                {t('common.workspaces')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: theme.palette.error.main, fontSize: '0.875rem' }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon>
                {t('common.logout')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box component="nav" sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s' }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent" open
          sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: currentDrawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden !important',
              overflowY: 'hidden !important',
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`
            } 
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 2, sm: 3 }, 
        width: { sm: `calc(100% - ${currentDrawerWidth}px)` }, 
        mt: '64px', 
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflowY: 'auto !important',
        overflowX: 'hidden !important',
        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.01)
      }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
