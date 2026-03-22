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
import apiClient from '../api/client';
import type { Workspace, User, CostCenter } from '../types';

const CentroCustoPage: React.FC = () => {
  const theme = useTheme();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState<CostCenter | null>(null);
  
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

  const fetchCostCenters = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const response = await apiClient.get<CostCenter[]>(`/cost-centers?workspaceId=${activeWorkspace.id}`);
      setCostCenters(Array.isArray(response.data) ? response.data : []);
    } catch (_err: unknown) {
      setError('Error loading cost centers');
      setCostCenters([]);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

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
      fetchCostCenters();
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
        fetchCostCenters();
      } catch (_err: unknown) {
        setError('Error deleting cost center');
      }
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
                        {Array.isArray(costCenter.phones) && costCenter.phones.map((tel: string) => (
                          <Chip 
                            key={tel} 
                            label={tel} 
                            size="small" 
                            icon={<PhoneIcon sx={{ fontSize: '0.9rem' }} />} 
                            variant="outlined"
                            sx={{ borderRadius: 1.5, fontWeight: 600 }}
                          />
                        ))}
                        {(!costCenter.phones || costCenter.phones.length === 0) && (
                          <Typography variant="caption" color="text.disabled">No phones</Typography>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Link Phone Numbers
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small" fullWidth placeholder="Numbers only (Ex: 11988887777)"
                  value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment>
                  }}
                />
                <Button variant="outlined" onClick={addPhone} sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}>
                  Add
                </Button>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2, minHeight: 120, bgcolor: alpha(theme.palette.text.primary, 0.02), borderRadius: 3, borderStyle: 'dashed' }}>
                {phones.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                    <PhoneIcon sx={{ mb: 1 }} />
                    <Typography variant="body2">No phones added yet.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {phones.map((tel) => (
                      <Chip 
                        key={tel} label={tel} 
                        onDelete={() => removePhone(tel)} 
                        color="primary" variant="outlined"
                        sx={{ borderRadius: 1.5, fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                )}
              </Paper>
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
    </Container>
  );
};

export default CentroCustoPage;
