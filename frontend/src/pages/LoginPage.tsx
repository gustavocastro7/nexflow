import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes/routes';
import apiClient from '../api/client';
import type { User } from '../types';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', {
        email,
        password,
      });

      const { user, token } = response.data;
      sessionStorage.setItem('token', token);
      
      // Save user object as returned from backend (all in English)
      sessionStorage.setItem('user', JSON.stringify(user));

      // Apply saved preferences
      if (user.config) {
        if (user.config.theme_mode) {
          localStorage.setItem('themeMode', user.config.theme_mode);
        }
        if (user.config.language) {
          localStorage.setItem('i18nextLng', user.config.language);
        }
      }

      // Redirect to workspace selection
      navigate(ROUTES.WORKSPACES);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || t('login.error'));
      } else {
        setError(t('login.error'));
      }
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={4}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px solid #E2E8F0',
          }}
        >
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, width: '100%', boxSizing: 'border-box' }}>
            <img src="/logo.jpg" alt="Teleen Logo" style={{ height: 120, maxWidth: '100%', objectFit: 'contain' }} />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom color="primary" sx={{ fontWeight: 800 }}>
            {t('welcome')} - Teleen
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
            {t('login.subtitle')}
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('common.email')}
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              sx={{ bgcolor: '#F8FAFC' }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('common.password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              sx={{ bgcolor: '#F8FAFC' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={t('login.toggle_password_visibility')}
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 4, mb: 2, height: 50, fontSize: '1rem', fontWeight: 700 }}
            >
              {t('login.button')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
