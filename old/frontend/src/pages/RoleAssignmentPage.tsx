import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import apiClient from '../api/client';

const RoleAssignmentPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiClient.post('/roles/assign', {
        userId,
        roleName,
      });

      setSuccess('Papel atribuído com sucesso!');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Erro ao atribuir papel');
      } else {
        setError('Erro ao atribuir papel');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, backgroundColor: '#1a1a1a', border: '1px solid #556b2f' }}>
        <Typography variant="h5" gutterBottom color="primary">
          Atribuição de Papéis
        </Typography>
        
        <Box component="form" onSubmit={handleAssign} sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <TextField
            fullWidth
            label="ID do Usuário"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="Ex: UUID do usuário"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="role-label">Papel</InputLabel>
            <Select
              labelId="role-label"
              value={roleName}
              label="Papel"
              onChange={(e) => setRoleName(e.target.value)}
            >
              <MenuItem value="jedi">Jedi</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, backgroundColor: '#556b2f', '&:hover': { backgroundColor: '#4b5d29' } }}
          >
            {loading ? <CircularProgress size={24} /> : 'Atribuir Papel'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RoleAssignmentPage;
