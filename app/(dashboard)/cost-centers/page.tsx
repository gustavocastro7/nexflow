'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Typography, Paper, Alert, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, InputAdornment, alpha, useTheme, Stack, Divider, List, ListItemButton, ListItemText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PhoneIcon from '@mui/icons-material/Phone';
import SettingsPhoneIcon from '@mui/icons-material/SettingsPhone';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { useNotification } from '@/app/providers';
import type { Workspace, User, CostCenter } from '@/app/types';
import { useLanguage } from '@/app/i18n/LanguageContext';

interface Collab { id: string; name: string; }
interface PhoneLine { id: string; phone_number: string; responsible_name: string; responsible_id: string; collaborator_id: string; cost_center_id: string; }

export default function CostCentersPage() {
  const { showError, showSuccess } = useNotification();
  const { t } = useLanguage();
  const theme = useTheme();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [collaborators, setCollaborators] = useState<Collab[]>([]);
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openLines, setOpenLines] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState<CostCenter | null>(null);
  const [editingLine, setEditingLine] = useState<PhoneLine | null>(null);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [openAllLines, setOpenAllLines] = useState(false);
  const [lineSearch, setLineSearch] = useState('');

  const getUser = (): User | null => { try { const d = sessionStorage.getItem('user'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const getActiveWorkspace = (): Workspace | null => { try { const d = sessionStorage.getItem('activeWorkspace'); return d ? JSON.parse(d) : null; } catch { return null; } };
  const user = getUser();
  const activeWorkspace = getActiveWorkspace();
  const isAdmin = user?.profile === 'admin' || user?.profile === 'jedi';

  const fetchData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const [ccData, collData, linesData] = await Promise.all([
        apiGet(`/cost-centers?workspaceId=${activeWorkspace.id}`),
        apiGet(`/collaborators?workspaceId=${activeWorkspace.id}`),
        apiGet(`/phone-lines?workspaceId=${activeWorkspace.id}`)
      ]);
      const fetchedCC = Array.isArray(ccData) ? ccData : [];
      setCostCenters(fetchedCC);
      setCollaborators(Array.isArray(collData) ? collData : []);
      setPhoneLines(Array.isArray(linesData) ? linesData : []);
      if (fetchedCC.length > 0 && !selectedCostCenterId) setSelectedCostCenterId(fetchedCC[0].id);
    } catch { showError(t('costCenters.loadError')); }
    finally { setLoading(false); }
  }, [activeWorkspace?.id, selectedCostCenterId, showError, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLines = phoneLines.filter(l => l.cost_center_id === selectedCostCenterId);
  const selectedCC = costCenters.find(cc => cc.id === selectedCostCenterId);

  const handleOpen = (costCenter: CostCenter | null = null) => {
    if (!isAdmin) return;
    setCurrentCostCenter(costCenter);
    setName(costCenter ? costCenter.name : '');
    setDescription(costCenter?.description || '');
    setPhones(costCenter && Array.isArray(costCenter.phones) ? costCenter.phones : []);
    setNewPhone('');
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setCurrentCostCenter(null); };

  const addPhone = () => { if (newPhone && !phones.includes(newPhone)) { setPhones([...phones, newPhone]); setNewPhone(''); } };
  const removePhone = (tel: string) => { setPhones(phones.filter(t => t !== tel)); };

  const handleSave = async () => {
    if (!isAdmin || !activeWorkspace?.id) return;
    try {
      if (currentCostCenter) {
        await apiPut(`/cost-centers/${currentCostCenter.id}`, { name, description, phones });
        showSuccess(t('costCenters.updateSuccess'));
      } else {
        await apiPost('/cost-centers', { name, description, phones, workspaceId: activeWorkspace.id });
        showSuccess(t('costCenters.createSuccess'));
      }
      fetchData();
      handleClose();
    } catch { showError(t('costCenters.saveError')); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (window.confirm(t('costCenters.deleteConfirm'))) {
      try {
        await apiDelete(`/cost-centers/${id}`);
        if (selectedCostCenterId === id) setSelectedCostCenterId(null);
        showSuccess(t('costCenters.deleteSuccess'));
        fetchData();
      } catch { showError(t('costCenters.deleteError')); }
    }
  };

  const handleEditLine = (line: PhoneLine) => { setEditingLine(line); setOpenLines(true); };

  const handleSaveLine = async () => {
    if (!editingLine) return;
    try {
      await apiPut(`/phone-lines/${editingLine.id}`, { collaborator_id: editingLine.collaborator_id, cost_center_id: editingLine.cost_center_id, responsible_name: editingLine.responsible_name, responsible_id: editingLine.responsible_id });
      showSuccess(t('costCenters.lineUpdateSuccess'));
      fetchData();
      setOpenLines(false);
    } catch { showError(t('costCenters.lineSaveError')); }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{t('costCenters.title')}</Typography>
          <Typography variant="body1" color="textSecondary">{t('costCenters.subtitle')}</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<SettingsPhoneIcon />} onClick={() => setOpenAllLines(true)}>{t('costCenters.manageAllLines')}</Button>
          {isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ bgcolor: theme.palette.primary.main }}>{t('costCenters.newCostCenter')}</Button>}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>
        <Paper sx={{ width: '30%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('costCenters.listTitle')}</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
            ) : (
              <List disablePadding>
                {costCenters.map((cc) => (
                  <ListItemButton key={cc.id} selected={selectedCostCenterId === cc.id} onClick={() => setSelectedCostCenterId(cc.id)}
                    sx={{ borderLeft: selectedCostCenterId === cc.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent', py: 1.5 }}>
                    <ListItemText primary={cc.name} secondary={cc.code || cc.description}
                      slotProps={{ primary: { sx: { fontWeight: selectedCostCenterId === cc.id ? 700 : 500 } } }} />
                    {isAdmin && (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpen(cc); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={(e) => handleDelete(cc.id, e)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    )}
                  </ListItemButton>
                ))}
                {costCenters.length === 0 && <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>{t('costCenters.noCostCenters')}</Typography>}
              </List>
            )}
          </Box>
        </Paper>

        <Paper sx={{ width: '70%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('costCenters.linkedLines', { name: selectedCC?.name || t('costCenters.selectCostCenter') })}</Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('costCenters.phoneNumber')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t('costCenters.collaboratorResponsible')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLines.map((line) => {
                  const coll = collaborators.find(c => c.id === line.collaborator_id);
                  return (
                    <TableRow key={line.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PhoneIcon fontSize="small" color="disabled" />{line.phone_number}</Box></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: coll ? 700 : 400 }}>{coll ? coll.name : (line.responsible_name || '-')}</Typography>{coll && <Typography variant="caption" color="text.secondary">ID: {coll.id.substring(0, 8)}</Typography>}</TableCell>
                      <TableCell align="right"><Button size="small" onClick={() => handleEditLine(line)}>{t('costCenters.editLink')}</Button></TableCell>
                    </TableRow>
                  );
                })}
                {filteredLines.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 10 }}><Typography variant="body1" color="text.disabled">{t('costCenters.noLinesForCC')}</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      <Dialog open={openLines} onClose={() => setOpenLines(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('costCenters.assignPhoneLine')}</DialogTitle>
        <DialogContent dividers>
          {editingLine && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="h6" color="primary">{editingLine.phone_number}</Typography>
              <TextField select label={t('costCenters.collaborator')} fullWidth slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} value={editingLine.collaborator_id || ''} onChange={(e) => setEditingLine({...editingLine, collaborator_id: e.target.value})}>
                <option value="">{t('costCenters.none')}</option>
                {collaborators.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </TextField>
              <TextField select label={t('costCenters.costCenter')} fullWidth slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} value={editingLine.cost_center_id || ''} onChange={(e) => setEditingLine({...editingLine, cost_center_id: e.target.value})}>
                <option value="">{t('costCenters.none')}</option>
                {costCenters.map(cc => (<option key={cc.id} value={cc.id}>{cc.name}</option>))}
              </TextField>
              <TextField label={t('costCenters.legacyResponsibleName')} fullWidth value={editingLine.responsible_name || ''} onChange={(e) => setEditingLine({...editingLine, responsible_name: e.target.value})} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenLines(false)}>{t('common.cancel')}</Button><Button onClick={handleSaveLine} variant="contained">{t('costCenters.saveAssociation')}</Button></DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>{currentCostCenter ? t('costCenters.editCostCenter') : t('costCenters.newCostCenter')}</DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField autoFocus label={t('costCenters.ccNameLabel')} fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder={t('costCenters.ccNamePlaceholder')} />
            <TextField label={t('costCenters.descriptionOptional')} fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('costCenters.linkedPhones')}</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {phones.map((tel) => (<Chip key={tel} label={tel} onDelete={() => removePhone(tel)} color="primary" variant="outlined" size="small" />))}
              </Stack>
              <TextField label={t('costCenters.newPhoneNumber')} fullWidth value={newPhone} onChange={(e) => setNewPhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={addPhone} edge="end"><AddIcon /></IconButton></InputAdornment> } }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}><Button onClick={handleClose} color="inherit" sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button><Button onClick={handleSave} variant="contained" size="large" sx={{ px: 4 }}>{t('costCenters.saveChanges')}</Button></DialogActions>
      </Dialog>

      <Dialog open={openAllLines} onClose={() => setOpenAllLines(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('costCenters.manageAllLinesTitle')}<Typography variant="body2" color="textSecondary">{t('costCenters.totalLinesDetected', { count: phoneLines.length })}</Typography></DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth placeholder={t('costCenters.searchByPhoneOrResponsible')} value={lineSearch} onChange={(e) => setLineSearch(e.target.value)} sx={{ mb: 2 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><PhoneIcon /></InputAdornment> } }} />
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead><TableRow><TableCell>{t('costCenters.phoneNumber')}</TableCell><TableCell>{t('costCenters.responsibleLegacy')}</TableCell><TableCell>{t('costCenters.collaborator')}</TableCell><TableCell>{t('costCenters.costCenter')}</TableCell><TableCell align="right">{t('common.actions')}</TableCell></TableRow></TableHead>
              <TableBody>
                {phoneLines.filter(l => l.phone_number.includes(lineSearch) || (l.responsible_name && l.responsible_name.toLowerCase().includes(lineSearch.toLowerCase()))).map((line) => (
                  <TableRow key={line.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{line.phone_number}</TableCell>
                    <TableCell>{line.responsible_name || '-'}</TableCell>
                    <TableCell>{collaborators.find(c => c.id === line.collaborator_id)?.name || '-'}</TableCell>
                    <TableCell>{costCenters.find(cc => cc.id === line.cost_center_id)?.name || <Typography variant="caption" color="error">{t('costCenters.unassigned')}</Typography>}</TableCell>
                    <TableCell align="right"><Button size="small" onClick={() => handleEditLine(line)}>{t('common.edit')}</Button></TableCell>
                  </TableRow>
                ))}
                {phoneLines.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>{t('costCenters.noPhoneLinesFound')}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenAllLines(false)}>{t('common.close')}</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
