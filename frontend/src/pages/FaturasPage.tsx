import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Alert,
  alpha,
  Stack,
  Paper,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import apiClient from '../api/client';
import type { Workspace, Invoice, RawInvoice } from '../types';
import InvoiceList from '../components/invoices/InvoiceList';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';

const PAGE_SIZE = 50;

interface PaginatedInvoices {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const FaturasPage: React.FC = () => {
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingRaws, setLoadingRaws] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rawInvoices, setRawInvoices] = useState<RawInvoice[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<RawInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rawToDelete, setRawToDelete] = useState<RawInvoice | null>(null);
  const loadingRef = useRef(false);

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch {
      return null;
    }
  };
  const activeWorkspace = getActiveWorkspace();

  const fetchRawInvoices = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoadingRaws(true);
    try {
      const res = await apiClient.get<RawInvoice[]>(`/invoices/raw?workspaceId=${activeWorkspace.id}`);
      setRawInvoices(res.data);
      if (res.data.length > 0 && !selectedRaw) {
        setSelectedRaw(res.data[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar lista de faturas importadas');
    } finally {
      setLoadingRaws(false);
    }
  }, [activeWorkspace?.id, selectedRaw]);

  const handleDeleteInvoice = async () => {
    if (!rawToDelete || !activeWorkspace?.id) return;

    try {
      await apiClient.delete(`/invoices/${rawToDelete.id}?workspaceId=${activeWorkspace.id}`);
      setSuccess('Fatura removida com sucesso!');
      if (selectedRaw?.id === rawToDelete.id) {
        setSelectedRaw(null);
        setInvoices([]);
      }
      fetchRawInvoices();
    } catch (err) {
      setError('Erro ao remover fatura');
    } finally {
      setDeleteDialogOpen(false);
      setRawToDelete(null);
    }
  };

  const openDeleteDialog = (e: React.MouseEvent, raw: RawInvoice) => {
    e.stopPropagation();
    setRawToDelete(raw);
    setDeleteDialogOpen(true);
  };

  const fetchItems = useCallback(async (pageNum: number, append: boolean, rawId?: string) => {
    if (!activeWorkspace?.id || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingItems(true);
    try {
      let url = `/invoices?workspaceId=${activeWorkspace.id}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (rawId) {
        // We'll need to update the backend to filter by raw_invoice_id if we want strict filtering
        // For now we assume the index returns all, but let's add the filter param anyway
        url += `&raw_invoice_id=${rawId}`;
      }
      
      const res = await apiClient.get<PaginatedInvoices>(url);
      const { data, hasMore: more } = res.data;
      setInvoices(prev => append ? [...prev, ...data] : data);
      setHasMore(more);
      setPage(pageNum);
    } catch {
      setError('Erro ao carregar registros da fatura');
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoadingItems(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchRawInvoices();
  }, [fetchRawInvoices]);

  useEffect(() => {
    if (selectedRaw) {
      setInvoices([]);
      setPage(1);
      setHasMore(true);
      fetchItems(1, false, selectedRaw.id);
    }
  }, [selectedRaw, fetchItems]);

  const loadMore = useCallback(() => {
    if (selectedRaw) {
      fetchItems(page + 1, true, selectedRaw.id);
    }
  }, [fetchItems, page, selectedRaw]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file || !activeWorkspace?.id) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        setError('');
        await apiClient.post(`/invoices/${type}/import`, {
          content,
          workspaceId: activeWorkspace.id,
        });
        setSuccess(`Fatura ${type.toUpperCase()} importada com sucesso!`);
        fetchRawInvoices();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Container maxWidth={false} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Gestão de Faturas</Typography>
          <Typography variant="body1" color="textSecondary">
            Selecione uma fatura importada para ver seus detalhes.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' }, px: 3 }}
          >
            Upload Fatura (Claro TXT)
            <input type="file" hidden onChange={(e) => handleFileUpload(e, 'claro-txt')} />
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>
        {/* Lado Esquerdo: Lista de Faturas e Header */}
        <Box sx={{ width: '350px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ p: 2, bgcolor: alpha('#E11D48', 0.05) }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon fontSize="small" color="primary" />
                Faturas Importadas
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {loadingRaws ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
              ) : (
                <List disablePadding>
                  {rawInvoices.map((raw) => (
                    <ListItemButton 
                      key={raw.id} 
                      selected={selectedRaw?.id === raw.id}
                      onClick={() => setSelectedRaw(raw)}
                      sx={{ 
                        borderLeft: selectedRaw?.id === raw.id ? '4px solid #E11D48' : '4px solid transparent',
                        py: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      <ListItemText 
                        primary={`Fatura ${raw.operator.toUpperCase()}`}
                        secondary={new Date(raw.created_at).toLocaleString()}
                        primaryTypographyProps={{ fontWeight: selectedRaw?.id === raw.id ? 700 : 500 }}
                      />
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => openDeleteDialog(e, raw)}
                        sx={{ ml: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  ))}
                  {rawInvoices.length === 0 && (
                    <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                      Nenhuma fatura encontrada.
                    </Typography>
                  )}
                </List>
              )}
            </Box>
          </Paper>

          {/* Dados do Header da Fatura Selecionada */}
          <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#E11D48', 0.02) }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1 }}>
              Dados do Header
            </Typography>
            {selectedRaw?.content?.header ? (
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>CLIENTE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRaw.content.header.cliente || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>VENCIMENTO</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedRaw.content.header.data_vencimento || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>VALOR TOTAL</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#10B981' }}>
                    {selectedRaw.content.header.valor_total ? `R$ ${selectedRaw.content.header.valor_total}` : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                {selectedRaw ? 'Informações de header não disponíveis para esta operadora.' : 'Selecione uma fatura.'}
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Lado Direito: Registros da Fatura */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha('#E11D48', 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Registros da Fatura
              {selectedRaw && <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}>
                ({selectedRaw.operator.toUpperCase()} - {new Date(selectedRaw.created_at).toLocaleDateString()})
              </Typography>}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <InvoiceList
              invoices={invoices}
              loading={loadingItems}
              hasMore={hasMore}
              loadMore={loadMore}
            />
          </Box>
        </Paper>
      </Box>

      {/* Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Remover Fatura</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover esta fatura? Todos os {invoices.length} registros associados serão excluídos permanentemente.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleDeleteInvoice} color="error" variant="contained">Remover</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FaturasPage;
