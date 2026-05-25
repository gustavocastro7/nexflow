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
  History as HistoryIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FileUpload as FileUploadIcon,
  SwitchAccount as SwitchAccountIcon
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
  const [isHovered, setIsHovered] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [wsMenuAnchorEl, setWsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [menuBehavior, setMenuBehavior] = useState<'always_open' | 'hover' | 'collapsible'>('collapsible');

  // Determine if the drawer should be expanded
  const isDrawerExpanded = useMemo(() => {
    if (isMobile) return true; // Mobile always expanded when open
    if (menuBehavior === 'always_open') return true;
    if (menuBehavior === 'hover') return isHovered;
    return !isCollapsed; // collapsible behavior
  }, [isMobile, menuBehavior, isHovered, isCollapsed]);

  const currentDrawerWidth = isMobile ? DRAWER_WIDTH : (isDrawerExpanded ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH);

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

      setUser(parsedUser);
      
      // Fetch user config including menu_behavior
      try {
        const configRes = await apiClient.get('/user/config');
        if (configRes.data.menu_behavior) {
          setMenuBehavior(configRes.data.menu_behavior);
        }
      } catch (err) {
        console.error('Error fetching user config', err);
      }

      // Fetch workspaces for the menu
      let wsList: Workspace[] = [];
      try {
        const response = await apiClient.get<Workspace[]>(`/workspaces/user/${parsedUser.id}`);
        wsList = Array.isArray(response.data) ? response.data : [];
        setWorkspaces(wsList);
      } catch (err: unknown) {
        console.error('Error loading workspaces in menu', err);
      }

      // Always refresh active workspace from fresh API data
      if (parsedWS) {
        const freshWS = wsList.find(w => w.id === parsedWS.id);
        if (freshWS) {
          sessionStorage.setItem('activeWorkspace', JSON.stringify(freshWS));
          setActiveWorkspace(freshWS);
        } else {
          setActiveWorkspace(parsedWS);
        }
      } else {
        let selected: Workspace | null = null;
        const lastId = localStorage.getItem(`lastWorkspace_${parsedUser.id}`);
        if (lastId) {
          selected = wsList.find(w => w.id === lastId) || null;
        }
        if (!selected && wsList.length > 0) {
          selected = wsList[0];
        }
        if (selected) {
          sessionStorage.setItem('activeWorkspace', JSON.stringify(selected));
          setActiveWorkspace(selected);
        }
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
  const handleProfileMenuClose = () => { setAnchorEl(null); setWsMenuAnchorEl(null); };

  const handleWorkspaceSelect = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    if (user?.id) {
      localStorage.setItem(`lastWorkspace_${user.id}`, ws.id);
      apiClient.put(`/users/${user.id}/config`, { last_workspace_id: ws.id }).catch(() => {});
    }
    setAnchorEl(null);
    setWsMenuAnchorEl(null);
    window.location.reload();
  };

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

    if (user?.profile === 'jedi') {
      items.push({ text: t('sidebar.audit') || 'Auditoria', icon: <HistoryIcon />, path: ROUTES.AUDIT });
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
    <Box 
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden !important' }}
      onMouseEnter={() => menuBehavior === 'hover' && setIsHovered(true)}
      onMouseLeave={() => menuBehavior === 'hover' && setIsHovered(false)}
    >
      <Toolbar sx={{ 
        px: !isDrawerExpanded ? 2 : 3, 
        py: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: !isDrawerExpanded ? 'center' : 'flex-start',
        gap: 2,
        transition: 'all 0.3s',
        minHeight: { xs: 64, sm: !isDrawerExpanded ? 70 : 80 }
      }}>
        <Box 
          component="img"
          src={activeWorkspace?.logo || '/logo.jpg'}
          alt={activeWorkspace?.name || 'Logo'}
          sx={{ 
            width: !isDrawerExpanded ? 36 : 44, 
            height: !isDrawerExpanded ? 36 : 44, 
            borderRadius: 1.5, 
            objectFit: 'contain',
            bgcolor: 'white',
            p: 0.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
            transition: 'all 0.3s'
          }}
        />
        {isDrawerExpanded && (
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            {activeWorkspace?.name || 'teleen'}
          </Typography>
        )}
      </Toolbar>
      
      <Box sx={{ px: 2, mb: 1 }}>
        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center' }}>
          {!isDrawerExpanded && (
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
            <Tooltip title={!isDrawerExpanded ? item.text : ''} placement="right">
              <ListItemButton 
                onClick={() => { navigate(item.path); if(isMobile) setMobileOpen(false); }}
                selected={location.pathname === item.path}
                sx={{ 
                  py: 0.75,
                  justifyContent: !isDrawerExpanded ? 'center' : 'flex-start',
                  px: !isDrawerExpanded ? 1 : 1.5,
                  borderRadius: 1,
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: !isDrawerExpanded ? 0 : 35, 
                  color: location.pathname === item.path ? theme.palette.primary.main : theme.palette.text.secondary,
                  justifyContent: 'center'
                }}>
                  {React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: '1.2rem' } })}
                </ListItemIcon>
                {isDrawerExpanded && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontSize: '1rem', fontWeight: location.pathname === item.path ? 700 : 500, noWrap: true }} 
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Box 
        onClick={handleProfileMenuOpen}
        sx={{ 
          p: 1.5, 
          mt: 'auto', 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`, 
          overflow: 'hidden !important',
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.02) },
          transition: 'background-color 0.2s'
        }}
      >
        {!isDrawerExpanded ? (
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
                {activeWorkspace?.logo && (
                  <Box
                    component="img"
                    src="/logo.jpg"
                    alt="teleen"
                    sx={{ width: 28, height: 28, borderRadius: 0.5, objectFit: 'contain', bgcolor: 'white', p: 0.3 }}
                  />
                )}
                <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.9rem' }}>
                  {user.name?.charAt(0) || '?'}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name || 'User'}</Typography>
                  <Typography variant="caption" noWrap sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>{user.profile}</Typography>
                </Box>
              </Box>
            </Paper>
          ) : null
        )}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: !isDrawerExpanded ? 'left' : 'center', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: !isDrawerExpanded ? 'right' : 'center', vertical: 'top' }}
        PaperProps={{ sx: { minWidth: 180, mb: 1, borderRadius: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
      >
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate(ROUTES.PROFILE); }} sx={{ fontSize: '0.8rem' }}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          {t('common.profile')}
        </MenuItem>
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate(ROUTES.COLLABORATORS, { state: { openCSVImport: true } }); }} sx={{ fontSize: '0.8rem' }}>
          <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>
          Importar CSV
        </MenuItem>
        {user?.profile === 'jedi' && (
          <>
            <Divider />
            <MenuItem
              onClick={(e) => setWsMenuAnchorEl(e.currentTarget)}
              sx={{ fontSize: '0.8rem' }}
            >
              <ListItemIcon><SwitchAccountIcon fontSize="small" /></ListItemIcon>
              Set Workspace
            </MenuItem>
            <Menu
              anchorEl={wsMenuAnchorEl}
              open={Boolean(wsMenuAnchorEl)}
              onClose={() => setWsMenuAnchorEl(null)}
              anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
              transformOrigin={{ horizontal: 'left', vertical: 'top' }}
              PaperProps={{ sx: { minWidth: 180, borderRadius: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
            >
              {workspaces.map((ws) => (
                <MenuItem
                  key={ws.id}
                  selected={ws.id === activeWorkspace?.id}
                  onClick={() => handleWorkspaceSelect(ws)}
                  sx={{ fontSize: '0.8rem' }}
                >
                  <ListItemIcon>
                    <BusinessIcon fontSize="small" sx={{ opacity: ws.id === activeWorkspace?.id ? 1 : 0.4 }} />
                  </ListItemIcon>
                  {ws.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
        <Divider />
        <MenuItem onClick={() => { handleProfileMenuClose(); handleLogout(); }} sx={{ color: theme.palette.error.main, fontSize: '0.8rem' }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon>
          {t('common.logout')}
        </MenuItem>
      </Menu>

      <Box sx={{ p: 1.5, pt: 0 }}>
        {!isMobile && menuBehavior === 'collapsible' && (
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
            {!isDrawerExpanded ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', bgcolor: theme.palette.background.default, overflow: 'hidden' }}>
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
        p: { xs: 1, sm: 2 }, 
        width: { sm: `calc(100% - ${currentDrawerWidth}px)` }, 
        mt: 0, 
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
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
