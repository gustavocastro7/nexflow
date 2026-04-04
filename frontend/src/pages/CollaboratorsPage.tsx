import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Skeleton,
  alpha, useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import type { Workspace } from '../types';
import { useNotification } from '../context/NotificationContext';

interface Collaborator {
  id: string;
  name: string;
  external_id: string;
  email: string;
  department: string;
  workspace_id: string;
}

const CollaboratorsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const { t } = useTranslation();
  const theme = useTheme();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    external_id: '',
    email: '',
    department: ''
  });

  useEffect(() => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      const ws = wsData ? JSON.parse(wsData) as Workspace : null;
      if (ws && ws?.id) {
        setActiveWorkspace(ws);
      }
    } catch (e: unknown) {
      console.error('Error parsing activeWorkspace');
    }
  }, []);

  const fetchCollaborators = useCallback(async (isSilent = false) => {
    if (!activeWorkspace?.id) return;
    if (!isSilent) setLoading(true);
    
    try {
      const response = await apiClient.get<Collaborator[]>(`/collaborators?workspaceId=${activeWorkspace.id}`);
      setCollaborators(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      showError('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeWorkspace?.id, showError]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleOpen = (collaborator?: Collaborator) => {
    if (collaborator) {
      setEditingCollaborator(collaborator);
      setFormData({
        name: collaborator.name,
        external_id: collaborator.external_id || '',
        email: collaborator.email || '',
        department: collaborator.department || ''
      });
    } else {
      setEditingCollaborator(null);
      setFormData({ name: '', external_id: '', email: '', department: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    if (!activeWorkspace?.id) {
      showError('Workspace não selecionado');
      return;
    }
    try {
      if (editingCollaborator) {
        await apiClient.put(`/collaborators/${editingCollaborator.id}`, formData);
        showSuccess('Colaborador atualizado com sucesso');
      } else {
        await apiClient.post('/collaborators', { ...formData, workspace_id: activeWorkspace.id });
        showSuccess('Colaborador criado com sucesso');
      }
      fetchCollaborators(true); // Silent refresh
      handleClose();
    } catch (err) {
      console.error('Error saving collaborator:', err);
      showError('Erro ao salvar colaborador');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      try {
        await apiClient.delete(`/collaborators/${id}`);
        showSuccess('Colaborador removido com sucesso');
        fetchCollaborators(true); // Silent refresh
      } catch (err) {
        console.error('Error deleting collaborator:', err);
        showError('Erro ao excluir colaborador');
      }
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {t('sidebar.collaborators')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie os colaboradores do seu workspace.
            {loading && !isInitialLoad && <Typography component="span" variant="caption" color="primary" sx={{ ml: 2, fontWeight: 700 }}>Atualizando...</Typography>}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Novo Colaborador
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Matrícula</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoad ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="90%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                  <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell>
                </TableRow>
              ))
            ) : collaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              collaborators.map((c) => (
                <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>{c.external_id || '-'}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>{c.department || '-'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => handleOpen(c)} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(c.id)} color="error" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nome Completo"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
            <TextField
              label="Matrícula / ID Externo"
              fullWidth
              value={formData.external_id}
              onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            />
            <TextField
              label="E-mail"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Departamento"
              fullWidth
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name} sx={{ px: 4 }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaboratorsPage;
