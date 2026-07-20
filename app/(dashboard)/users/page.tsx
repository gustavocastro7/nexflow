'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, alpha, useTheme, Tooltip, Stack, Switch, FormControlLabel, Skeleton,
  MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { useNotification } from '@/app/providers';
import type { Workspace, User } from '@/app/types';
import { useLanguage } from '@/app/i18n/LanguageContext';

export default function UsersPage() {
  const { showError, showSuccess } = useNotification();
  const { t } = useLanguage();
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

  const getLoggedUser = (): User | null => { try { const d = sessionStorage.getItem('user'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const getActiveWorkspace = (): Workspace | null => { try { const d = sessionStorage.getItem('activeWorkspace'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const loggedUser = getLoggedUser();
  const activeWorkspace = getActiveWorkspace();
  const isAdmin = loggedUser?.profile === 'admin' || loggedUser?.profile === 'jedi';

  const fetchUsers = useCallback(async (isSilent = false) => {
    if (!activeWorkspace?.id) return;
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/users?workspaceId=${activeWorkspace.id}&includeInactive=${showInactive}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('users.loadError');
      showError(msg);
      setError(msg);
      setUsers([]);
    } finally { setLoading(false); setIsInitialLoad(false); }
  }, [activeWorkspace?.id, showInactive, showError, t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleOpen = (user: User | null = null) => {
    if (!isAdmin) return;
    setError(''); setCurrentUser(user); setName(user ? user.name : ''); setEmail(user ? user.email : '');
    setPassword(''); setProfile(user ? user.profile : 'user'); setOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin || !activeWorkspace?.id) return;
    setError('');
    try {
      if (currentUser) {
        await apiPut(`/users/${currentUser.id}`, { name, email, profile });
        showSuccess(t('users.updateSuccess'));
      } else {
        await apiPost('/users', { name, email, password, profile, workspaceId: activeWorkspace.id });
        showSuccess(t('users.createSuccess'));
      }
      fetchUsers(true);
      setOpen(false); setCurrentUser(null); setError('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || t('users.saveError');
      showError(msg); setError(msg);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm(t('users.deactivateConfirm'))) {
      try { await apiDelete(`/users/${id}`); showSuccess(t('users.deactivatedMsg')); fetchUsers(true); } catch { showError(t('users.deactivateError')); }
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!isAdmin) return;
    try { await apiPut(`/users/${user.id}`, { active: !user.active }); showSuccess(user.active ? t('users.deactivatedMsg') : t('users.activatedMsg')); fetchUsers(true); }
    catch { showError(t('users.statusChangeError')); }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{t('users.title')}</Typography>
          <Typography variant="body1" color="textSecondary">
            {t('users.subtitle')}
            {loading && !isInitialLoad && <Typography component="span" variant="caption" color="primary" sx={{ ml: 2, fontWeight: 700 }}>{t('collaborators.updating')}</Typography>}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControlLabel control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />} label={t('users.showInactive')} />
          {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} size="large">{t('users.newUser')}</Button>}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ overflow: 'hidden', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('common.name')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('common.email')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.profileCol')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
              {isAdmin && <TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoad ? [...Array(5)].map((_, i) => (
              <TableRow key={i}><TableCell><Skeleton variant="text" width="80%" /></TableCell><TableCell><Skeleton variant="text" width="90%" /></TableCell><TableCell><Skeleton variant="text" width="60%" /></TableCell><TableCell><Skeleton variant="text" width="70%" /></TableCell>{isAdmin && <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell>}</TableRow>
            )) : users.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 8, color: 'text.secondary' }}><Typography variant="body1">{t('users.noUsersFound')}</Typography></TableCell></TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id} hover sx={{ opacity: user.active === false ? 0.6 : 1 }}>
                <TableCell sx={{ fontWeight: 700 }}>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Chip label={user.profile === 'jedi' ? t('users.roleJedi') : (user.profile === 'admin' ? t('users.roleAdmin') : t('users.roleUser'))} size="small" color={user.profile === 'jedi' ? 'secondary' : (user.profile === 'admin' ? 'primary' : 'default')} variant="outlined" /></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {user.active !== false ? <><CheckCircleIcon color="success" fontSize="small" /><Typography variant="body2" color="success.main">{t('common.active')}</Typography></>
                    : <><CancelIcon color="error" fontSize="small" /><Typography variant="body2" color="error.main">{t('common.inactive')}</Typography></>}
                </Box></TableCell>
                {isAdmin && (
                  <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title={t('common.edit')}><IconButton onClick={() => handleOpen(user)} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      {user.active !== false ? (
                        <Tooltip title={t('users.deactivate')}><IconButton onClick={() => handleDeactivate(user.id)} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      ) : (
                        <Tooltip title={t('users.activate')}><IconButton onClick={() => handleToggleActive(user)} size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => { setOpen(false); setCurrentUser(null); setError(''); }} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>{currentUser ? t('users.editUser') : t('users.newUser')}</DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField autoFocus label={t('collaborators.fullName')} fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label={t('common.email')} fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {!currentUser && <TextField label={t('users.password')} fullWidth type="password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            <FormControl fullWidth>
              <InputLabel id="profile-label">{t('users.profileCol')}</InputLabel>
              <Select labelId="profile-label" value={profile} label={t('users.profileCol')} onChange={(e) => setProfile(e.target.value as any)}>
                <MenuItem value="user">{t('users.roleUser')}</MenuItem><MenuItem value="admin">{t('users.administrator')}</MenuItem><MenuItem value="jedi">{t('users.roleJedi')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}><Button onClick={() => { setOpen(false); setCurrentUser(null); setError(''); }} color="inherit" sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button><Button onClick={handleSave} variant="contained" size="large" sx={{ px: 4 }}>{t('common.save')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
