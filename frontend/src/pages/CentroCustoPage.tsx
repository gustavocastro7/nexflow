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
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PhoneIcon from '@mui/icons-material/Phone';
import SettingsPhoneIcon from '@mui/icons-material/SettingsPhone';
import apiClient from '../api/client';
import type { Workspace, User, CostCenter } from '../types';

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
  const theme = useTheme();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [openLines, setOpenLines] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState<CostCenter | null>(null);
  const [editingLine, setEditingLine] = useState<PhoneLine | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');

  const getUser = (): User | null => {
    try {
      const userData = sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (_e: unknown) {
      return null;
    }
  };

  const getActiveWorkspace = (): Workspace | null => {
    try {
      const wsData = sessionStorage.getItem('activeWorkspace');
      return wsData ? JSON.parse(wsData) : null;
    } catch (_e: unknown) {
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
      setCostCenters(Array.isArray(ccRes.data) ? ccRes.data : []);
      setCollaborators(Array.isArray(collRes.data) ? collRes.data : []);
      setPhoneLines(Array.isArray(linesRes.data) ? linesRes.data : []);
    } catch (_err: unknown) {
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      } else {
        await apiClient.post('/cost-centers', {
          name,
          description,
          phones,
          workspaceId: activeWorkspace.id
        });
      }
      fetchData();
      handleClose();
    } catch (_err: unknown) {
      setError('Error saving cost center');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this cost center?')) {
      try {
        await apiClient.delete(`/cost-centers/${id}`);
        fetchData();
      } catch (_err: unknown) {
        setError('Error deleting cost center');
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
      fetchData();
      setOpenLines(false);
    } catch (err) {
      setError('Error saving line association');
    }
  };

  return (
    <Container maxWidth={false}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Cost Centers</Typography>
          <Typography variant="body1" color="textSecondary">
            Manage departments and link phone numbers for cost allocation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<SettingsPhoneIcon />} 
            onClick={() => setOpenAllLines(true)}
            size="large"
          >
            Manage Lines
          </Button>
          {isAdmin && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpen()}
              size="large"
            >
              New Cost Center
            </Button>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Department Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Linked Phones</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {costCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="textSecondary">No cost centers found yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                costCenters.map((costCenter) => (
                  <TableRow key={costCenter.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{costCenter.name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', maxWidth: 300 }}>{costCenter.description}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {phoneLines.filter(l => l.cost_center_id === costCenter.id).map((line) => (
                          <Tooltip key={line.id} title={`Resp: ${line.responsible_name || 'N/A'}`}>
                            <Chip 
                              label={line.phone_number} 
                              size="small" 
                              onClick={() => handleEditLine(line)}
                              icon={<PhoneIcon sx={{ fontSize: '0.9rem' }} />} 
                              variant="outlined"
                              sx={{ borderRadius: 1.5, fontWeight: 600, cursor: 'pointer' }}
                            />
                          </Tooltip>
                        ))}
                        {phoneLines.filter(l => l.cost_center_id === costCenter.id).length === 0 && (
                          <Typography variant="caption" color="text.disabled">No lines</Typography>
                        )}
                      </Box>
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton 
                              onClick={() => handleOpen(costCenter)} 
                              size="small" 
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              onClick={() => handleDelete(costCenter.id)} 
                              size="small" 
                              sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
