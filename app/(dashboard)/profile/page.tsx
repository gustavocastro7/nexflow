'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert, CircularProgress, Divider,
  useTheme, Tabs, Tab, alpha, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Stack,
  Tooltip, Radio, Switch, List, ListItem, ListItemText, ListItemIcon, Select, FormControl,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ImageIcon from '@mui/icons-material/Image';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ColorModeContext, useNotification } from '@/app/providers';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api/client';
import type { Workspace, User } from '@/app/types';
import { useLanguage } from '@/app/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, type Language } from '@/app/i18n/dictionaries';

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ py: 4 }}>{children}</Box>}</div>;
}

function ProfilePage() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { t, language, setLanguage } = useLanguage();
  const { showError, showSuccess } = useNotification();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark'>('light');
  const [selectedMenuBehavior, setSelectedMenuBehavior] = useState<'always_open' | 'hover' | 'collapsible'>('collapsible');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWS, setActiveWS] = useState<Workspace | null>(null);
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [editingWS, setEditingWS] = useState<Workspace | null>(null);
  const [wsFormData, setWsFormData] = useState({ name: '', schema_name: '', status: 'active' });
  const [wsLogo, setWsLogo] = useState<string | null>(null);
  const [wsLogoFile, setWsLogoFile] = useState<File | null>(null);

  const getUser = (): User | null => { try { const d = sessionStorage.getItem('user'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const user = getUser();

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      const endpoint = user.profile === 'jedi' ? '/workspaces' : `/workspaces/user/${user.id}`;
      const data = await apiGet(endpoint);
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Error fetching workspaces:', err); }
  }, [user?.id, user?.profile]);

  const fetchUserConfig = useCallback(async () => {
    if (!user?.id) return;
    try {
      const configData = await apiGet('/user/config');
      if (SUPPORTED_LANGUAGES.includes(configData.language)) setLanguage(configData.language as Language);
      setSelectedThemeMode(configData.theme_mode || 'light');
      setSelectedMenuBehavior(configData.menu_behavior || 'collapsible');
      if (theme.palette.mode !== configData.theme_mode) colorMode.toggleColorMode();
    } catch (err) { console.error('Error fetching user config:', err); setError(t('profile.loadConfigError')); }
  }, [user?.id, theme.palette.mode, colorMode, setLanguage, t]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const userData = await apiGet(`/users/${user.id}`);
      setName(userData.name || '');
      setEmail(userData.email || '');
      await fetchWorkspaces();
      await fetchUserConfig();
      const wsData = sessionStorage.getItem('activeWorkspace');
      setActiveWS(wsData ? JSON.parse(wsData) : null);
    } catch { setError(t('profile.loadProfileError')); }
    finally { setLoading(false); }
  }, [user?.id, fetchWorkspaces, fetchUserConfig, t]);

  useEffect(() => { fetchData(); const tab = searchParams.get('tab'); if (tab === 'preferences') setTabValue(1); if (tab === 'workspaces') setTabValue(2); }, [fetchData, searchParams]);

  const updateBackendConfig = async (updates: Record<string, string>) => {
    if (!user?.id) return;
    try {
      await apiPut('/user/config', updates);
      const currentUser = getUser();
      if (currentUser?.config) { const updatedConfig = { ...currentUser.config, ...updates }; sessionStorage.setItem('user', JSON.stringify({ ...currentUser, config: updatedConfig })); }
    } catch { setError(t('profile.savePreferencesError')); }
  };

  const handleLanguageChange = (code: Language) => { setLanguage(code); updateBackendConfig({ language: code }); };
  const handleThemeToggle = (mode: 'light' | 'dark') => { if (theme.palette.mode !== mode) { colorMode.toggleColorMode(); setSelectedThemeMode(mode); updateBackendConfig({ theme_mode: mode }); } };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    try { const data = await apiPut(`/users/${user.id}`, { name, email }); sessionStorage.setItem('user', JSON.stringify(data)); setSuccess(t('profile.profileUpdateSuccess')); }
    catch { setError(t('profile.profileSaveError')); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) { setError(t('profile.passwordsDontMatch')); return; }
    try { await apiPut(`/users/${user.id}/change-password`, { currentPassword, newPassword }); setSuccess(t('profile.passwordChangeSuccess')); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    catch { setError(t('profile.passwordChangeError')); }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    setActiveWS(ws);
    if (user?.id) apiPut('/user/config', { last_workspace_id: ws.id }).catch(() => {});
    window.location.reload();
  };

  const handleOpenWSDialog = (ws: Workspace | null = null) => {
    setEditingWS(ws);
    setWsFormData({ name: ws ? ws.name : '', schema_name: ws ? ws.schema_name : '', status: (ws as any)?.status || 'active' });
    setWsLogo(ws ? (ws.logo || null) : null);
    setWsLogoFile(null);
    setWsDialogOpen(true);
  };

  const handleWsLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWsLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setWsLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveWorkspace = async () => {
    try {
      let saved;
      if (editingWS) {
        const data = await apiPut(`/workspaces/${editingWS.id}`, { name: wsFormData.name, status: wsFormData.status, logo: wsLogo });
        saved = data;
      } else {
        const data = await apiPost('/workspaces', { name: wsFormData.name, schema_name: wsFormData.schema_name, logo: wsLogo });
        saved = data;
      }
      const currentActive = sessionStorage.getItem('activeWorkspace');
      if (currentActive) { const parsed = JSON.parse(currentActive); if (parsed.id === saved.id) sessionStorage.setItem('activeWorkspace', JSON.stringify(saved)); }
      await fetchWorkspaces();
      setWsDialogOpen(false); setEditingWS(null); setWsLogo(null); setWsLogoFile(null);
      setSuccess(t('profile.workspaceSaveSuccess'));
    } catch { setError(t('profile.workspaceSaveError')); }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (window.confirm(t('profile.workspaceDeleteConfirm'))) {
      try { await apiDelete(`/workspaces/${id}`); setSuccess(t('profile.workspaceDeleted')); await fetchWorkspaces(); } catch { setError(t('profile.workspaceDeleteError')); }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4 }}><Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{t('sidebar.profile')}</Typography><Typography variant="body1" color="textSecondary">{t('profile.subtitle')}</Typography></Box>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2, '& .MuiTab-root': { py: 3, fontWeight: 700 } }}>
            <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label={t('profile.tabMyProfile')} />
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label={t('profile.tabPreferences')} />
            <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('profile.tabWorkspaces')} />
          </Tabs>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{t('profile.basicInfo')}</Typography>
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label={t('collaborators.fullName')} value={name || ''} onChange={(e) => setName(e.target.value)} />
                  <TextField fullWidth label={t('common.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>{t('profile.saveProfile')}</Button>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{t('profile.security')}</Typography>
                <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label={t('profile.currentPassword')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <Divider />
                  <TextField fullWidth label={t('profile.newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <TextField fullWidth label={t('profile.confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button type="submit" variant="outlined" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>{t('profile.changePassword')}</Button>
                </Box>
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <List sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}><LanguageIcon color="primary" sx={{ fontSize: 28 }} /></ListItemIcon>
                <ListItemText primary={t('profile.language')} secondary={t('profile.selectSystemLanguage')} slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
                  <Select value={language} onChange={(e) => handleLanguageChange(e.target.value as Language)} sx={{ borderRadius: 2 }}>
                    <MenuItem value="pt-BR">Português</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
              <Divider component="li" />
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}>{theme.palette.mode === 'dark' ? <DarkModeIcon color="primary" sx={{ fontSize: 28 }} /> : <LightModeIcon color="primary" sx={{ fontSize: 28 }} />}</ListItemIcon>
                <ListItemText primary={t('profile.theme')} secondary={theme.palette.mode === 'dark' ? t('profile.darkModeActive') : t('profile.lightModeActive')} slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>{t('profile.light')}</Typography>
                  <Switch checked={theme.palette.mode === 'dark'} onChange={() => handleThemeToggle(theme.palette.mode === 'dark' ? 'light' : 'dark')} color="primary" />
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>{t('profile.dark')}</Typography>
                </Stack>
              </ListItem>
              <Divider component="li" />
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}><SettingsIcon color="primary" sx={{ fontSize: 28 }} /></ListItemIcon>
                <ListItemText primary={t('profile.menuBehavior')} secondary={t('profile.menuBehaviorDesc')} slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 220 }}>
                  <Select value={selectedMenuBehavior} onChange={(e) => { const v = e.target.value as 'always_open' | 'hover' | 'collapsible'; setSelectedMenuBehavior(v); updateBackendConfig({ menu_behavior: v }); }} sx={{ borderRadius: 2 }}>
                    <MenuItem value="always_open">{t('profile.alwaysOpen')}</MenuItem><MenuItem value="hover">{t('profile.onHover')}</MenuItem><MenuItem value="collapsible">{t('profile.collapsible')}</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{t('profile.manageWorkspaces')}</Typography><Typography variant="body2" color="textSecondary">{t('profile.manageWorkspacesDesc')}</Typography></Box>
              {user?.profile === 'jedi' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWSDialog()}>{t('profile.newWorkspace')}</Button>}
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableRow>
                    <TableCell padding="checkbox" align="center" sx={{ fontWeight: 700 }}>{t('profile.activeCol')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('common.name')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('profile.schemaCol')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workspaces.map((ws) => (
                    <TableRow key={ws.id} hover selected={activeWS?.id === ws.id}>
                      <TableCell padding="checkbox" align="center"><Radio checked={activeWS?.id === ws.id} onChange={() => handleSelectWorkspace(ws)} size="small" /></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ws.name}</TableCell><TableCell><code>{ws.schema_name}</code></TableCell>
                      <TableCell><Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700, bgcolor: (ws as any).status === 'active' ? alpha('#10B981', 0.1) : alpha('#F59E0B', 0.1), color: (ws as any).status === 'active' ? '#10B981' : '#F59E0B', textTransform: 'uppercase' }}>{(ws as any).status === 'active' ? t('common.active') : t('common.inactive')}</Box></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title={t('profile.activate')}><IconButton size="small" color="primary" onClick={() => handleSelectWorkspace(ws)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                          {user?.profile === 'jedi' && <>
                            <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => handleOpenWSDialog(ws)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title={t('common.delete')}><IconButton size="small" color="error" onClick={() => handleDeleteWorkspace(ws.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workspaces.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>{t('profile.noWorkspacesFound')}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>

      <Dialog open={wsDialogOpen} onClose={() => { setWsDialogOpen(false); setEditingWS(null); setWsLogo(null); setWsLogoFile(null); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingWS ? t('profile.editWorkspace') : t('profile.newWorkspace')}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField label={t('common.name')} fullWidth value={wsFormData.name} onChange={(e) => setWsFormData({ ...wsFormData, name: e.target.value })} placeholder={t('profile.workspaceNamePlaceholder')} />
            {!editingWS && <TextField label={t('profile.schemaLabel')} fullWidth value={wsFormData.schema_name} onChange={(e) => setWsFormData({ ...wsFormData, schema_name: e.target.value })} placeholder={t('profile.schemaPlaceholder')} helperText={t('profile.schemaHelper')} />}
            {editingWS && <TextField select label={t('common.status')} fullWidth value={wsFormData.status} onChange={(e) => setWsFormData({ ...wsFormData, status: e.target.value })}><MenuItem value="active">{t('common.active')}</MenuItem><MenuItem value="inactive">{t('common.inactive')}</MenuItem></TextField>}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>{t('profile.logo')}</Typography>
              {wsLogo ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box component="img" src={wsLogo} alt="Logo preview" sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'contain', border: '1px solid', borderColor: 'divider', p: 0.5 }} />
                  <Button size="small" color="error" startIcon={<DeleteForeverIcon />} onClick={() => { setWsLogo(null); setWsLogoFile(null); }}>{t('profile.removeLogo')}</Button>
                </Box>
              ) : (
                <Button component="label" variant="outlined" startIcon={<ImageIcon />} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
                  {t('profile.uploadLogo')}
                  <input type="file" accept="image/*" hidden onChange={handleWsLogoSelect} />
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}><Button onClick={() => { setWsDialogOpen(false); setEditingWS(null); setWsLogo(null); setWsLogoFile(null); }} color="inherit">{t('common.cancel')}</Button><Button onClick={handleSaveWorkspace} variant="contained" sx={{ px: 4 }} disabled={!wsFormData.name || (!editingWS && !wsFormData.schema_name)}>{t('common.save')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export default function ProfilePageWrapper() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>{t('common.loading')}</Box>}>
      <ProfilePage />
    </Suspense>
  );
}
