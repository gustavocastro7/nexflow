import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
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
  InputAdornment,
  alpha,
  useTheme,
  Tooltip,
  Stack,
  Divider,
  List,
  ListItemButton,
  ListItemText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PhoneIcon from '@mui/icons-material/Phone';
import SettingsPhoneIcon from '@mui/icons-material/SettingsPhone';
import apiClient from '../api/client';
import type { Workspace, User, CostCenter } from '../types';
import { useNotification } from '../context/NotificationContext';

interface Collaborator {
  id: string;
  name: string;
}

interface PhoneLine {
  id: string;
  phone_number: string;
  responsible_name: string;
  responsible_id: string;
  collaborator_id: string;
  cost_center_id: string;
}

const CentroCustoPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const theme = useTheme();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
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

  const getUser = (): User | null => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (e: unknown) {
      console.error(e); // Log the error
      return null;
    }
  };

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch (e: unknown) {
      console.error(e); // Log the error
      return null;
    }
  };

  const user = getUser();
  const activeWorkspace = getActiveWorkspace();

  const isAdmin = user?.profile === 'admin' || user?.profile === 'jedi';

  const [openAllLines, setOpenAllLines] = useState(false);
  const [lineSearch, setLineSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const [ccRes, collRes, linesRes] = await Promise.all([
        apiClient.get<CostCenter[]>(`/cost-centers?workspaceId=${activeWorkspace.id}`),
        apiClient.get<Collaborator[]>(`/collaborators?workspaceId=${activeWorkspace.id}`),
        apiClient.get<PhoneLine[]>(`/phone-lines?workspaceId=${activeWorkspace.id}`)
      ]);
      const fetchedCC = Array.isArray(ccRes.data) ? ccRes.data : [];
      setCostCenters(fetchedCC);
      setCollaborators(Array.isArray(collRes.data) ? collRes.data : []);
      setPhoneLines(Array.isArray(linesRes.data) ? linesRes.data : []);

      if (fetchedCC.length > 0 && !selectedCostCenterId) {
        setSelectedCostCenterId(fetchedCC[0].id);
      }
    } catch (_err: unknown) {
      showError('Erro ao carregar dados dos centros de custo');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, selectedCostCenterId, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleClose = () => {
    setOpen(false);
    setCurrentCostCenter(null);
  };

  const addPhone = () => {
    if (newPhone && !phones.includes(newPhone)) {
      setPhones([...phones, newPhone]);
      setNewPhone('');
    }
  };

  const removePhone = (tel: string) => {
    setPhones(phones.filter(t => t !== tel));
  };

  const handleSave = async () => {
    if (!isAdmin || !activeWorkspace?.id) return;
    try {
      if (currentCostCenter) {
        await apiClient.put(`/cost-centers/${currentCostCenter.id}`, {
          name,
          description,
          phones
        });
        showSuccess('Centro de custo atualizado com sucesso');
      } else {
        await apiClient.post('/cost-centers', {
          name,
          description,
          phones,
          workspaceId: activeWorkspace.id
        });
        showSuccess('Centro de custo criado com sucesso');
      }
      fetchData();
      handleClose();
    } catch (_err: unknown) {
      showError('Erro ao salvar centro de custo');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      try {
        await apiClient.delete(`/cost-centers/${id}`);
        if (selectedCostCenterId === id) setSelectedCostCenterId(null);
        showSuccess('Centro de custo excluído com sucesso');
        fetchData();
      } catch (_err: unknown) {
        showError('Erro ao excluir centro de custo');
      }
    }
  };

  const handleEditLine = (line: PhoneLine) => {
    setEditingLine(line);
    setOpenLines(true);
  };

  const handleSaveLine = async () => {
    if (!editingLine) return;
    try {
      await apiClient.put(`/phone-lines/${editingLine.id}`, {
        collaborator_id: editingLine.collaborator_id,
        cost_center_id: editingLine.cost_center_id,
        responsible_name: editingLine.responsible_name,
        responsible_id: editingLine.responsible_id
      });
      showSuccess('Vínculo da linha atualizado com sucesso');
      fetchData();
      setOpenLines(false);
    } catch (err) {
      showError('Erro ao salvar vínculo da linha');
    }
  };

  return (
    <Container maxWidth={false} sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Centros de Custo</Typography>
          <Typography variant="body1" color="textSecondary">
            Gerencie departamentos e aloque linhas telefônicas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<SettingsPhoneIcon />} 
            onClick={() => setOpenAllLines(true)}
          >
            Gerenciar Todas as Linhas
          </Button>
          {isAdmin && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpen()}
              sx={{ bgcolor: theme.palette.primary.main }}
            >
              Novo Centro de Custo
            </Button>
          )}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>
        {/* Lado Esquerdo: Centros de Custo (30%) */}
        <Paper sx={{ width: '30%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Lista de Centros de Custo</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
            ) : (
              <List disablePadding>
                {costCenters.map((cc) => (
                  <ListItemButton 
                    key={cc.id} 
                    selected={selectedCostCenterId === cc.id}
                    onClick={() => setSelectedCostCenterId(cc.id)}
                    sx={{ 
                      borderLeft: selectedCostCenterId === cc.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                      py: 1.5
                    }}
                  >
                    <ListItemText 
                      primary={cc.name} 
                      secondary={cc.code || cc.description} 
                      primaryTypographyProps={{ fontWeight: selectedCostCenterId === cc.id ? 700 : 500 }}
                    />
                    {isAdmin && (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpen(cc); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => handleDelete(cc.id, e)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </ListItemButton>
                ))}
                {costCenters.length === 0 && (
                  <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                    Nenhum centro de custo encontrado.
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </Paper>

        {/* Lado Direito: Linhas Telefônicas (70%) */}
        <Paper sx={{ width: '70%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Linhas Vinculadas: {selectedCC?.name || 'Selecione um Centro de Custo'}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Número do Telefone</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Colaborador / Responsável</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLines.map((line) => {
                  const coll = collaborators.find(c => c.id === line.collaborator_id);
                  return (
                    <TableRow key={line.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="disabled" />
                          {line.phone_number}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: coll ? 700 : 400 }}>
                          {coll ? coll.name : (line.responsible_name || '-')}
                        </Typography>
                        {coll && <Typography variant="caption" color="text.secondary">ID: {coll.id.substring(0, 8)}</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => handleEditLine(line)}>Editar Vínculo</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLines.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 10 }}>
                      <Typography variant="body1" color="text.disabled">
                        Nenhuma linha telefônica vinculada a este centro de custo.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      {/* Line Assignment Dialog */}
      <Dialog open={openLines} onClose={() => setOpenLines(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Phone Line</DialogTitle>
        <DialogContent dividers>
          {editingLine && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="h6" color="primary">{editingLine.phone_number}</Typography>
              
              <TextField
                select
                label="Collaborator"
                fullWidth
                SelectProps={{ native: true }}
                value={editingLine.collaborator_id || ''}
                onChange={(e) => setEditingLine({...editingLine, collaborator_id: e.target.value})}
              >
                <option value="">None</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </TextField>

              <TextField
                select
                label="Cost Center"
                fullWidth
                SelectProps={{ native: true }}
                value={editingLine.cost_center_id || ''}
                onChange={(e) => setEditingLine({...editingLine, cost_center_id: e.target.value})}
              >
                <option value="">None</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.name}</option>
                ))}
              </TextField>

              <TextField
                label="Legacy Responsible Name"
                fullWidth
                value={editingLine.responsible_name || ''}
                onChange={(e) => setEditingLine({...editingLine, responsible_name: e.target.value})}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLines(false)}>Cancel</Button>
          <Button onClick={handleSaveLine} variant="contained">Save Association</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>
          {currentCostCenter ? 'Edit Cost Center' : 'New Cost Center'}
        </DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              autoFocus label="Cost Center / Department Name"
              fullWidth value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Finance, IT, Sales..."
            />
            <TextField
              label="Description (Optional)"
              fullWidth multiline rows={2}
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Linked Phones</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {phones.map((tel) => (
                  <Chip
                    key={tel}
                    label={tel}
                    onDelete={() => removePhone(tel)}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
              <TextField
                label="New Phone Number"
                fullWidth
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={addPhone} edge="end">
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" size="large" sx={{ px: 4 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* All Lines Dialog */}
      <Dialog open={openAllLines} onClose={() => setOpenAllLines(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Manage All Phone Lines
          <Typography variant="body2" color="textSecondary">
            Total of {phoneLines.length} lines detected in invoices.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            placeholder="Search by phone number or responsible..."
            value={lineSearch}
            onChange={(e) => setLineSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon />
                </InputAdornment>
              ),
            }}
          />
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Phone Number</TableCell>
                  <TableCell>Responsible (Legacy)</TableCell>
                  <TableCell>Collaborator</TableCell>
                  <TableCell>Cost Center</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {phoneLines
                  .filter(l => 
                    l.phone_number.includes(lineSearch) || 
                    (l.responsible_name && l.responsible_name.toLowerCase().includes(lineSearch.toLowerCase()))
                  )
                  .map((line) => (
                    <TableRow key={line.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{line.phone_number}</TableCell>
                      <TableCell>{line.responsible_name || '-'}</TableCell>
                      <TableCell>
                        {collaborators.find(c => c.id === line.collaborator_id)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {costCenters.find(cc => cc.id === line.cost_center_id)?.name || (
                          <Typography variant="caption" color="error">Unassigned</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => handleEditLine(line)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                {phoneLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      No phone lines found. Try importing an invoice first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAllLines(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CentroCustoPage;
