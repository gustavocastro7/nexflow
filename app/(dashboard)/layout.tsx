'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Drawer, Toolbar, List, Typography, Divider, IconButton, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem,
  useMediaQuery, alpha, CircularProgress, Paper, Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon, Business as BusinessIcon,
  Receipt as ReceiptIcon, AccountTree as AccountTreeIcon,
  Person as PersonIcon, People as PeopleIcon,
  Logout as LogoutIcon, Assessment as AssessmentIcon,
  History as HistoryIcon, ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon, SwitchAccount as SwitchAccountIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../providers';
import { useContext } from 'react';
import { apiGet, apiPut } from '../../lib/api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, type Language } from '../i18n/dictionaries';

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 88;

interface Workspace {
  id: string;
  name: string;
  schema_name: string;
  status: string;
  logo?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
}

const menuItems = (profile: string | undefined, t: (key: string) => string) => {
  const items = [
    { text: t('sidebar.dashboard'), icon: <DashboardIcon />, path: '/dashboard' },
    { text: t('sidebar.costCenters'), icon: <AccountTreeIcon />, path: '/cost-centers' },
    { text: t('sidebar.collaborators'), icon: <PeopleIcon />, path: '/collaborators' },
    { text: t('sidebar.invoices'), icon: <ReceiptIcon />, path: '/invoices' },
    { text: t('sidebar.reports'), icon: <AssessmentIcon />, path: '/reports' },
  ];

  if (profile === 'admin' || profile === 'jedi') {
    items.push({ text: t('sidebar.users'), icon: <PeopleIcon />, path: '/users' });
  }
  if (profile === 'jedi') {
    items.push({ text: t('sidebar.audit'), icon: <HistoryIcon />, path: '/audit' });
  }
  return items;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { t, setLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [wsMenuAnchorEl, setWsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuBehavior, setMenuBehavior] = useState<'always_open' | 'hover' | 'collapsible'>('collapsible');

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userStr = sessionStorage.getItem('user');
    const wsStr = sessionStorage.getItem('activeWorkspace');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as User;
      setUser(parsedUser);

      apiGet('/user/config').then((data) => {
        if (data.menu_behavior) setMenuBehavior(data.menu_behavior);
        if (SUPPORTED_LANGUAGES.includes(data.language)) setLanguage(data.language as Language);
      }).catch(() => {});

      apiGet(`/workspaces/user/${parsedUser.id}`).then((data) => {
        const wsList = Array.isArray(data) ? data : [];
        setWorkspaces(wsList);

        let selected: Workspace | null = null;
        if (wsStr) {
          const parsedWS = JSON.parse(wsStr) as Workspace;
          selected = wsList.find(w => w.id === parsedWS.id) || parsedWS;
          setActiveWorkspace(selected);
        } else {
          const lastId = localStorage.getItem(`lastWorkspace_${parsedUser.id}`);
          if (lastId) selected = wsList.find(w => w.id === lastId) || null;
          if (!selected && wsList.length > 0) selected = wsList[0];
          if (selected) {
            sessionStorage.setItem('activeWorkspace', JSON.stringify(selected));
            setActiveWorkspace(selected);
          }
        }
      }).catch(() => {
        if (wsStr) {
          try { setActiveWorkspace(JSON.parse(wsStr)); } catch {}
        }
      });

      setIsLoading(false);
    } catch {
      sessionStorage.clear();
      router.push('/login');
    }
  }, [router]);

  const isDrawerExpanded = useMemo(() => {
    if (isMobile) return true;
    if (menuBehavior === 'always_open') return true;
    if (menuBehavior === 'hover') return isHovered;
    return !isCollapsed;
  }, [isMobile, menuBehavior, isHovered, isCollapsed]);

  const currentDrawerWidth = isMobile ? DRAWER_WIDTH : (isDrawerExpanded ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };

  const handleWorkspaceSelect = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    if (user?.id) {
      localStorage.setItem(`lastWorkspace_${user.id}`, ws.id);
      apiPut(`/users/${user.id}/config`, { last_workspace_id: ws.id }).catch(() => {});
    }
    setAnchorEl(null);
    setWsMenuAnchorEl(null);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  const items = menuItems(user?.profile, t);

  const drawer = (
    <Box
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onMouseEnter={() => menuBehavior === 'hover' && setIsHovered(true)}
      onMouseLeave={() => menuBehavior === 'hover' && setIsHovered(false)}
    >
      <Toolbar sx={{
        px: !isDrawerExpanded ? 2 : 3, py: 1, display: 'flex', alignItems: 'center',
        justifyContent: !isDrawerExpanded ? 'center' : 'flex-start', gap: 2,
        transition: 'all 0.3s', minHeight: { xs: 64, sm: !isDrawerExpanded ? 70 : 80 }
      }}>
        <Box
          component="img"
          src={activeWorkspace?.logo || '/logo.jpg'}
          alt={activeWorkspace?.name || 'Logo'}
          sx={{ width: !isDrawerExpanded ? 36 : 44, height: !isDrawerExpanded ? 36 : 44, borderRadius: 1.5, objectFit: 'contain', bgcolor: 'white', p: 0.5 }}
        />
        {isDrawerExpanded && (
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            {activeWorkspace?.name || 'Nexflow'}
          </Typography>
        )}
      </Toolbar>

      <Divider sx={{ mx: 2, mb: 0.5, opacity: 0.5 }} />

      <List sx={{ px: 1.5, flexGrow: 1, overflow: 'hidden' }}>
        {items.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
            <Tooltip title={!isDrawerExpanded ? item.text : ''} placement="right">
              <ListItemButton
                onClick={() => { router.push(item.path); if (isMobile) setMobileOpen(false); }}
                selected={pathname === item.path}
                sx={{ py: 0.75, justifyContent: !isDrawerExpanded ? 'center' : 'flex-start', px: !isDrawerExpanded ? 1 : 1.5, borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: !isDrawerExpanded ? 0 : 35, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {isDrawerExpanded && (
                  <ListItemText primary={item.text} slotProps={{ primary: { sx: { fontSize: '1rem', fontWeight: pathname === item.path ? 700 : 500, whiteSpace: 'nowrap' } } }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 1.5, mt: 'auto', borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`, cursor: 'pointer' }}>
        {!isDrawerExpanded ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={user?.name || 'User'} placement="right">
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.8rem' }}>
                {user?.name?.charAt(0) || '?'}
              </Avatar>
            </Tooltip>
          </Box>
        ) : user ? (
          <Paper sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: '0.9rem' }}>
                {user.name?.charAt(0) || '?'}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</Typography>
                <Typography variant="caption" noWrap sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>{user.profile}</Typography>
              </Box>
            </Box>
          </Paper>
        ) : null}
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setWsMenuAnchorEl(null); }}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 1 } } }}>
        <MenuItem onClick={() => { setAnchorEl(null); router.push('/profile'); }} sx={{ fontSize: '0.8rem' }}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon> {t('sidebar.profile')}
        </MenuItem>
        {user?.profile === 'jedi' && (
          <>
            <Divider />
            <MenuItem onClick={(e) => { setWsMenuAnchorEl(e.currentTarget); }} sx={{ fontSize: '0.8rem' }}>
              <ListItemIcon><SwitchAccountIcon fontSize="small" /></ListItemIcon> {t('sidebar.setWorkspace')}
            </MenuItem>
            <Menu anchorEl={wsMenuAnchorEl} open={Boolean(wsMenuAnchorEl)} onClose={() => setWsMenuAnchorEl(null)}>
              {workspaces.map((ws) => (
                <MenuItem key={ws.id} selected={ws.id === activeWorkspace?.id} onClick={() => handleWorkspaceSelect(ws)} sx={{ fontSize: '0.8rem' }}>
                  <ListItemIcon><BusinessIcon fontSize="small" sx={{ opacity: ws.id === activeWorkspace?.id ? 1 : 0.4 }} /></ListItemIcon>
                  {ws.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); colorMode.toggleColorMode(); }} sx={{ fontSize: '0.8rem' }}>
          <ListItemIcon>{theme.palette.mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}</ListItemIcon>
          {theme.palette.mode === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }} sx={{ color: theme.palette.error.main, fontSize: '0.8rem' }}>
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} /></ListItemIcon> {t('sidebar.logout')}
        </MenuItem>
      </Menu>

      {!isMobile && menuBehavior === 'collapsible' && (
        <Box sx={{ p: 1.5, pt: 0 }}>
          <IconButton onClick={() => setIsCollapsed(!isCollapsed)} size="small" sx={{ width: '100%', borderRadius: 1, py: 0.25 }}>
            {!isDrawerExpanded ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', bgcolor: theme.palette.background.default, overflow: 'hidden' }}>
      <Box component="nav" sx={{ width: { sm: currentDrawerWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s' }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: currentDrawerWidth, transition: 'width 0.3s', overflowX: 'hidden', overflowY: 'hidden' } }}>
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{
        flexGrow: 1, p: { xs: 1, sm: 2 }, width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
        display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', overflowX: 'hidden'
      }}>
        {children}
      </Box>
    </Box>
  );
}
