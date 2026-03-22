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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Tabs,
  Tab,
  alpha,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from '../context/ColorModeContext';
import WorkspaceManagement from '../components/profile/WorkspaceManagement';
import { ROUTES } from '../routes/routes';
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
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
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
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWS, setActiveWS] = useState<Workspace | null>(null);

  const getUser = (): User | null => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (e: unknown) {
      return null;
    }
  };
  const user = getUser();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      console.log('ProfilePage: Fetching user and workspaces for', user.id);
      const userRes = await apiClient.get<User>(`/users/${user.id}`);
      setName(userRes.data.name || '');
      setEmail(userRes.data.email || '');

      const wsRes = await apiClient.get<Workspace[]>(`/workspaces/user/${user.id}`);
      const wsDataList = Array.isArray(wsRes.data) ? wsRes.data : [];
      console.log('ProfilePage: Workspaces fetched:', wsDataList.length);
      setWorkspaces(wsDataList);
      
      const wsData = sessionStorage.getItem('activeWorkspace');
      const current = wsData ? JSON.parse(wsData) as Workspace : null;
      setActiveWS(current);
    } catch (err: unknown) {
      console.error('ProfilePage: Fetch error', err);
      setError(t('profile.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'workspaces') setTabValue(1);
    if (tab === 'preferences') setTabValue(2);
    if (tab === 'management' && user?.profile === 'jedi') setTabValue(3);
  }, [user?.profile, fetchData]);

  const updateBackendConfig = async (updates: { theme_mode?: string, language?: string }) => {
    if (!user?.id) return;
    try {
      await apiClient.put(`/users/${user.id}/config`, updates);
      // Update local session user to keep it in sync
      const updatedUser = { ...user, config: { ...user.config, ...updates } };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed to sync config with backend', err);
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    updateBackendConfig({ language: code });
  };

  const handleThemeToggle = (mode: 'light' | 'dark') => {
    if (theme.palette.mode !== mode) {
      colorMode.toggleColorMode();
      updateBackendConfig({ theme_mode: mode });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    try {
      const res = await apiClient.put<User>(`/users/${user.id}`, { name, email });
      // Save updated user object (English keys from backend)
      sessionStorage.setItem('user', JSON.stringify(res.data));
      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Erro ao atualizar perfil');
      } else {
        setError('Erro ao atualizar perfil');
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    try {
      await apiClient.put(`/users/${user.id}/change-password`, {
        currentPassword,
        newPassword
      });
      setSuccess('Senha alterada com sucesso!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Erro ao alterar senha');
      } else {
        setError('Erro ao alterar senha');
      }
    }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    setActiveWS(ws);
    // Sync with backend
    if (user?.id) {
        apiClient.put(`/users/${user.id}/config`, { last_workspace_id: ws.id }).catch(() => {});
    }
    setSuccess(`Workspace changed to ${ws.name}`);
    window.location.reload(); 
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth={false}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Account Settings</Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your security, preferences and access to environments.
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
            <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="My Profile" />
            <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Workspaces" />
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Preferences" />
            {user?.profile === 'jedi' && (
              <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Jedi Administration" />
            )}
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Basic Information</Typography>
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    fullWidth label="Full Name"
                    value={name || ''} onChange={(e) => setName(e.target.value)}
                  />
                  <TextField
                    fullWidth label="Email Address"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    Save Profile
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Account Security</Typography>
                <Box component="form" onSubmit="{handleChangePassword}" sx="{{ display: 'flex', flexDirection: 'column', gap: 3 }}">
                  <TextField
                    fullWidth label="Current Password" type="password"
                    value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Divider />
                  <TextField
                    fullWidth label="New Password" type="password"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <TextField
                    fullWidth label="Confirm New Password" type="password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button type="submit" variant="outlined" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    Change Password
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Your Environments</Typography>
              <Typography variant="body2" color="textSecondary">
                {user?.profile === 'jedi' 
                  ? 'Select the company you wish to manage at this moment.' 
                  : 'Your current work environment.'}
              </Typography>
            </Box>
            
            {user?.profile === 'jedi' ? (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                  {workspaces.map((ws, index) => (
                    <React.Fragment key={ws.id}>
                      {index > 0 && <Divider />}
                      <ListItemButton 
                        selected={activeWS?.id === ws.id}
                        onClick={() => handleSelectWorkspace(ws)}
                        sx={{ 
                          py: 2, 
                          px: 3,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.12),
                            }
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 48 }}>
                          <Box 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              borderRadius: '50%', 
                              border: `2px solid ${activeWS?.id === ws.id ? theme.palette.primary.main : theme.palette.divider}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            {activeWS?.id === ws.id && (
                              <Box 
                                sx={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: '50%', 
                                  bgcolor: theme.palette.primary.main 
                                }} 
                              />
                            )}
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: activeWS?.id === ws.id ? 700 : 500 }}>
                              {ws.name || ''}
                            </Typography>
                          }
                          secondary={ws.schema_name}
                          secondaryTypographyProps={{ 
                            sx: { 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5
                            } 
                          }}
                        />
                        {activeWS?.id === ws.id && (
                          <Chip 
                            label="ATIVO" 
                            size="small" 
                            color="primary" 
                            sx={{ fontWeight: 800, borderRadius: 1.5, height: 24 }} 
                          />
                        )}
                      </ListItemButton>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {workspaces.map((ws) => (
                  <Grid item xs={12} sm={6} md={4} key={ws.id}>
                    <Card 
                      component={ListItemButton}
                      selected={activeWS?.id === ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      sx={{ 
                        p: 0,
                        height: '100%',
                        transition: 'all 0.2s',
                        border: activeWS?.id === ws.id ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                        bgcolor: activeWS?.id === ws.id ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[4],
                          bgcolor: activeWS?.id === ws.id ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.text.primary, 0.02),
                        }
                      }}
                    >
                      <CardContent sx={{ p: 3, width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ 
                            p: 1.5, borderRadius: 2, 
                            bgcolor: activeWS?.id === ws.id ? theme.palette.primary.main : alpha(theme.palette.text.primary, 0.05),
                            color: activeWS?.id === ws.id ? 'white' : theme.palette.text.secondary
                          }}>
                            <BusinessIcon />
                          </Box>
                          {activeWS?.id === ws.id && (
                            <Chip 
                              label="ATIVO" 
                              size="small" 
                              color="primary" 
                              icon={<CheckCircleIcon />} 
                              sx={{ fontWeight: 800, borderRadius: 1.5 }} 
                            />
                          )}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{ws.name || ''}</Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                          {ws.schema_name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Preferências do Sistema</Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <LanguageIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Idioma / Language</Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {[
                      { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
                      { code: 'en', label: 'English', flag: '🇺🇸' },
                      { code: 'es', label: 'Español', flag: '🇪🇸' }
                    ].map((lang) => (
                      <Button
                        key={lang.code}
                        variant={i18n.language === lang.code ? 'contained' : 'outlined'}
                        onClick={() => handleLanguageChange(lang.code)}
                        sx={{ borderRadius: 2, px: 3 }}
                        startIcon={<span>{lang.flag}</span>}
                      >
                        {lang.label}
                      </Button>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    {theme.palette.mode === 'dark' ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tema Visual / Theme Mode</Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant={theme.palette.mode === 'light' ? 'contained' : 'outlined'}
                      onClick={() => handleThemeToggle('light')}
                      sx={{ borderRadius: 2, flex: 1, py: 1.5 }}
                      startIcon={<LightModeIcon />}
                    >
                      Modo Claro
                    </Button>
                    <Button
                      variant={theme.palette.mode === 'dark' ? 'contained' : 'outlined'}
                      onClick={() => handleThemeToggle('dark')}
                      sx={{ borderRadius: 2, flex: 1, py: 1.5 }}
                      startIcon={<DarkModeIcon />}
                    >
                      Modo Escuro
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {user?.profile === 'jedi' && (
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  startIcon={<SettingsIcon />} 
                  onClick={() => navigate(ROUTES.ADMIN_ROLES)}
                  sx={{ borderRadius: 2 }}
                >
                  Gerenciar Papéis (Roles)
                </Button>
              </Box>
              <WorkspaceManagement />
            </TabPanel>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
