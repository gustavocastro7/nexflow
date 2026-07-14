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
import type { Workspace, Invoice, RawInvoice, CostCenter, ImportPreview } from '../types';
import InvoiceList from '../components/invoices/InvoiceList';
import { useNotification } from '../context/NotificationContext';

const PAGE_SIZE = 50;

interface PaginatedInvoices {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const FaturasPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  // Separate loading states to prevent global flickers
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rawInvoices, setRawInvoices] = useState<RawInvoice[]>([]);
  const [selectedRaw, setSelectedRaw] = useState<RawInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
  const [dueDate, setDueDate] = useState<string>('');
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [dueDatesLoaded, setDueDatesLoaded] = useState(false);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState<'select' | 'preview' | 'importing'>('select');
  const [pendingFile, setPendingFile] = useState<{ content: string; type: string } | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ message: string; imported: number; skipped: number } | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>('');

  // Load available due dates
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    apiClient.get<string[]>(`/reports/due-dates?workspaceId=${activeWorkspace.id}`)
      .then(res => {
        setDueDates(res.data);
        setDueDatesLoaded(true);
        if (res.data.length && !dueDate) {
          setDueDate(res.data[0]);
        }
      })
      .catch((err) => {
        console.error('Error loading due dates', err);
        setDueDatesLoaded(true);
      });
  }, [activeWorkspace?.id]);

  // Load cost centers for import dialog
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    apiClient.get<CostCenter[]>(`/cost-centers?workspaceId=${activeWorkspace.id}`)
      .then(res => setCostCenters(res.data))
      .catch(() => {});
  }, [activeWorkspace?.id]);

  const fetchRawInvoices = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setIsLoadingRaw(true);
    try {
      let url = `/invoices/raw?workspaceId=${activeWorkspace.id}`;
      if (dueDate) url += `&dueDate=${dueDate}`;
      
      const res = await apiClient.get<RawInvoice[]>(url);
      const newRawInvoices = res.data;
      setRawInvoices(newRawInvoices);

      if (newRawInvoices.length > 0) {
        if (!selectedRaw || !newRawInvoices.some(r => r.id === selectedRaw.id)) {
          setSelectedRaw(newRawInvoices[0]);
        }
      } else {
        setSelectedRaw(null);
        setInvoices([]);
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar lista de faturas importadas');
    } finally {
      setIsLoadingRaw(false);
    }
  }, [activeWorkspace?.id, dueDate, selectedRaw?.id, showError]);

  const fetchItems = useCallback(async (pageNum: number, append: boolean, rawId?: string, operator?: string) => {
    if (!activeWorkspace?.id) return;
    
    setIsLoadingItems(true);
    if (!append) setIsInitialLoad(true);

    try {
      let url = `/invoices?workspaceId=${activeWorkspace.id}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (rawId) url += `&raw_invoice_id=${rawId}`;
      else if (dueDate) url += `&dueDate=${dueDate}`;
      
      if (operator) url += `&operator=${operator}`;
      
      const res = await apiClient.get<PaginatedInvoices>(url);
      const { data, hasMore: more } = res.data;
      
      setInvoices(prev => append ? [...prev, ...data] : data);
      setHasMore(more);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar registros da fatura');
      setHasMore(false);
    } finally {
      setIsLoadingItems(false);
      setIsInitialLoad(false);
    }
  }, [activeWorkspace?.id, dueDate, showError]);

  useEffect(() => {
    if (!dueDatesLoaded) return;
    fetchRawInvoices();
  }, [activeWorkspace?.id, dueDate, dueDatesLoaded]);

  // Triggered when selectedRaw changes
  useEffect(() => {
    if (selectedRaw) {
      fetchItems(1, false, selectedRaw.id, selectedRaw.operator);
    } else {
      setInvoices([]);
      setHasMore(false);
    }
  }, [selectedRaw?.id, fetchItems]);

  const loadMore = useCallback(() => {
    if (selectedRaw && hasMore && !isLoadingItems) {
      fetchItems(page + 1, true, selectedRaw.id, selectedRaw.operator);
    }
  }, [fetchItems, page, selectedRaw, hasMore, isLoadingItems]);

  const handleDeleteInvoice = async () => {
    if (!rawToDelete || !activeWorkspace?.id) return;

    try {
      await apiClient.delete(`/invoices/${rawToDelete.id}?workspaceId=${activeWorkspace.id}`);
      showSuccess('Fatura removida com sucesso!');
      if (selectedRaw?.id === rawToDelete.id) {
        setSelectedRaw(null);
        setInvoices([]);
      }
      fetchRawInvoices();
    } catch (err) {
      showError('Erro ao remover fatura');
    } finally {
      setDeleteDialogOpen(false);
      setRawToDelete(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeWorkspace?.id) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPendingFile({ content, type: 'claro-txt' });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleRunPreview = async () => {
    if (!pendingFile || !activeWorkspace?.id) return;

    setImportStep('preview');
    setPreviewError(null);
    setPreviewResult(null);

    try {
      const res = await apiClient.post<ImportPreview>(`/invoices/${pendingFile.type}/preview`, {
        content: pendingFile.content,
        workspaceId: activeWorkspace.id,
      });
      setPreviewResult(res.data);
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || 'Erro ao validar arquivo.');
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile || !activeWorkspace?.id || !previewResult) return;

    setImportStep('importing');
    try {
      const body: any = {
        content: pendingFile.content,
        workspaceId: activeWorkspace.id,
      };
      if (selectedCostCenterId) {
        body.costCenterId = selectedCostCenterId;
      }

      const res = await apiClient.post<{ message: string; imported: number; skipped: number }>(`/invoices/${pendingFile.type}/import`, body);
      setImportResult(res.data);
      fetchRawInvoices();
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || 'Erro ao importar arquivo.');
      setImportStep('preview');
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setPendingFile(null);
    setPreviewResult(null);
    setPreviewError(null);
    setImportResult(null);
    setImportStep('select');
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

        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => {
            setImportStep('select');
            setPreviewResult(null);
            setPreviewError(null);
            setImportResult(null);
            setPendingFile(null);
            setImportDialogOpen(true);
          }}
          sx={{ bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' }, px: 3 }}
        >
          Importar Fatura
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>
        {/* Lado Esquerdo: Lista de Faturas e Header */}
        <Box sx={{ width: '350px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ p: 2, bgcolor: alpha('#E11D48', 0.05) }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ReceiptLongIcon fontSize="small" color="primary" />
                Faturas Importadas
              </Typography>
              
              <TextField
                select
                fullWidth
                size="small"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                sx={{ bgcolor: 'background.paper' }}
              >
                <MenuItem value="">Todos os Vencimentos</MenuItem>
                {dueDates.map(d => (
                  <MenuItem key={d} value={d}>
                    {d === 'NO_DATE' ? 'Sem data' : new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                  </MenuItem>
                ))}
              </TextField>
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
                      Nenhuma fatura encontrada no período.
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
          <Box sx={{ p: 2, bgcolor: alpha('#E11D48', 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flexShrink: 0 }}>
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
              loading={isLoadingItems}
              hasMore={hasMore}
              loadMore={loadMore}
              isInitialLoading={isInitialLoad}
            />
          </Box>
        </Paper>
      </Box>

      {/* Dialog de Importação com CC + Arquivo + Validação */}
      <Dialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {importStep === 'select' && 'Importar Fatura'}
          {importStep === 'preview' && 'Relatório de Validação'}
          {importStep === 'importing' && 'Importando...'}
        </DialogTitle>

        <DialogContent>
          {importStep === 'select' && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Centro de Custo */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Centro de custo:
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedCostCenterId}
                  onChange={(e) => setSelectedCostCenterId(e.target.value)}
                >
                  <MenuItem value="">Padrão (Matriz)</MenuItem>
                  {costCenters.map(cc => (
                    <MenuItem key={cc.id} value={cc.id}>
                      {cc.code ? `${cc.code} - ` : ''}{cc.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Arquivo */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Arquivo da fatura:
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  sx={{ py: 1.5, borderStyle: 'dashed', justifyContent: 'flex-start' }}
                >
                  {pendingFile ? pendingFile.content.substring(0, 40) + '...' : 'Selecionar arquivo'}
                  <input type="file" hidden onChange={handleFileSelect} />
                </Button>
              </Box>
            </Stack>
          )}

          {importStep === 'preview' && previewError && (
            <Alert severity="error" sx={{ mt: 1 }}>{previewError}</Alert>
          )}

          {importStep === 'preview' && previewResult && !previewError && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Relatório de Validação</Typography>
                <Stack direction="row" spacing={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{previewResult.total}</Typography>
                    <Typography variant="caption">Registros</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{previewResult.validCount}</Typography>
                    <Typography variant="caption">Válidos</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(previewResult.invalidCount > 0 ? '#E11D48' : '#10B981', 0.08), borderRadius: 2, flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: previewResult.invalidCount > 0 ? '#E11D48' : '#10B981' }}>{previewResult.invalidCount}</Typography>
                    <Typography variant="caption">Com Erro</Typography>
                  </Box>
                </Stack>
              </Box>

              {previewResult.phonesDiscovered && previewResult.phonesDiscovered.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Telefones encontrados ({previewResult.phonesDiscovered.length}):
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: 12 }}>
                    {previewResult.phonesDiscovered.slice(0, 10).join(', ')}
                    {previewResult.phonesDiscovered.length > 10 ? '...' : ''}
                  </Typography>
                </Box>
              )}

              {previewResult.invalidCount > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#E11D48', mb: 1 }}>
                    Registros com erro (serão pulados):
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', bgcolor: alpha('#E11D48', 0.03), borderRadius: 1, p: 1 }}>
                    {previewResult.invalidItems.slice(0, 20).map((item, idx) => (
                      <Box key={idx} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Linha {item.line}:</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>{item.content}</Typography>
                        {item.errors.map((err, ei) => (
                          <Typography key={ei} variant="caption" sx={{ display: 'block', color: '#E11D48', ml: 1 }}>
                            - {err}
                          </Typography>
                        ))}
                      </Box>
                    ))}
                    {previewResult.invalidItems.length > 20 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                        ...e mais {previewResult.invalidItems.length - 20} erro(s)
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          )}

          {importStep === 'importing' && importResult && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700, mb: 1 }}>
                Importação concluída!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {importResult.imported} registro{importResult.imported !== 1 ? 's' : ''} importado{importResult.imported !== 1 ? 's' : ''}
                {importResult.skipped > 0 && ` (${importResult.skipped} pulado${importResult.skipped !== 1 ? 's' : ''} por erros)`}
              </Typography>
            </Box>
          )}

          {importStep === 'importing' && !importResult && !previewError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size={24} />
              <Typography>Importando fatura...</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          {importStep === 'select' && (
            <>
              <Button onClick={handleCloseImportDialog} color="inherit">Cancelar</Button>
              <Button
                onClick={handleRunPreview}
                variant="contained"
                disabled={!pendingFile}
                sx={{
                  bgcolor: '#E11D48',
                  '&:hover': { bgcolor: '#BE123C' },
                  '&.Mui-disabled': { bgcolor: alpha('#E11D48', 0.4) }
                }}
              >
                Importar
              </Button>
            </>
          )}
          {importStep === 'preview' && previewError && (
            <Button onClick={handleCloseImportDialog} color="inherit">Fechar</Button>
          )}
          {importStep === 'preview' && previewResult && !previewError && (
            <>
              <Button onClick={handleCloseImportDialog} color="inherit">Cancelar</Button>
              <Button
                onClick={handleConfirmImport}
                variant="contained"
                sx={{
                  bgcolor: '#E11D48',
                  '&:hover': { bgcolor: '#BE123C' },
                }}
              >
                Confirmar Importação
              </Button>
            </>
          )}
          {importStep === 'importing' && importResult && (
            <Button onClick={handleCloseImportDialog} variant="contained" sx={{ bgcolor: '#10B981' }}>
              Concluído
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
