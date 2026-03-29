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
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/client';
import type { Workspace, Invoice, RawInvoice } from '../types';
import InvoiceList from '../components/invoices/InvoiceList';

const PAGE_SIZE = 50;

interface PaginatedInvoices {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const FaturasPage: React.FC = () => {
  // Separate loading states to prevent global flickers
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rawInvoices, setRawInvoices] = useState<RawInvoice[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<RawInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rawToDelete, setRawToDelete] = useState<RawInvoice | null>(null);

  const getActiveWorkspace = useCallback((): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch {
      return null;
    }
  }, []);

  const activeWorkspace = getActiveWorkspace();
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const fetchRawInvoices = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingRaw(true);
    try {
      const res = await apiClient.get<RawInvoice[]>(`/invoices/raw?workspaceId=${activeWorkspace.id}`);
      const newRawInvoices = res.data;
      setRawInvoices(newRawInvoices);

      if (newRawInvoices.length > 0) {
        // Only change selectedRaw if none is selected or the current one is gone
        if (!selectedRaw || !newRawInvoices.some(r => r.id === selectedRaw.id)) {
          setSelectedRaw(newRawInvoices[0]);
        }
      } else {
        setSelectedRaw(null);
        setInvoices([]);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar lista de faturas importadas');
    } finally {
      setIsLoadingRaw(false);
    }
  }, [activeWorkspace?.id, selectedRaw]);

  const fetchItems = useCallback(async (pageNum: number, append: boolean, rawId?: string, operator?: string, month?: number, year?: number) => {
    if (!activeWorkspace?.id) return;
    
    setIsLoadingItems(true);
    if (!append) setIsInitialLoad(true);

    try {
      let url = `/invoices?workspaceId=${activeWorkspace.id}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (rawId) url += `&raw_invoice_id=${rawId}`;
      if (operator) url += `&operator=${operator}`; // Added operator to URL
      if (month) url += `&mes=${month}`;
      if (year) url += `&ano=${year}`;
      
      const res = await apiClient.get<PaginatedInvoices>(url);
      const { data, hasMore: more } = res.data;
      
      setInvoices(prev => append ? [...prev, ...data] : data);
      setHasMore(more);
      setPage(pageNum);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar registros da fatura');
      setHasMore(false);
    } finally {
      setIsLoadingItems(false);
      setIsInitialLoad(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchRawInvoices();
  }, [activeWorkspace?.id]); // Only on workspace change

  // Triggered when selectedRaw or filters change
  useEffect(() => {
    if (selectedRaw) {
      fetchItems(1, false, selectedRaw.id, selectedRaw.operator, filterMonth, filterYear);
    } else {
      setInvoices([]);
      setHasMore(false);
    }
  }, [selectedRaw?.id, filterMonth, filterYear, fetchItems]);

  const loadMore = useCallback(() => {
    if (selectedRaw && hasMore && !isLoadingItems) {
      fetchItems(page + 1, true, selectedRaw.id, selectedRaw.operator, filterMonth, filterYear);
    }
  }, [fetchItems, page, selectedRaw, filterMonth, filterYear, hasMore, isLoadingItems]);

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
              {isLoadingRaw && rawInvoices.length === 0 ? (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setRawToDelete(raw);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{ ml: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  ))}
                  {!isLoadingRaw && rawInvoices.length === 0 && (
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
                {selectedRaw ? 'Informações de header não disponíveis.' : 'Selecione uma fatura.'}
              </Typography>
            )}
          </Paper>
        </Box>

        {/* Lado Direito: Registros da Fatura */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha('#E11D48', 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flexShrink: 0 }}>
              Registros da Fatura
              {selectedRaw && <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}>
                ({selectedRaw.operator.toUpperCase()} - {new Date(selectedRaw.created_at).toLocaleDateString()})
              </Typography>}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <TextField
                select
                size="small"
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
                sx={{ width: 140 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => (
                  <MenuItem key={monthNum} value={monthNum}>
                    {new Date(0, monthNum - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
                sx={{ width: 100 }}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((yearNum) => (
                  <MenuItem key={yearNum} value={yearNum}>
                    {yearNum}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <InvoiceList
              invoices={invoices}
              loading={isLoadingItems}
              hasMore={hasMore}
              loadMore={loadMore}
              isInitialLoading={isInitialLoad}
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
            Tem certeza que deseja remover esta fatura? Todos os registros associados serão excluídos permanentemente.
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
