import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Login as LoginIcon,
  Email,
  Lock,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';

const Login = ({ onLoginSuccess, loginFunction }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginFunction(email, password);
      
      if (result.success) {
        onLoginSuccess(result.usuario);
      } else {
        setError(result.error || 'Error en el login');
      }
    } catch (err) {
      
      if (err.message === 'Credenciales inválidas') {
        setError('Correo o contraseña incorrectos');
      } else if (err.message.includes('Failed to fetch')) {
        setError('No se pudo conectar con el servidor');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url('https://i.pinimg.com/736x/e0/4c/4f/e04c4f9207ea8c98ee199c4f43013947.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        p: 2
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(23, 23, 24, 0.85) 0%, rgba(31, 33, 36, 0.85) 50%, rgba(57, 61, 66, 0.8) 100%)',
          zIndex: 0
        }}
      />
      
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 480,
          width: '100%',
          borderRadius: 3,
          position: 'relative',
          zIndex: 1,
          background: 'rgba(31, 33, 36, 0.98)',
          border: '1px solid rgba(106, 110, 115, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6a6e73 0%, #9fa3a9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 20px rgba(106, 110, 115, 0.5)',
            }}
          >
            <LoginIcon sx={{ fontSize: 50, color: '#171718' }} />
          </Box>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 900, 
              color: '#9fa3a9',
              mb: 1,
              letterSpacing: '-0.5px'
            }}
          >
            SolitConnect
          </Typography>
          <Typography variant="body1" sx={{ color: '#6a6e73', fontWeight: 500, fontSize: '1rem' }}>
            Portal de Canvaceadores
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Correo Electrónico"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ 
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              color: '#9fa3a9',
              '& fieldset': { borderColor: '#393d42' },
              '&:hover fieldset': { borderColor: '#6a6e73' },
              '&.Mui-focused fieldset': { borderColor: '#9fa3a9' },
            },
            '& .MuiInputLabel-root': {
              color: '#6a6e73',
              '&.Mui-focused': { color: '#9fa3a9' },
            },
          }}
          placeholder="ejemplo@correo.com"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: '#6a6e73' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          sx={{ 
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: '#9fa3a9',
              '& fieldset': { borderColor: '#393d42' },
              '&:hover fieldset': { borderColor: '#6a6e73' },
              '&.Mui-focused fieldset': { borderColor: '#9fa3a9' },
            },
            '& .MuiInputLabel-root': {
              color: '#6a6e73',
              '&.Mui-focused': { color: '#9fa3a9' },
            },
          }}
          placeholder="••••••••"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: '#6a6e73' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#6a6e73' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleLogin}
          disabled={loading}
          sx={{
            py: 1.8,
            fontWeight: 800,
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, #9fa3a9 0%, #6a6e73 100%)',
            borderRadius: 2,
            boxShadow: '0 8px 20px rgba(159, 163, 169, 0.3)',
            color: '#171718',
            '&:hover': { 
              background: 'linear-gradient(135deg, #6a6e73 0%, #9fa3a9 100%)',
              boxShadow: '0 12px 28px rgba(159, 163, 169, 0.4)',
              transform: 'translateY(-2px)',
              transition: 'all 0.3s ease'
            },
            '&:disabled': {
              background: '#393d42',
              color: '#6a6e73'
            }
          }}
        >
          {loading ? (
            <CircularProgress size={28} sx={{ color: '#9fa3a9' }} />
          ) : (
            'INICIAR SESIÓN'
          )}
        </Button>

        <Typography
          variant="caption"
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 3,
            color: '#393d42',
            fontWeight: 500
          }}
        >
          © 2026 Solit System - Todos los derechos reservados
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;