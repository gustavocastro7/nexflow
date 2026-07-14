import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Skeleton,
  alpha, useTheme, CircularProgress, Alert, Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  HelpOutline as HelpOutlineIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import type { Workspace, CSVImportPreview, CSVImportResult } from '../types';
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
  const location = useLocation();
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

  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvStep, setCsvStep] = useState<'select' | 'preview' | 'importing'>('select');
  const [pendingCSV, setPendingCSV] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVImportPreview | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CSVImportResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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

  useEffect(() => {
    if (location.state?.openCSVImport) {
      setCsvDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const handleCSVSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPendingCSV(content);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCSVPreview = async () => {
    if (!pendingCSV || !activeWorkspace?.id) return;

    setCsvStep('preview');
    setCsvError(null);
    setCsvPreview(null);

    try {
      const res = await apiClient.post<CSVImportPreview>('/collaborators/csv/preview', {
        content: pendingCSV,
        workspaceId: activeWorkspace.id,
      });
      setCsvPreview(res.data);
    } catch (err: any) {
      setCsvError(err.response?.data?.error || 'Erro ao validar CSV');
    }
  };

  const handleCSVImport = async () => {
    if (!pendingCSV || !activeWorkspace?.id) return;

    setCsvStep('importing');
    try {
      const res = await apiClient.post<CSVImportResult>('/collaborators/csv/import', {
        content: pendingCSV,
        workspaceId: activeWorkspace.id,
      });
      setCsvResult(res.data);
      fetchCollaborators(true);
    } catch (err: any) {
      setCsvError(err.response?.data?.error || 'Erro ao importar CSV');
      setCsvStep('preview');
    }
  };

  const handleCloseCSVDialog = () => {
    setCsvDialogOpen(false);
    setPendingCSV(null);
    setCsvPreview(null);
    setCsvError(null);
    setCsvResult(null);
    setCsvStep('select');
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
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => {
              setCsvStep('select');
              setCsvPreview(null);
              setCsvError(null);
              setCsvResult(null);
              setPendingCSV(null);
              setCsvDialogOpen(true);
            }}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Importar CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Novo Colaborador
          </Button>
        </Stack>
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

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onClose={handleCloseCSVDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {csvStep === 'select' && 'Importar Colaboradores (CSV)'}
          {csvStep === 'preview' && 'Relatório de Validação'}
          {csvStep === 'importing' && 'Importando...'}
        </DialogTitle>
        <DialogContent dividers>
          {csvStep === 'select' && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Selecione um arquivo CSV com as colunas: <strong>nr</strong> (telefone), <strong>nome</strong>, <strong>cpf</strong>, <strong>centro de custo</strong>.
                CPFs existentes serão atualizados. Centros de custo novos serão criados automaticamente.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  sx={{ py: 2, borderStyle: 'dashed', justifyContent: 'flex-start' }}
                >
                  {pendingCSV ? pendingCSV.substring(0, 50) + '...' : 'Selecionar arquivo CSV'}
                  <input type="file" hidden onChange={handleCSVSelect} />
                </Button>
                <IconButton onClick={() => setHelpOpen(true)} color="primary" sx={{ flexShrink: 0 }}>
                  <HelpOutlineIcon />
                </IconButton>
              </Box>
            </Stack>
          )}
          {csvStep === 'preview' && csvError && (
            <Alert severity="error" sx={{ mt: 1 }}>{csvError}</Alert>
          )}
          {csvStep === 'preview' && csvPreview && !csvError && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Relatório de Validação</Typography>
                <Stack direction="row" spacing={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{csvPreview.total}</Typography>
                    <Typography variant="caption">Registros</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{csvPreview.toCreate}</Typography>
                    <Typography variant="caption">Criar</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#3B82F6', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#3B82F6' }}>{csvPreview.toUpdate}</Typography>
                    <Typography variant="caption">Atualizar</Typography>
                  </Box>
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>Centros de custo existentes: {csvPreview.costCentersFound}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#E11D48' }}>Novos CCs: {csvPreview.costCentersToCreate}</Typography>
                </Box>
              </Box>
              {csvPreview.costCentersToCreateNames.length > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  CCs a criar: {csvPreview.costCentersToCreateNames.join(', ')}
                </Typography>
              )}
              {csvPreview.invalidCount > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#E11D48', mb: 1 }}>
                    Linhas ignoradas ({csvPreview.invalidCount}):
                  </Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: alpha('#E11D48', 0.03), borderRadius: 1, p: 1 }}>
                    {csvPreview.invalidRows.slice(0, 10).map((item, idx) => (
                      <Box key={idx} sx={{ mb: 0.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Linha {item.row}:</Typography>
                        {item.errors.map((err, ei) => (
                          <Typography key={ei} variant="caption" sx={{ display: 'block', color: '#E11D48', ml: 1 }}>- {err}</Typography>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
          {csvStep === 'importing' && csvResult && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700, mb: 2 }}>
                Importação concluída!
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>{csvResult.collaboratorsCreated}</strong> colaboradores criados,
                  <strong> {csvResult.collaboratorsUpdated}</strong> atualizados
                </Typography>
                <Typography variant="body2">
                  <strong>{csvResult.costCentersCreated}</strong> centros de custo criados
                  {csvResult.costCentersCreatedNames.length > 0 && ` (${csvResult.costCentersCreatedNames.join(', ')})`}
                </Typography>
                <Typography variant="body2">
                  <strong>{csvResult.phoneLinesCreated}</strong> linhas telefônicas criadas,
                  <strong> {csvResult.phoneLinesUpdated}</strong> atualizadas
                </Typography>
                {csvResult.skipped > 0 && (
                  <Typography variant="body2" color="warning.main">
                    {csvResult.skipped} linha{csvResult.skipped !== 1 ? 's' : ''} pulada{csvResult.skipped !== 1 ? 's' : ''} por erros
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
          {csvStep === 'importing' && !csvResult && !csvError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size={24} />
              <Typography>Importando colaboradores...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          {csvStep === 'select' && (
            <>
              <Button onClick={handleCloseCSVDialog} color="inherit">Cancelar</Button>
              <Button
                onClick={handleCSVPreview}
                variant="contained"
                disabled={!pendingCSV}
              >
                Importar
              </Button>
            </>
          )}
          {csvStep === 'preview' && csvError && (
            <Button onClick={handleCloseCSVDialog} color="inherit">Fechar</Button>
          )}
          {csvStep === 'preview' && csvPreview && !csvError && (
            <>
              <Button onClick={handleCloseCSVDialog} color="inherit">Cancelar</Button>
              <Button onClick={handleCSVImport} variant="contained" disabled={csvPreview.validCount === 0}>
                Confirmar Importação
              </Button>
            </>
          )}
          {csvStep === 'importing' && csvResult && (
            <Button onClick={handleCloseCSVDialog} variant="contained" sx={{ bgcolor: '#10B981' }}>
              Concluído
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Formato do CSV
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              O arquivo deve conter um cabeçalho com as colunas abaixo (em qualquer ordem, separadas por <code>;</code> ou <code>,</code>):
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 400 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 700 }}>Coluna</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nomes aceitos</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Obrigatório</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><strong>nr</strong></TableCell>
                    <TableCell><code>nr, numero, telefone, phone</code></TableCell>
                    <TableCell>Sim</TableCell>
                    <TableCell>Nº do telefone com DDD (ex: 5511999999991)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>nome</strong></TableCell>
                    <TableCell><code>nome, name</code></TableCell>
                    <TableCell>Sim</TableCell>
                    <TableCell>Nome completo do colaborador</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>cpf</strong></TableCell>
                    <TableCell><code>cpf, documento, doc</code></TableCell>
                    <TableCell>Sim</TableCell>
                    <TableCell>CPF (apenas números). Usado como chave para evitar duplicatas</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>centro de custo</strong></TableCell>
                    <TableCell><code>centro de custo, centrodecusto, cc, costcenter, cost_center</code></TableCell>
                    <TableCell>Não</TableCell>
                    <TableCell>Centro de custo do colaborador. Será criado automaticamente se não existir</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Exemplo:</Typography>
            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto' }}>
              <Typography component="pre" variant="body2" sx={{ m: 0, whiteSpace: 'pre', fontFamily: 'monospace' }}>
                {'nr;nome;cpf;centro de custo\n5511999999991;João Silva;12345678901;TI\n5511999999992;Maria Souza;98765432100;TI\n5511999999993;Carlos Santos;11122233344;Marketing'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                const csvContent = 'nr;nome;cpf;centro de custo\n5511999999991;João Silva;12345678901;TI\n5511999999992;Maria Souza;98765432100;TI\n5511999999993;Carlos Santos;11122233344;Marketing\n5511999999994;Ana Oliveira;55566677788;Marketing\n5511999999995;Pedro Costa;99988877766;RH';
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'template_importacao_colaboradores.csv';
                link.click();
                URL.revokeObjectURL(url);
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Baixar Template CSV
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setHelpOpen(false)} variant="contained">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollaboratorsPage;
