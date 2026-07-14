'use client';

import { useState } from 'react';
import { Box, Button, Typography, Paper, Container, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { apiPost } from '../../../lib/api/client';

export default function RoleAssignmentPage() {
  const [userId, setUserId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await apiPost('/roles/assign', { userId, roleName });
      setSuccess('Papel atribuído com sucesso!');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atribuir papel');
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom color="primary" sx={{ fontWeight: 800 }}>
          Atribuição de Papéis
        </Typography>

        <Box component="form" onSubmit={handleAssign} sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <TextField fullWidth label="ID do Usuário" value={userId} onChange={(e) => setUserId(e.target.value)} margin="normal" variant="outlined" placeholder="Ex: UUID do usuário" />

          <FormControl fullWidth margin="normal">
            <InputLabel id="role-label">Papel</InputLabel>
            <Select labelId="role-label" value={roleName} label="Papel" onChange={(e) => setRoleName(e.target.value)}>
              <MenuItem value="jedi">Jedi</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>

          <Button type="submit" variant="contained" disabled={loading} sx={{ mt: 3 }}>
            {loading ? <CircularProgress size={24} /> : 'Atribuir Papel'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
