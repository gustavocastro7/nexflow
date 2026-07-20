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
import { ColorModeContext, useNotification } from '../providers';
import { apiGet, apiPut, apiPost, apiDelete } from '../../lib/api/client';
import type { Workspace, User } from '../types';

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ py: 4 }}>{children}</Box>}</div>;
}

function ProfilePage() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
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
  const [selectedLanguage, setSelectedLanguage] = useState('pt-BR');
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
      setSelectedLanguage(configData.language || 'pt-BR');
      setSelectedThemeMode(configData.theme_mode || 'light');
      setSelectedMenuBehavior(configData.menu_behavior || 'collapsible');
      if (theme.palette.mode !== configData.theme_mode) colorMode.toggleColorMode();
    } catch (err) { console.error('Error fetching user config:', err); setError('Erro ao carregar configurações'); }
  }, [user?.id, theme.palette.mode, colorMode]);

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
    } catch { setError('Erro ao carregar perfil'); }
    finally { setLoading(false); }
  }, [user?.id, fetchWorkspaces, fetchUserConfig]);

  useEffect(() => { fetchData(); const tab = searchParams.get('tab'); if (tab === 'preferences') setTabValue(1); if (tab === 'workspaces') setTabValue(2); }, [fetchData, searchParams]);

  const updateBackendConfig = async (updates: Record<string, string>) => {
    if (!user?.id) return;
    try {
      await apiPut('/user/config', updates);
      const currentUser = getUser();
      if (currentUser?.config) { const updatedConfig = { ...currentUser.config, ...updates }; sessionStorage.setItem('user', JSON.stringify({ ...currentUser, config: updatedConfig })); }
    } catch { setError('Erro ao salvar preferências'); }
  };

  const handleLanguageChange = (code: string) => { setSelectedLanguage(code); updateBackendConfig({ language: code }); };
  const handleThemeToggle = (mode: 'light' | 'dark') => { if (theme.palette.mode !== mode) { colorMode.toggleColorMode(); setSelectedThemeMode(mode); updateBackendConfig({ theme_mode: mode }); } };
  const handleMenuBehaviorChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value as 'always_open' | 'hover' | 'collapsible'; setSelectedMenuBehavior(val); updateBackendConfig({ menu_behavior: val }); };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    try { const data = await apiPut(`/users/${user.id}`, { name, email }); sessionStorage.setItem('user', JSON.stringify(data)); setSuccess('Perfil atualizado com sucesso'); }
    catch { setError('Erro ao salvar perfil'); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) { setError('Senhas não conferem'); return; }
    try { await apiPut(`/users/${user.id}/change-password`, { currentPassword, newPassword }); setSuccess('Senha alterada com sucesso'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    catch { setError('Erro ao alterar senha'); }
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
      setSuccess('Workspace salvo com sucesso');
    } catch { setError('Erro ao salvar workspace'); }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este workspace?')) {
      try { await apiDelete(`/workspaces/${id}`); setSuccess('Workspace excluído'); await fetchWorkspaces(); } catch { setError('Erro ao excluir workspace'); }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4 }}><Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Perfil</Typography><Typography variant="body1" color="textSecondary">Gerencie suas informações e preferências.</Typography></Box>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2, '& .MuiTab-root': { py: 3, fontWeight: 700 } }}>
            <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Meu Perfil" />
            <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Preferências" />
            <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Workspaces" />
          </Tabs>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Informações Básicas</Typography>
                <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label="Nome Completo" value={name || ''} onChange={(e) => setName(e.target.value)} />
                  <TextField fullWidth label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>Salvar Perfil</Button>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Segurança</Typography>
                <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField fullWidth label="Senha Atual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <Divider />
                  <TextField fullWidth label="Nova Senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <TextField fullWidth label="Confirmar Senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button type="submit" variant="outlined" size="large" sx={{ alignSelf: 'flex-start', px: 4 }}>Alterar Senha</Button>
                </Box>
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <List sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}><LanguageIcon color="primary" sx={{ fontSize: 28 }} /></ListItemIcon>
                <ListItemText primary="Idioma" secondary="Selecione o idioma do sistema" slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 180 }}>
                  <Select value={selectedLanguage} onChange={(e) => handleLanguageChange(e.target.value as string)} sx={{ borderRadius: 2 }}>
                    <MenuItem value="pt-BR">Português</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
              <Divider component="li" />
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}>{theme.palette.mode === 'dark' ? <DarkModeIcon color="primary" sx={{ fontSize: 28 }} /> : <LightModeIcon color="primary" sx={{ fontSize: 28 }} />}</ListItemIcon>
                <ListItemText primary="Tema" secondary={theme.palette.mode === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo'} slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>Claro</Typography>
                  <Switch checked={theme.palette.mode === 'dark'} onChange={() => handleThemeToggle(theme.palette.mode === 'dark' ? 'light' : 'dark')} color="primary" />
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>Escuro</Typography>
                </Stack>
              </ListItem>
              <Divider component="li" />
              <ListItem sx={{ py: 3, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 56 }}><SettingsIcon color="primary" sx={{ fontSize: 28 }} /></ListItemIcon>
                <ListItemText primary="Comportamento do Menu" secondary="Define como o menu lateral se comporta" slotProps={{ primary: { sx: { fontWeight: 700, variant: 'subtitle1' } } }} />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 220 }}>
                  <Select value={selectedMenuBehavior} onChange={(e) => { const v = e.target.value as 'always_open' | 'hover' | 'collapsible'; setSelectedMenuBehavior(v); updateBackendConfig({ menu_behavior: v }); }} sx={{ borderRadius: 2 }}>
                    <MenuItem value="always_open">Sempre aberto</MenuItem><MenuItem value="hover">Abrir ao passar o mouse</MenuItem><MenuItem value="collapsible">Recolhível</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box><Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Gerenciar Workspaces</Typography><Typography variant="body2" color="textSecondary">Visualize e gerencie os workspaces do sistema.</Typography></Box>
              {user?.profile === 'jedi' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWSDialog()}>Novo Workspace</Button>}
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableRow>
                    <TableCell padding="checkbox" align="center" sx={{ fontWeight: 700 }}>Ativo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell><TableCell sx={{ fontWeight: 700 }}>Schema</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workspaces.map((ws) => (
                    <TableRow key={ws.id} hover selected={activeWS?.id === ws.id}>
                      <TableCell padding="checkbox" align="center"><Radio checked={activeWS?.id === ws.id} onChange={() => handleSelectWorkspace(ws)} size="small" /></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ws.name}</TableCell><TableCell><code>{ws.schema_name}</code></TableCell>
                      <TableCell><Box sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700, bgcolor: (ws as any).status === 'active' ? alpha('#10B981', 0.1) : alpha('#F59E0B', 0.1), color: (ws as any).status === 'active' ? '#10B981' : '#F59E0B', textTransform: 'uppercase' }}>{(ws as any).status === 'active' ? 'Ativo' : 'Inativo'}</Box></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Ativar"><IconButton size="small" color="primary" onClick={() => handleSelectWorkspace(ws)}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                          {user?.profile === 'jedi' && <>
                            <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenWSDialog(ws)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => handleDeleteWorkspace(ws.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workspaces.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Nenhum workspace encontrado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Box>
      </Paper>

      <Dialog open={wsDialogOpen} onClose={() => { setWsDialogOpen(false); setEditingWS(null); setWsLogo(null); setWsLogoFile(null); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingWS ? 'Editar Workspace' : 'Novo Workspace'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField label="Nome" fullWidth value={wsFormData.name} onChange={(e) => setWsFormData({ ...wsFormData, name: e.target.value })} placeholder="Ex: Nexflow Matriz" />
            {!editingWS && <TextField label="Schema" fullWidth value={wsFormData.schema_name} onChange={(e) => setWsFormData({ ...wsFormData, schema_name: e.target.value })} placeholder="Ex: nexflow_matriz" helperText="Nome único para o banco de dados (sem espaços)" />}
            {editingWS && <TextField select label="Status" fullWidth value={wsFormData.status} onChange={(e) => setWsFormData({ ...wsFormData, status: e.target.value })}><MenuItem value="active">Ativo</MenuItem><MenuItem value="inactive">Inativo</MenuItem></TextField>}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Logo</Typography>
              {wsLogo ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box component="img" src={wsLogo} alt="Logo preview" sx={{ width: 80, height: 80, borderRadius: 2, objectFit: 'contain', border: '1px solid', borderColor: 'divider', p: 0.5 }} />
                  <Button size="small" color="error" startIcon={<DeleteForeverIcon />} onClick={() => { setWsLogo(null); setWsLogoFile(null); }}>Remove</Button>
                </Box>
              ) : (
                <Button component="label" variant="outlined" startIcon={<ImageIcon />} sx={{ color: 'text.secondary', borderColor: 'divider' }}>
                  Upload Logo
                  <input type="file" accept="image/*" hidden onChange={handleWsLogoSelect} />
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}><Button onClick={() => { setWsDialogOpen(false); setEditingWS(null); setWsLogo(null); setWsLogoFile(null); }} color="inherit">Cancelar</Button><Button onClick={handleSaveWorkspace} variant="contained" sx={{ px: 4 }} disabled={!wsFormData.name || (!editingWS && !wsFormData.schema_name)}>Salvar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>Carregando...</Box>}>
      <ProfilePage />
    </Suspense>
  );
}
