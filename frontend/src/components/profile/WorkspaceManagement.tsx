import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
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
  MenuItem,
  alpha,
  useTheme,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '../../api/client';
import type { Workspace } from '../../types';

interface ExtendedWorkspace extends Workspace {
  status: string;
}

const WorkspaceManagement: React.FC = () => {
  const theme = useTheme();
  const [workspaces, setWorkspaces] = useState<ExtendedWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [currentWS, setCurrentWS] = useState<ExtendedWorkspace | null>(null);
  const [name, setName] = useState('');
  const [schema_name, setSchemaName] = useState('');
  const [status, setStatus] = useState('active');

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await apiClient.get<ExtendedWorkspace[]>('/workspaces');
      setWorkspaces(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError('Error loading workspaces. Check if you have Master Admin permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleOpen = (ws: ExtendedWorkspace | null = null) => {
    setCurrentWS(ws);
    setName(ws ? ws.name : '');
    setSchemaName(ws ? ws.schema_name : '');
    setStatus(ws ? ws.status : 'active');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentWS(null);
  };

  const handleSave = async () => {
    try {
      if (currentWS) {
        await apiClient.put(`/workspaces/${currentWS.id}`, {
          name,
          status
        });
      } else {
        await apiClient.post('/workspaces', {
          name,
          schema_name
        });
      }
      fetchWorkspaces();
      handleClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Error saving workspace');
      } else {
        setError('Error saving workspace');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workspace? This is irreversible.')) {
      try {
        await apiClient.delete(`/workspaces/${id}`);
        fetchWorkspaces();
      } catch (err: unknown) {
        setError('Error deleting workspace');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>All Workspaces</Typography>
          <Typography variant="body2" color="textSecondary">Manage all tenant environments (Jedi only).</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          New Workspace
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Workspace Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Schema Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspaces.map((ws) => (
                <TableRow key={ws.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{ws.name}</TableCell>
                  <TableCell><code>{ws.schema_name}</code></TableCell>
                  <TableCell>
                    <Box sx={{ 
                      display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 700,
                      bgcolor: ws.status === 'active' ? alpha('#10B981', 0.1) : alpha('#F59E0B', 0.1),
                      color: ws.status === 'active' ? '#10B981' : '#F59E0B',
                      textTransform: 'uppercase'
                    }}>{ws.status}</Box>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton onClick={() => handleOpen(ws)} size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(ws.id)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {currentWS ? 'Edit Workspace' : 'New Workspace'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Workspace Name" fullWidth
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Matrix Company"
            />
            {!currentWS && (
              <TextField
                label="Database Schema" fullWidth
                value={schema_name} onChange={(e) => setSchemaName(e.target.value)}
                placeholder="Ex: matrix_corp"
                helperText="Must be unique and without spaces"
              />
            )}
            {currentWS && (
              <TextField
                select label="Status" fullWidth
                value={status} onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ px: 4 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceManagement;
