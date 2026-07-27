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
import AgendaInstalaciones from './components/Dashboard/AgendaInstalaciones';
import TecnicoEjecucion from './components/Dashboard/TecnicoEjecucion';
import Comisiones from './components/Dashboard/Comisiones';
import AsignacionRutas from './components/Dashboard/AsignacionRutas';
import VentaChips from './components/Ventas/VentaChips';
import AsistenteFlotante from './components/AsistenteFlotante'; 

const drawerWidth = 260;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const loginUsuario = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios/`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    let usuarios = await response.json();
    if (!Array.isArray(usuarios)) {
      usuarios = usuarios.results || usuarios.data || [];
    }
    
    const emailLimpio = email.toLowerCase().trim();
    const passwordLimpia = password.trim();
    
    const usuarioEncontrado = usuarios.find(u => {
      const emailUsuario = (u.email || '').toLowerCase().trim();
      const passwordUsuario = (u.password || '').trim();
      return emailUsuario === emailLimpio && passwordUsuario === passwordLimpia;
    });
    
    if (!usuarioEncontrado) {
      throw new Error('Credenciales inválidas');
    }
    
    const rol = usuarioEncontrado.rol?.toLowerCase().trim();
    let perfilData = null;
    
    try {
      if (rol === 'canvaceador') {
        const canvResponse = await fetch(`${API_BASE_URL}/canvaceadores/`);
        let canvaceadores = await canvResponse.json();
        if (!Array.isArray(canvaceadores)) canvaceadores = canvaceadores.results || [];
        perfilData = canvaceadores.find(c => c.usuario_id === usuarioEncontrado.id);
      } else if (rol === 'tecnico') {
        const tecResponse = await fetch(`${API_BASE_URL}/tecnicos/`);
        let tecnicos = await tecResponse.json();
        if (!Array.isArray(tecnicos)) tecnicos = tecnicos.results || [];
        perfilData = tecnicos.find(t => t.usuario_id === usuarioEncontrado.id);
      } else if (rol === 'supervisor') {
        const supResponse = await fetch(`${API_BASE_URL}/supervisores/`);
        let supervisores = await supResponse.json();
        if (!Array.isArray(supervisores)) supervisores = supervisores.results || [];
        perfilData = supervisores.find(s => s.usuario_id === usuarioEncontrado.id);
      }
    } catch (err) {
    }
    
    const resultado = {
      success: true,
      usuario: {
        id: usuarioEncontrado.id,
        nombre: `${usuarioEncontrado.nombre} ${usuarioEncontrado.apellido}`,
        email: usuarioEncontrado.email,
        rol: rol,
        perfil_id: perfilData?.id || usuarioEncontrado.id,
        numero_empleado: perfilData?.numero_empleado || null
      }
    };
    
    return resultado;
    
  } catch (error) {
    throw error;
  }
};

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [currentView, setCurrentView] = useState('canvaceo-dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_actual');
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      setUsuarioActual(usuario);
      const primeraRuta = obtenerPrimeraRuta(usuario.rol);
      setCurrentView(primeraRuta);
    }
  }, []);

  const handleLoginSuccess = (datosUsuario) => {
    localStorage.setItem('usuario_actual', JSON.stringify(datosUsuario));
    setUsuarioActual(datosUsuario);
    const primeraRuta = obtenerPrimeraRuta(datosUsuario.rol);
    setCurrentView(primeraRuta);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario_actual');
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
      case 'ventas-de-chips': return <VentaChips usuarioActual={usuarioActual} />;
      case 'logistica-agenda': return <AgendaInstalaciones usuarioActual={usuarioActual} />;
      case 'tecnico-ejecucion': return <TecnicoEjecucion usuarioActual={usuarioActual} />;
      case 'admin-comisiones': return <Comisiones usuarioActual={usuarioActual} />;
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