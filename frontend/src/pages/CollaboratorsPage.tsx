import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Alert, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import type { Workspace } from '../types';

interface Collaborator {
  id: string;
  name: string;
  external_id: string;
  email: string;
  department: string;
  workspace_id: string;
}

const CollaboratorsPage: React.FC = () => {
  const { t } = useTranslation();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const fetchCollaborators = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const response = await apiClient.get<Collaborator[]>(`/collaborators?workspaceId=${activeWorkspace.id}`);
      setCollaborators(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      setError('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

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
      setError('Workspace não selecionado');
      return;
    }
    try {
      if (editingCollaborator) {
        await apiClient.put(`/collaborators/${editingCollaborator.id}`, formData);
      } else {
        await apiClient.post('/collaborators', { ...formData, workspace_id: activeWorkspace.id });
      }
      fetchCollaborators();
      handleClose();
    } catch (err) {
      console.error('Error saving collaborator:', err);
      setError('Erro ao salvar colaborador');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      try {
        await apiClient.delete(`/collaborators/${id}`);
        fetchCollaborators();
      } catch (err) {
        console.error('Error deleting collaborator:', err);
        setError('Erro ao excluir colaborador');
      }
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            {t('sidebar.collaborators')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie os colaboradores do seu workspace.
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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ID Externo (Matrícula)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Departamento</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : collaborators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              collaborators.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>{c.external_id || '-'}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>{c.department || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(c)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(c.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
            />
            <TextField
              label="ID Externo (Ex: Matrícula)"
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
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaboratorsPage;
