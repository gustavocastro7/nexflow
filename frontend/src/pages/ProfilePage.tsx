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
  Radio
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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from '../context/ColorModeContext';
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

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const userRes = await apiClient.get<User>(`/users/${user.id}`);
      setName(userRes.data.name || '');
      setEmail(userRes.data.email || '');

      await fetchWorkspaces();
      
      const wsData = sessionStorage.getItem('activeWorkspace');
      const current = wsData ? JSON.parse(wsData) as Workspace : null;
      setActiveWS(current);
    } catch (err: unknown) {
      console.error('ProfilePage: Fetch error', err);
      setError(t('profile.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t, fetchWorkspaces]);

  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'workspaces') setTabValue(1);
    if (tab === 'preferences') setTabValue(2);
  }, [fetchData]);

  const updateBackendConfig = async (updates: { theme_mode?: string, language?: string }) => {
    if (!user?.id) return;
    try {
      await apiClient.put(`/users/${user.id}/config`, updates);
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
      sessionStorage.setItem('user', JSON.stringify(res.data));
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      setError('Erro ao atualizar perfil');
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
      setError('Erro ao alterar senha');
    }
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    sessionStorage.setItem('activeWorkspace', JSON.stringify(ws));
    setActiveWS(ws);
    if (user?.id) {
        apiClient.put(`/users/${user.id}/config`, { last_workspace_id: ws.id }).catch(() => {});
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
        setSuccess('Workspace atualizado com sucesso!');
      } else {
        await apiClient.post('/workspaces', {
          name: wsFormData.name,
          schema_name: wsFormData.schema_name
        });
        setSuccess('Workspace criado com sucesso!');
      }
      await fetchWorkspaces();
      handleCloseWSDialog();
    } catch (err: unknown) {
      setError('Erro ao salvar workspace');
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este workspace? Esta ação é irreversível.')) {
      try {
        await apiClient.delete(`/workspaces/${id}`);
        setSuccess('Workspace excluído com sucesso!');
        await fetchWorkspaces();
      } catch (err: unknown) {
        setError('Erro ao excluir workspace');
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
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Configurações de Conta</Typography>
        <Typography variant="body1" color="textSecondary">
          Gerencie sua segurança, preferências e acesso aos ambientes.
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
            <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Meu Perfil" />
            <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Workspaces" />
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Preferências" />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          {/* Tab 0: Profile */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Informações Básicas</Typography>
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label="Nome Completo" value={name || ''} onChange={(e) => setName(e.target.value)} />
                  <TextField fullWidth label="Endereço de E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    Salvar Perfil
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Segurança da Conta</Typography>
                <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label="Senha Atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <Divider />
                  <TextField fullWidth label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <TextField fullWidth label="Confirmar Nova Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button type="submit" variant="outlined" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>
                    Alterar Senha
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Workspaces (Unified) */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Gerenciar Ambientes</Typography>
                <Typography variant="body2" color="textSecondary">
                  Selecione o ambiente ativo ou gerencie os workspaces disponíveis.
                </Typography>
              </Box>
              {user?.profile === 'jedi' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWSDialog()}>
                  Novo Workspace
                </Button>
              )}
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableRow>
                    <TableCell padding="checkbox" align="center" sx={{ fontWeight: 700 }}>Ativo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nome do Workspace</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Schema</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
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
                        }}>{(ws as any).status || 'active'}</Box>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Selecionar Workspace">
                            <IconButton size="small" color="primary" onClick={() => handleSelectWorkspace(ws)}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {user?.profile === 'jedi' && (
                            <>
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleOpenWSDialog(ws)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
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
                        Nenhum workspace encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 2: Preferences */}
          <TabPanel value={tabValue} index={2}>
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
                    <Button variant={theme.palette.mode === 'light' ? 'contained' : 'outlined'} onClick={() => handleThemeToggle('light')} sx={{ borderRadius: 2, flex: 1, py: 1.5 }} startIcon={<LightModeIcon />}> Modo Claro </Button>
                    <Button variant={theme.palette.mode === 'dark' ? 'contained' : 'outlined'} onClick={() => handleThemeToggle('dark')} sx={{ borderRadius: 2, flex: 1, py: 1.5 }} startIcon={<DarkModeIcon />}> Modo Escuro </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>

      {/* Workspace Management Dialog */}
      <Dialog open={wsDialogOpen} onClose={handleCloseWSDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingWS ? 'Editar Workspace' : 'Novo Workspace'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField label="Nome do Workspace" fullWidth value={wsFormData.name} onChange={(e) => setWsFormData({ ...wsFormData, name: e.target.value })} placeholder="Ex: Nexflow Matriz" />
            {!editingWS && (
              <TextField label="Database Schema" fullWidth value={wsFormData.schema_name} onChange={(e) => setWsFormData({ ...wsFormData, schema_name: e.target.value })} placeholder="Ex: nexflow_matriz" helperText="Nome único para o banco de dados (sem espaços)" />
            )}
            {editingWS && (
              <TextField select label="Status" fullWidth value={wsFormData.status} onChange={(e) => setWsFormData({ ...wsFormData, status: e.target.value })}>
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="inactive">Inativo</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseWSDialog} color="inherit">Cancelar</Button>
          <Button onClick={handleSaveWorkspace} variant="contained" sx={{ px: 4 }} disabled={!wsFormData.name || (!editingWS && !wsFormData.schema_name)}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Import needed icons that were missing in the component before
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default ProfilePage;
