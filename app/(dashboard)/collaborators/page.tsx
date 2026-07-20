'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Skeleton, alpha, useTheme, CircularProgress, Alert, Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon, Help as HelpIcon, Download as DownloadIcon } from '@mui/icons-material';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { useNotification } from '@/app/providers';
import type { Workspace, CSVImportPreview, CSVImportResult, Collaborator } from '@/app/types';
import { useLanguage } from '@/app/i18n/LanguageContext';

function CollaboratorsPage() {
  const { showSuccess, showError } = useNotification();
  const { t } = useLanguage();
  const theme = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({ name: '', external_id: '', email: '', department: '' });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvStep, setCsvStep] = useState<'select' | 'preview' | 'importing'>('select');
  const [pendingCSV, setPendingCSV] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVImportPreview | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CSVImportResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    try { const wsData = sessionStorage.getItem('activeWorkspace'); const ws = wsData ? JSON.parse(wsData) as Workspace : null; if (ws?.id) setActiveWorkspace(ws); } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get('openCSVImport') === 'true') {
      setCsvDialogOpen(true);
      router.replace('/collaborators');
    }
  }, [searchParams, router]);

  const fetchCollaborators = useCallback(async (isSilent = false) => {
    if (!activeWorkspace?.id) return;
    if (!isSilent) setLoading(true);
    try {
      const data = await apiGet(`/collaborators?workspaceId=${activeWorkspace.id}`);
      setCollaborators(Array.isArray(data) ? data : []);
    } catch { showError(t('collaborators.loadError')); }
    finally { setLoading(false); setIsInitialLoad(false); }
  }, [activeWorkspace?.id, showError, t]);

  useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  const handleOpen = (collaborator?: Collaborator) => {
    if (collaborator) { setEditingCollaborator(collaborator); setFormData({ name: collaborator.name, external_id: collaborator.external_id || '', email: collaborator.email || '', department: collaborator.department || '' }); }
    else { setEditingCollaborator(null); setFormData({ name: '', external_id: '', email: '', department: '' }); }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!activeWorkspace?.id) { showError(t('collaborators.noWorkspaceSelected')); return; }
    try {
      if (editingCollaborator) { await apiPut(`/collaborators/${editingCollaborator.id}`, formData); showSuccess(t('collaborators.updateSuccess')); }
      else { await apiPost('/collaborators', { ...formData, workspace_id: activeWorkspace.id }); showSuccess(t('collaborators.createSuccess')); }
      fetchCollaborators(true);
      setOpen(false);
    } catch { showError(t('collaborators.saveError')); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('collaborators.deleteConfirm'))) {
      try { await apiDelete(`/collaborators/${id}`); showSuccess(t('collaborators.deleteSuccess')); fetchCollaborators(true); } catch { showError(t('collaborators.deleteError')); }
    }
  };

  const handleCSVSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setPendingCSV(e.target?.result as string); };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCSVPreview = async () => {
    if (!pendingCSV || !activeWorkspace?.id) return;
    setCsvStep('preview'); setCsvError(null); setCsvPreview(null);
    try { const data = await apiPost('/collaborators/csv/preview', { content: pendingCSV, workspaceId: activeWorkspace.id }); setCsvPreview(data); }
    catch (err: any) { setCsvError(err?.response?.data?.error || t('collaborators.csvValidateError')); }
  };

  const handleCSVImport = async () => {
    if (!pendingCSV || !activeWorkspace?.id) return;
    setCsvStep('importing');
    try { const data = await apiPost('/collaborators/csv/import', { content: pendingCSV, workspaceId: activeWorkspace.id }); setCsvResult(data); fetchCollaborators(true); }
    catch (err: any) { setCsvError(err?.response?.data?.error || t('collaborators.csvImportError')); setCsvStep('preview'); }
  };

  const handleCloseCSVDialog = () => { setCsvDialogOpen(false); setPendingCSV(null); setCsvPreview(null); setCsvError(null); setCsvResult(null); setCsvStep('select'); };

  return (
    <Box sx={{ p: 1 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>{t('collaborators.title')}</Typography>
          <Typography variant="body1" color="text.secondary">
            {t('collaborators.subtitle')}
            {loading && !isInitialLoad && <Typography component="span" variant="caption" color="primary" sx={{ ml: 2, fontWeight: 700 }}>{t('collaborators.updating')}</Typography>}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => { setCsvStep('select'); setCsvPreview(null); setCsvError(null); setCsvResult(null); setPendingCSV(null); setCsvDialogOpen(true); }} sx={{ borderRadius: 2, px: 3 }}>{t('collaborators.importCsv')}</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ borderRadius: 2, px: 3 }}>{t('collaborators.newCollaborator')}</Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('common.name')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('collaborators.registration')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('common.email')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('collaborators.department')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoad ? [...Array(5)].map((_, i) => (
              <TableRow key={i}><TableCell><Skeleton variant="text" width="80%" /></TableCell><TableCell><Skeleton variant="text" width="60%" /></TableCell><TableCell><Skeleton variant="text" width="90%" /></TableCell><TableCell><Skeleton variant="text" width="70%" /></TableCell><TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell></TableRow>
            )) : collaborators.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>{t('collaborators.noCollaborators')}</TableCell></TableRow>
            ) : collaborators.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell><TableCell>{c.external_id || '-'}</TableCell>
                <TableCell>{c.email || '-'}</TableCell><TableCell>{c.department || '-'}</TableCell>
                <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <IconButton size="small" onClick={() => handleOpen(c)} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(c.id)} color="error" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{editingCollaborator ? t('collaborators.editCollaborator') : t('collaborators.newCollaborator')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label={t('collaborators.fullName')} fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
            <TextField label={t('collaborators.registrationExtId')} fullWidth value={formData.external_id} onChange={(e) => setFormData({ ...formData, external_id: e.target.value })} />
            <TextField label={t('common.email')} fullWidth type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label={t('collaborators.department')} fullWidth value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpen(false)} color="inherit">{t('common.cancel')}</Button><Button onClick={handleSubmit} variant="contained" disabled={!formData.name} sx={{ px: 4 }}>{t('common.save')}</Button></DialogActions>
      </Dialog>

      <Dialog open={csvDialogOpen} onClose={handleCloseCSVDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{csvStep === 'select' && t('collaborators.importCollaboratorsCsv')}{csvStep === 'preview' && t('collaborators.validationReport')}{csvStep === 'importing' && t('collaborators.importingTitle')}</DialogTitle>
        <DialogContent dividers>
          {csvStep === 'select' && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('collaborators.csvSelectHelp', { nr: 'nr', nome: 'nome', cpf: 'cpf', cc: 'centro de custo' })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button component="label" variant="outlined" fullWidth sx={{ py: 2, borderStyle: 'dashed', justifyContent: 'flex-start' }}>
                  {pendingCSV ? pendingCSV.substring(0, 50) + '...' : t('collaborators.selectCsvFile')}
                  <input type="file" hidden onChange={handleCSVSelect} />
                </Button>
                <IconButton onClick={() => setHelpOpen(true)} color="primary" sx={{ flexShrink: 0 }}><HelpIcon /></IconButton>
              </Box>
            </Stack>
          )}
          {csvStep === 'preview' && csvError && <Alert severity="error" sx={{ mt: 1 }}>{csvError}</Alert>}
          {csvStep === 'preview' && csvPreview && !csvError && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{t('collaborators.validationReport')}</Typography>
                <Stack direction="row" spacing={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{csvPreview.total}</Typography><Typography variant="caption">{t('collaborators.records')}</Typography></Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#10B981', 0.08), borderRadius: 2, flex: 1 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>{csvPreview.toCreate}</Typography><Typography variant="caption">{t('common.create')}</Typography></Box>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha('#3B82F6', 0.08), borderRadius: 2, flex: 1 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#3B82F6' }}>{csvPreview.toUpdate}</Typography><Typography variant="caption">{t('collaborators.update')}</Typography></Box>
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}><Box sx={{ flex: 1 }}><Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>{t('collaborators.existingCostCenters', { count: csvPreview.costCentersFound })}</Typography></Box><Box sx={{ flex: 1 }}><Typography variant="caption" sx={{ fontWeight: 700, color: '#E11D48' }}>{t('collaborators.newCostCenters', { count: csvPreview.costCentersToCreate })}</Typography></Box></Box>
              {csvPreview.costCentersToCreateNames.length > 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('collaborators.costCentersToCreateList', { names: csvPreview.costCentersToCreateNames.join(', ') })}</Typography>}
              {csvPreview.invalidCount > 0 && (
                <Box><Typography variant="body2" sx={{ fontWeight: 700, color: '#E11D48', mb: 1 }}>{t('collaborators.skippedLines', { count: csvPreview.invalidCount })}</Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: alpha('#E11D48', 0.03), borderRadius: 1, p: 1 }}>
                    {csvPreview.invalidRows.slice(0, 10).map((item, idx) => (
                      <Box key={idx} sx={{ mb: 0.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{t('collaborators.lineLabel', { n: item.row })}</Typography>
                        {item.errors.map((err, ei) => (<Typography key={ei} variant="caption" sx={{ display: 'block', color: '#E11D48', ml: 1 }}>- {err}</Typography>))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
          {csvStep === 'importing' && csvResult && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700, mb: 2 }}>{t('collaborators.importComplete')}</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">{t('collaborators.collaboratorsCreatedUpdated', { created: csvResult.collaboratorsCreated, updated: csvResult.collaboratorsUpdated })}</Typography>
                <Typography variant="body2">{t('collaborators.costCentersCreatedCount', { count: csvResult.costCentersCreated })}{csvResult.costCentersCreatedNames.length > 0 && ` (${csvResult.costCentersCreatedNames.join(', ')})`}</Typography>
                <Typography variant="body2">{t('collaborators.phoneLinesCreatedUpdated', { created: csvResult.phoneLinesCreated, updated: csvResult.phoneLinesUpdated })}</Typography>
                {csvResult.skipped > 0 && <Typography variant="body2" color="warning.main">{t('collaborators.skippedDueToErrors', { count: csvResult.skipped })}</Typography>}
              </Stack>
            </Box>
          )}
          {csvStep === 'importing' && !csvResult && !csvError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}><CircularProgress size={24} /><Typography>{t('collaborators.importingCollaborators')}</Typography></Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          {csvStep === 'select' && <><Button onClick={handleCloseCSVDialog} color="inherit">{t('common.cancel')}</Button><Button onClick={handleCSVPreview} variant="contained" disabled={!pendingCSV}>{t('collaborators.importCsv')}</Button></>}
          {csvStep === 'preview' && csvError && <Button onClick={handleCloseCSVDialog} color="inherit">{t('common.close')}</Button>}
          {csvStep === 'preview' && csvPreview && !csvError && <><Button onClick={handleCloseCSVDialog} color="inherit">{t('common.cancel')}</Button><Button onClick={handleCSVImport} variant="contained" disabled={csvPreview.validCount === 0}>{t('collaborators.confirmImport')}</Button></>}
          {csvStep === 'importing' && csvResult && <Button onClick={handleCloseCSVDialog} variant="contained" sx={{ bgcolor: '#10B981' }}>{t('collaborators.done')}</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('collaborators.csvFormatTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">{t('collaborators.csvFormatIntro')}</Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 400 }}>
                <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}><TableCell sx={{ fontWeight: 700 }}>{t('collaborators.column')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('collaborators.acceptedNames')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('collaborators.required')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{t('common.description')}</TableCell></TableRow></TableHead>
                <TableBody>
                  <TableRow><TableCell><strong>nr</strong></TableCell><TableCell><code>nr, numero, telefone, phone</code></TableCell><TableCell>{t('common.yes')}</TableCell><TableCell>{t('collaborators.phoneColDesc')}</TableCell></TableRow>
                  <TableRow><TableCell><strong>nome</strong></TableCell><TableCell><code>nome, name</code></TableCell><TableCell>{t('common.yes')}</TableCell><TableCell>{t('collaborators.nameColDesc')}</TableCell></TableRow>
                  <TableRow><TableCell><strong>cpf</strong></TableCell><TableCell><code>cpf, documento, doc</code></TableCell><TableCell>{t('common.yes')}</TableCell><TableCell>{t('collaborators.cpfColDesc')}</TableCell></TableRow>
                  <TableRow><TableCell><strong>centro de custo</strong></TableCell><TableCell><code>centro de custo, centrodecusto, cc, costcenter, cost_center</code></TableCell><TableCell>{t('common.no')}</TableCell><TableCell>{t('collaborators.costCenterColDesc')}</TableCell></TableRow>
                </TableBody>
              </Table>
            </Box>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('collaborators.example')}</Typography>
            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto' }}>
              <Typography component="pre" variant="body2" sx={{ m: 0, whiteSpace: 'pre', fontFamily: 'monospace' }}>{'nr;nome;cpf;centro de custo\n5511999999991;João Silva;12345678901;TI\n5511999999992;Maria Souza;98765432100;TI\n5511999999993;Carlos Santos;11122233344;Marketing'}</Typography>
            </Box>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => {
              const csvContent = 'nr;nome;cpf;centro de custo\n5511999999991;João Silva;12345678901;TI\n5511999999992;Maria Souza;98765432100;TI\n5511999999993;Carlos Santos;11122233344;Marketing\n5511999999994;Ana Oliveira;55566677788;Marketing\n5511999999995;Pedro Costa;99988877766;RH';
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'template_importacao_colaboradores.csv'; link.click(); URL.revokeObjectURL(url);
            }} sx={{ alignSelf: 'flex-start' }}>{t('collaborators.downloadTemplate')}</Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setHelpOpen(false)} variant="contained">{t('common.close')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

export default function CollaboratorsPageWrapper() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>{t('common.loading')}</Box>}>
      <CollaboratorsPage />
    </Suspense>
  );
}
