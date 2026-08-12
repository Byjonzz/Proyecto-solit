import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem, Divider, ListItemIcon, Chip } from '@mui/material';
import { Menu as MenuIcon, Logout, Person } from '@mui/icons-material';
import Sidebar from './components/Sidebar/Sidebar';
import Login from './components/Login/Login';
import { obtenerPrimeraRuta, obtenerNombreRol, obtenerColorRol } from './config/roles';
import RutaProtegida from './components/ProtectedRoute/RutaProtegida';
import GestionPlanes from './components/Admin/GestionPlanes';
import MapaCobertura from './components/Dashboard/MapaCobertura';
import NuevoProspect from './components/Forms/NuevoProspect';
import CanvaceadorRuta from './components/Dashboard/CanvaceadorRuta';
import PlanCotizacion from './components/Ventas/PlanCotizacion';
import SegumientoProspecto from './components/Ventas/SegumientoProspecto';
import MisContratos from './components/Ventas/MisContratos';
import AgendaInstalaciones from './components/Dashboard/AgendaInstalaciones';
import TecnicoEjecucion from './components/Dashboard/TecnicoEjecucion';
import Comisiones from './components/Dashboard/Comisiones';
import BonoProactividad from './components/Dashboard/BonoProactividad';
import AsignacionRutas from './components/Dashboard/AsignacionRutas';
import VentaChips from './components/Ventas/VentaChips';
import AsistenteFlotante from './components/AsistenteFlotante';
import api from './services/api';

const drawerWidth = 260;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const loginUsuario = async (email, password) => {
  const respuesta = await fetch(`${API_BASE_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password })
  });

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error('El servidor no respondió correctamente. Intenta de nuevo.');
  }

  if (!respuesta.ok) {
    throw new Error(datos?.error || 'Correo o contraseña incorrectos');
  }

  localStorage.setItem('auth_token', datos.token);

  return { success: true, usuario: datos.usuario };
};

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [currentView, setCurrentView] = useState('canvaceo-dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_actual');
    const token = localStorage.getItem('auth_token');

    if (!usuarioGuardado || !token) {
      localStorage.removeItem('usuario_actual');
      localStorage.removeItem('auth_token');
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);
    setUsuarioActual(usuario);
    setCurrentView(obtenerPrimeraRuta(usuario.rol));

    api.get('/yo/')
      .then(({ data }) => {
        localStorage.setItem('usuario_actual', JSON.stringify(data));
        setUsuarioActual(data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('usuario_actual');
          localStorage.removeItem('auth_token');
          setUsuarioActual(null);
        }
      });
  }, []);

  const handleLoginSuccess = (datosUsuario) => {
    localStorage.setItem('usuario_actual', JSON.stringify(datosUsuario));
    setUsuarioActual(datosUsuario);
    const primeraRuta = obtenerPrimeraRuta(datosUsuario.rol);
    setCurrentView(primeraRuta);
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout/');
    } catch {
    }
    localStorage.removeItem('usuario_actual');
    localStorage.removeItem('auth_token');
    setUsuarioActual(null);
    setAnchorEl(null);
    setCurrentView('canvaceo-dashboard');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (ruta) => {
    setCurrentView(ruta);
  };

  if (!usuarioActual) {
    return <Login onLoginSuccess={handleLoginSuccess} loginFunction={loginUsuario} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'canvaceo-dashboard': return <MapaCobertura usuarioActual={usuarioActual} />;
      case 'canvaceo-registro': return <NuevoProspect usuarioActual={usuarioActual} />;
      case 'canvaceo-ruta': return <CanvaceadorRuta usuarioActual={usuarioActual} />;
      case 'ventas-contrato-directo': return <PlanCotizacion usuarioActual={usuarioActual} />;
      case 'ventas-seguimiento': return <SegumientoProspecto usuarioActual={usuarioActual} />;
      case 'ventas-mis-contratos': return <MisContratos usuarioActual={usuarioActual} />;
      case 'ventas-de-chips': return <VentaChips usuarioActual={usuarioActual} />;
      case 'logistica-agenda': return <AgendaInstalaciones usuarioActual={usuarioActual} />;
      case 'tecnico-ejecucion': return <TecnicoEjecucion usuarioActual={usuarioActual} />;
      case 'admin-comisiones': return <Comisiones usuarioActual={usuarioActual} />;
      case 'admin-bono-proactividad': return <BonoProactividad usuarioActual={usuarioActual} />;
      case 'admin-asignacion-rutas': return <AsignacionRutas usuarioActual={usuarioActual} />;
      case 'admin-rutas': return <AsignacionRutas usuarioActual={usuarioActual} />;
      case 'admin-planes': return <GestionPlanes usuarioActual={usuarioActual} />;
      default: return <MapaCobertura usuarioActual={usuarioActual} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <CssBaseline />
      
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          display: { md: 'none' },
          backgroundColor: '#0f172a'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            SolitConnect
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        usuario={usuarioActual}
      />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, md: 4 }, 
          mt: { xs: 7, md: 0 }, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          overflowY: 'auto',
          minHeight: '100vh',
          position: 'relative' 
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mb: 3,
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {usuarioActual.nombre}
            </Typography>
            <Chip
              label={obtenerNombreRol(usuarioActual.rol)}
              size="small"
              sx={{
                bgcolor: obtenerColorRol(usuarioActual.rol),
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 20,
                mt: 0.5
              }}
            />
          </Box>
          
          <Avatar 
            id="user-menu-avatar"
            sx={{ 
              bgcolor: obtenerColorRol(usuarioActual.rol), 
              cursor: 'pointer',
              width: 44,
              height: 44,
              fontWeight: 700,
              fontSize: '1.2rem'
            }}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            {usuarioActual.nombre?.charAt(0) || 'U'}
          </Avatar>
          
          {anchorEl && (
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  elevation: 3,
                  sx: {
                    minWidth: 220,
                    mt: 1,
                    overflow: 'visible',
                    borderRadius: 2,
                    '&:before': {
                      content: '""', display: 'block', position: 'absolute', top: 0,
                      right: 14, width: 10, height: 10, bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)', zIndex: 0,
                    },
                  },
                },
              }}
            >
              <MenuItem disabled sx={{ opacity: 1 }}>
                <ListItemIcon>
                  <Person fontSize="small" color="action" />
                </ListItemIcon>
                <Typography variant="body2" noWrap sx={{ maxWidth: 180, color: 'text.secondary' }}>
                  {usuarioActual.email}
                </Typography>
              </MenuItem>
              {usuarioActual.numero_empleado && (
                <MenuItem disabled sx={{ opacity: 1, pt: 0 }}>
                  <ListItemIcon>
                    <Person fontSize="small" color="action" />
                  </ListItemIcon>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Empleado: {usuarioActual.numero_empleado}
                  </Typography>
                </MenuItem>
              )}
              <Divider />
              <MenuItem 
                onClick={handleLogout}
                sx={{ 
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', color: 'white' }
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" color="error" />
                </ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          )}
        </Box>

        <RutaProtegida
          usuario={usuarioActual}
          rutaActual={currentView}
          onNavigate={handleNavigate}
        >
          {renderContent()}
        </RutaProtegida>
        <AsistenteFlotante />
      </Box>
    </Box>
  );
}

export default App;