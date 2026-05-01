import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  useTheme,
  Tabs,
  Tab,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
  Tooltip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Select,
  InputLabel,
  Switch
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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from '../context/ColorModeContext';
import {ROUTES} from '../routes/routes';
import apiClient from '../api/client';
import type { Workspace, User } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ py: 4 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // User profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // User preferences state
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR');
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark'>('light');
  const [selectedMenuBehavior, setSelectedMenuBehavior] = useState<'always_open' | 'hover' | 'collapsible'>('collapsible');

  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWS, setActiveWS] = useState<Workspace | null>(null);
  
  // Workspace management dialog state
  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [editingWS, setEditingWS] = useState<Workspace | null>(null);
  const [wsFormData, setWsFormData] = useState({
    name: '',
    schema_name: '',
    status: 'active'
  });

  const getUser = (): User | null => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (e: unknown) {
      return null;
    }
  };
  const user = getUser();

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    try {
      // If jedi, fetch all workspaces. If user, fetch only theirs.
      const endpoint = user.profile === 'jedi' ? '/workspaces' : `/workspaces/user/${user.id}`;
      const response = await apiClient.get<Workspace[]>(endpoint);
      setWorkspaces(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error('Error fetching workspaces:', err);
    }
  }, [user?.id, user?.profile]);

  const fetchUserConfig = useCallback(async () => {
    if (!user?.id) return;
    try {
      const configResponse = await apiClient.get<{
        theme_mode: 'light' | 'dark';
        language: string;
        last_workspace_id: string | null;
        menu_behavior: 'always_open' | 'hover' | 'collapsible';
        last_login: Date;
      }>(`/user/config`);
      
      setSelectedLanguage(configResponse.data.language);
      setSelectedThemeMode(configResponse.data.theme_mode);
      setSelectedMenuBehavior(configResponse.data.menu_behavior);
      
      // Apply theme mode immediately if it differs from current
      if (theme.palette.mode !== configResponse.data.theme_mode) {
        colorMode.toggleColorMode();
      }
      // Change language immediately
      if (i18n.language !== configResponse.data.language) {
        i18n.changeLanguage(configResponse.data.language);
      }
      
    } catch (err: unknown) {
      console.error('Error fetching user config:', err);
      setError(t('profile.error_loading_config'));
    }
  }, [user?.id, t, colorMode.toggleColorMode, i18n.language, i18n.changeLanguage, theme.palette.mode]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const userRes = await apiClient.get<User>(`/users/${user.id}`);
      setName(userRes.data.name || '');
      setEmail(userRes.data.email || '');

      await fetchWorkspaces();
      await fetchUserConfig(); // Fetch user preferences

      const wsData = sessionStorage.getItem('activeWorkspace');
      const current = wsData ? JSON.parse(wsData) as Workspace : null;
      setActiveWS(current);
    } catch (err: unknown) {
      console.error('ProfilePage: Fetch error', err);
      setError(t('profile.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t, fetchWorkspaces, fetchUserConfig]);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'preferences') setTabValue(1);
    if (tab === 'workspaces') setTabValue(2);
  }, [fetchData]);

  const updateBackendConfig = async (updates: { theme_mode?: string, language?: string, menu_behavior?: string }) => {
    if (!user?.id) return;
    try {
      await apiClient.put(`/user/config`, updates); // Use the new /user/config endpoint
      // Update local user state in sessionStorage if needed, but it's often better to re-fetch or rely on context
      const currentUser = getUser();
      if (currentUser && currentUser.config) {
          const updatedConfig = { ...currentUser.config, ...updates };
          const updatedUser = { ...currentUser, config: updatedConfig };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to sync config with backend', err);
      setError(t('profile.error_saving_preferences'));
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setSelectedLanguage(code); // Update local state
    updateBackendConfig({ language: code });
  };

  const handleThemeToggle = (mode: 'light' | 'dark') => {
    if (theme.palette.mode !== mode) {
      colorMode.toggleColorMode();
      setSelectedThemeMode(mode); // Update local state
      updateBackendConfig({ theme_mode: mode });
    }
  };

  const handleMenuBehaviorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = (event.target as HTMLInputElement).value as 'always_open' | 'hover' | 'collapsible';
    setSelectedMenuBehavior(value); // Update local state
    updateBackendConfig({ menu_behavior: value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    try {
      const res = await apiClient.put<User>(`/users/${user.id}`, { name, email });
      sessionStorage.setItem('user', JSON.stringify(res.data));
      setSuccess(t('profile.profile_updated'));
    } catch (err: unknown) {
      setError(t('profile.error_saving_profile'));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwords_dont_match'));
      return;
    }
    try {
      await apiClient.put(`/users/${user.id}/change-password`, {
        currentPassword,
        newPassword
      });
      setSuccess(t('profile.password_changed'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setError(t('profile.error_changing_password'));
    }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    setActiveWS(ws);
    if (user?.id) {
        // Update last_workspace_id in user config
        apiClient.put(`/user/config`, { last_workspace_id: ws.id }).catch((err) => {
            console.error('Failed to update last workspace ID:', err);
            setError(t('profile.error_updating_last_workspace'));
        });
    }
    window.location.reload(); 
  };

  const handleOpenWSDialog = (ws: Workspace | null = null) => {
    setEditingWS(ws);
    setWsFormData({
      name: ws ? ws.name : '',
      schema_name: ws ? ws.schema_name : '',
      status: (ws as any)?.status || 'active'
    });
    setWsDialogOpen(true);
  };

  const handleCloseWSDialog = () => {
    setWsDialogOpen(false);
    setEditingWS(null);
  };

  const handleSaveWorkspace = async () => {
    try {
      if (editingWS) {
        await apiClient.put(`/workspaces/${editingWS.id}`, {
          name: wsFormData.name,
          status: wsFormData.status
        });
        setSuccess(t('profile.workspace_saved'));
      } else {
        await apiClient.post('/workspaces', {
          name: wsFormData.name,
          schema_name: wsFormData.schema_name
        });
        setSuccess(t('profile.workspace_saved'));
      }
      await fetchWorkspaces();
      handleCloseWSDialog();
    } catch (err: unknown) {
      setError(t('profile.error_saving_workspace'));
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (window.confirm(t('profile.delete_workspace_confirm'))) {
      try {
        await apiClient.delete(`/workspaces/${id}`);
        setSuccess(t('profile.workspace_deleted'));
        await fetchWorkspaces();
      } catch (err: unknown) {
        setError(t('profile.error_deleting_workspace'));
      }
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth={false}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{t('profile.title')}</Typography>
        <Typography variant="body1" color="textSecondary">
          {t('profile.subtitle')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ px: 2, '& .MuiTab-root': { py: 3, fontWeight: 700 } }}
          >
            <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label={t('profile.my_profile')} />
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label={t('profile.preferences')} />
            <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('profile.workspaces')} />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          {/* Tab 0: Profile */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{t('profile.basic_info')}</Typography>
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label={t('profile.full_name')} value={name || ''} onChange={(e) => setName(e.target.value)} />
                  <TextField fullWidth label={t('common.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    {t('profile.save_profile')}
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{t('profile.security')}</Typography>
                <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label={t('profile.current_password')} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <Divider />
                  <TextField fullWidth label={t('profile.new_password')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <TextField fullWidth label={t('profile.confirm_password')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button type="submit" variant="outlined" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    {t('profile.change_password')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Preferences */}
          <TabPanel value={tabValue} index={1}>
            <List sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
              {/* Language Selection */}
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}>
                  <LanguageIcon color="primary" sx={{ fontSize: 28 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={t('profile.language')} 
                  secondary={t('profile.language_description')} 
                  primaryTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
                  <Select
                    value={i18n.language}
                    onChange={(e) => handleLanguageChange(e.target.value as string)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="pt-BR">🇧🇷 Português</MenuItem>
                    <MenuItem value="en">🇺🇸 English</MenuItem>
                    <MenuItem value="es">🇪🇸 Español</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>

              <Divider component="li" />

              {/* Theme Mode Selection */}
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}>
                  {theme.palette.mode === 'dark' ? <DarkModeIcon color="primary" sx={{ fontSize: 28 }} /> : <LightModeIcon color="primary" sx={{ fontSize: 28 }} />}
                </ListItemIcon>
                <ListItemText 
                  primary={t('profile.theme')} 
                  secondary={theme.palette.mode === 'dark' ? t('profile.theme_dark_desc') : t('profile.theme_light_desc')}
                  primaryTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                />
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>{t('profile.light')}</Typography>
                  <Switch 
                    checked={theme.palette.mode === 'dark'}
                    onChange={() => handleThemeToggle(theme.palette.mode === 'dark' ? 'light' : 'dark')}
                    color="primary"
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>{t('profile.dark')}</Typography>
                </Stack>
              </ListItem>

              <Divider component="li" />

              {/* Menu Behavior Selection */}
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}>
                  <SettingsIcon color="primary" sx={{ fontSize: 28 }} />
                </ListItemIcon>
                <ListItemText 
                  primary={t('profile.menu_behavior')} 
                  secondary={t('profile.menu_behavior_description')} 
                  primaryTypographyProps={{ fontWeight: 700, variant: 'subtitle1' }}
                />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 220 }}>
                  <Select
                    value={selectedMenuBehavior}
                    onChange={(e) => {
                      const val = e.target.value as 'always_open' | 'hover' | 'collapsible';
                      setSelectedMenuBehavior(val);
                      updateBackendConfig({ menu_behavior: val });
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="always_open">{t('profile.menu_always_open')}</MenuItem>
                    <MenuItem value="hover">{t('profile.menu_hover')}</MenuItem>
                    <MenuItem value="collapsible">{t('profile.menu_collapsible')}</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </TabPanel>

          {/* Tab 2: Workspaces (Unified) */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{t('profile.manage_workspaces')}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('profile.manage_workspaces_desc')}
                </Typography>
              </Box>
              {user?.profile === 'jedi' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWSDialog()}>
                  {t('profile.new_workspace')}
                </Button>
              )}
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableRow>
                    <TableCell padding="checkbox" align="center" sx={{ fontWeight: 700 }}>{t('profile.active_col')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('profile.workspace_name_col')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('profile.schema_col')}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{t('profile.actions_col')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workspaces.map((ws) => (
                    <TableRow key={ws.id} hover selected={activeWS?.id === ws.id}>
                      <TableCell padding="checkbox" align="center">
                        <Radio
                          checked={activeWS?.id === ws.id}
                          onChange={() => handleSelectWorkspace(ws)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ws.name}</TableCell>
                      <TableCell><code>{ws.schema_name}</code></TableCell>
                      <TableCell>
                        <Box sx={{ 
                          display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: (ws as any).status === 'active' ? alpha('#10B981', 0.1) : alpha('#F59E0B', 0.1),
                          color: (ws as any).status === 'active' ? '#10B981' : '#F59E0B',
                          textTransform: 'uppercase'
                        }}>{(ws as any).status === 'active' ? t('common.active') : t('common.inactive')}</Box>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title={t('common.active_workspace')}>
                            <IconButton size="small" color="primary" onClick={() => handleSelectWorkspace(ws)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {user?.profile === 'jedi' && (
                            <>
                              <Tooltip title={t('common.edit')}>
                                <IconButton size="small" onClick={() => handleOpenWSDialog(ws)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.delete')}>
                                <IconButton size="small" color="error" onClick={() => handleDeleteWorkspace(ws.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workspaces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        {t('workspaces.no_workspaces')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>

      {/* Workspace Management Dialog */}
      <Dialog open={wsDialogOpen} onClose={handleCloseWSDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingWS ? t('profile.edit_workspace') : t('profile.new_workspace')}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField label={t('profile.workspace_name_col')} fullWidth value={wsFormData.name} onChange={(e) => setWsFormData({ ...wsFormData, name: e.target.value })} placeholder="Ex: Nexflow Matriz" />
            {!editingWS && (
              <TextField label={t('profile.schema_col')} fullWidth value={wsFormData.schema_name} onChange={(e) => setWsFormData({ ...wsFormData, schema_name: e.target.value })} placeholder="Ex: nexflow_matriz" helperText="Nome único para o banco de dados (sem espaços)" />
            )}
            {editingWS && (
              <TextField select label={t('common.status')} fullWidth value={wsFormData.status} onChange={(e) => setWsFormData({ ...wsFormData, status: e.target.value })}>
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="inactive">{t('common.inactive')}</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseWSDialog} color="inherit">{t('common.cancel')}</Button>
          <Button onClick={handleSaveWorkspace} variant="contained" sx={{ px: 4 }} disabled={!wsFormData.name || (!editingWS && !wsFormData.schema_name)}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;
