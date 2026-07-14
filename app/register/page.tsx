'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box, Button, TextField, Typography, Paper, Container, Alert, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { apiPost } from '../../lib/api/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiPost('/auth/register', { name, email, password });
      setSuccess('User registered successfully! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error during registration');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={4} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 3, border: '1px solid #E2E8F0' }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ fontWeight: 800 }}>
            Teleen
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
            Create your account
          </Typography>

          <Box component="form" onSubmit={handleRegister} sx={{ mt: 1, width: '100%' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <TextField margin="normal" required fullWidth id="name" label="Full Name" name="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} variant="outlined" />
            <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} variant="outlined" />
            <TextField margin="normal" required fullWidth name="password" label="Password" type={showPassword ? 'text' : 'password'} id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} variant="outlined" slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}} />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 4, mb: 2, borderRadius: 2, py: 1.5, fontWeight: 700, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
              Sign Up
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Already have an account?{' '}
                <Link href="/login" style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 600 }}>Log In</Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
