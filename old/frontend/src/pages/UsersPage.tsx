import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Alert,
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
  TextField,
  Chip,
  alpha,
  useTheme,
  Tooltip,
  Stack,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import apiClient from '../api/client';
import { useNotification } from '../context/NotificationContext';
import type { Workspace, User } from '../types';

const UsersPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<'user' | 'admin' | 'jedi'>('user');

  const getLoggedUser = (): User | null => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (_e: unknown) {
      return null;
    }
  };

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch (_e: unknown) {
      return null;
    }
  };

  const loggedUser = getLoggedUser();
  const activeWorkspace = getActiveWorkspace();

  const isAdmin = loggedUser?.profile === 'admin' || loggedUser?.profile === 'jedi';

  const fetchUsers = useCallback(async (isSilent = false) => {
    if (!activeWorkspace?.id) return;
    if (!isSilent) setLoading(true); 
    setError('');
    try {
      const response = await apiClient.get<User[]>(`/users?workspaceId=${activeWorkspace.id}&includeInactive=${showInactive}`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao carregar usuários';
      showError(msg);
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeWorkspace?.id, showInactive, showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpen = (user: User | null = null) => {
    if (!isAdmin) return;
    setError('');
    setCurrentUser(user);
    setName(user ? user.name : '');
    setEmail(user ? user.email : '');
    setPassword('');
    setProfile(user ? user.profile : 'user');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentUser(null);
    setError('');
  };

  const handleSave = async () => {
    if (!isAdmin || !activeWorkspace?.id) return;
    setError('');
    try {
      if (currentUser) {
        await apiClient.put(`/users/${currentUser.id}`, {
          name,
          email,
          profile: profile,
        });
        showSuccess('Usuário atualizado com sucesso');
      } else {
        await apiClient.post('/users', {
          name,
          email,
          password,
          profile: profile,
          workspaceId: activeWorkspace.id
        });
        showSuccess('Usuário criado e associado ao workspace');
      }
      fetchUsers(true); // Silent refresh
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar usuário';
      showError(msg);
      setError(msg);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!isAdmin) return;
    setError('');
    if (window.confirm('Tem certeza que deseja desativar este usuário?')) {
      try {
        await apiClient.delete(`/users/${id}`);
        showSuccess('Usuário desativado com sucesso');
        fetchUsers(true); // Silent refresh
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Erro ao desativar usuário';
        showError(msg);
        setError(msg);
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!isAdmin) return;
    setError('');
    try {
      await apiClient.put(`/users/${user.id}`, {
        active: !user.active
      });
      showSuccess(user.active ? 'Usuário desativado' : 'Usuário ativado');
      fetchUsers(true); // Silent refresh
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao alterar status do usuário';
      showError(msg);
      setError(msg);
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Usuários</Typography>
          <Typography variant="body1" color="textSecondary">
            Gerencie os usuários do workspace e suas permissões.
            {loading && !isInitialLoad && <Typography component="span" variant="caption" color="primary" sx={{ ml: 2, fontWeight: 700 }}>Atualizando...</Typography>}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch 
                checked={showInactive} 
                onChange={(e) => setShowInactive(e.target.checked)} 
              />
            }
            label="Mostrar Inativos"
          />
          {isAdmin && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpen()}
              size="large"
            >
              Novo Usuário
            </Button>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ overflow: 'hidden', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Perfil</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              {isAdmin && <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoad ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="90%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                  {isAdmin && <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell>}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                  <Typography variant="body1">Nenhum usuário encontrado.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover sx={{ opacity: user.active === false ? 0.6 : 1, '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.profile === 'jedi' ? 'Jedi' : (user.profile === 'admin' ? 'Admin' : 'Usuário')} 
                      size="small" 
                      color={user.profile === 'jedi' ? 'secondary' : (user.profile === 'admin' ? 'primary' : 'default')}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {user.active !== false ? (
                        <>
                          <CheckCircleIcon color="success" fontSize="small" />
                          <Typography variant="body2" color="success.main">Ativo</Typography>
                        </>
                      ) : (
                        <>
                          <CancelIcon color="error" fontSize="small" />
                          <Typography variant="body2" color="error.main">Inativo</Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Editar">
                          <IconButton 
                            onClick={() => handleOpen(user)} 
                            size="small" 
                            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {user.active !== false ? (
                          <Tooltip title="Desativar">
                            <IconButton 
                              onClick={() => handleDeactivate(user.id)} 
                              size="small" 
                              sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Ativar">
                            <IconButton 
                              onClick={() => handleToggleActive(user)} 
                              size="small" 
                              sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>
          {currentUser ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              autoFocus label="Nome Completo"
              fullWidth value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="E-mail"
              fullWidth type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            {!currentUser && (
              <TextField
                label="Senha"
                fullWidth type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <FormControl fullWidth>
              <InputLabel id="profile-label">Perfil</InputLabel>
              <Select
                labelId="profile-label"
                value={profile}
                label="Perfil"
                onChange={(e) => setProfile(e.target.value as any)}
              >
                <MenuItem value="user">Usuário</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="jedi">Jedi</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" size="large" sx={{ px: 4 }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersPage;
