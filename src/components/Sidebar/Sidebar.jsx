import React from 'react';
import {
  Drawer,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard,
  PersonAdd,
  Route,
  Description,
  TrendingUp,
  CalendarToday,
  Build,
  AttachMoney,
  EmojiEvents,
  Map,
  Settings,
  People,
  SimCard,
  FactCheck
} from '@mui/icons-material';
import { puedeAccederARuta, obtenerNombreRol, obtenerColorRol } from '../../config/roles';

const drawerWidth = 260;

const MENU_ITEMS = [
  {
    section: 'CANVACEO',
    items: [
      { text: 'Cobertura', icon: <Dashboard />, key: 'canvaceo-dashboard' },
      { text: 'Nuevo Prospecto', icon: <PersonAdd />, key: 'canvaceo-registro' },
      { text: 'Rutas', icon: <Route />, key: 'canvaceo-ruta' }
    ]
  },
  {
    section: 'VENTAS',
    items: [
      { text: 'Contrato Directo', icon: <Description />, key: 'ventas-contrato-directo' },
      { text: 'Seguimiento Prospectos', icon: <TrendingUp />, key: 'ventas-seguimiento' },
      { text: 'Mis Contratos', icon: <FactCheck />, key: 'ventas-mis-contratos' },
      { text: 'Ventas de Chips', label: 'Gestión de Chips SIM', icon: <SimCard />, view: 'ventas-de-chips', key: 'ventas-de-chips' }
    ]
  },
  {
    section: 'LOGÍSTICA',
    items: [
      { text: 'Agenda Instalaciones', icon: <CalendarToday />, key: 'logistica-agenda' }
    ]
  },
  {
    section: 'TÉCNICO',
    items: [
      { text: 'Ejecución', icon: <Build />, key: 'tecnico-ejecucion' }
    ]
  },
  {
    section: 'ADMINISTRACIÓN VENTAS',
    items: [
      { text: 'Comisiones', icon: <AttachMoney />, key: 'admin-comisiones' },
      { text: 'Bono Proactividad', icon: <EmojiEvents />, key: 'admin-bono-proactividad' },
      { text: 'Asignación Rutas', icon: <Map />, key: 'admin-asignacion-rutas' }
    ]
  },
  {
    section: 'ADMINISTRACIÓN GENERAL',
    items: [
      { text: 'Planes', icon: <Settings />, key: 'admin-planes' },
    ]
  }
];

const Sidebar = ({ currentView, setCurrentView, mobileOpen, handleDrawerToggle, usuario }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItemsFiltrados = MENU_ITEMS.map(seccion => ({
    ...seccion,
    items: seccion.items.filter(item => puedeAccederARuta(usuario?.rol, item.key))
  })).filter(seccion => seccion.items.length > 0);

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <Toolbar sx={{
        justifyContent: 'space-between',
        px: 2,
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        minHeight: '64px !important'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>
              S
            </Typography>
          </Box>
          <Typography variant="h6" noWrap sx={{ fontWeight: 800, color: 'white' }}>
            SolitConnect
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>

      {usuario && (
        <Box sx={{
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
            {usuario.nombre}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              label={obtenerNombreRol(usuario.rol)}
              size="small"
              sx={{
                background: obtenerColorRol(usuario.rol),
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22
              }}
            />
            {usuario.numero_empleado && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {usuario.numero_empleado}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 1, py: 2 }}>
        {menuItemsFiltrados.map((seccion, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                px: 2,
                py: 0.5,
                display: 'block',
                letterSpacing: '0.1em',
                fontSize: '0.7rem'
              }}
            >
              {seccion.section}
            </Typography>
            {seccion.items.map((item) => {
              const isActive = currentView === item.key;
              return (
                <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => {
                      setCurrentView(item.key);
                      if (isMobile) handleDrawerToggle();
                    }}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                      px: 2,
                      background: isActive
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'transparent',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      '&:hover': {
                        background: isActive
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(255,255,255,0.08)',
                        color: 'white'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ListItemIcon sx={{
                      color: 'inherit',
                      minWidth: 36
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      slotProps={{
                        primary: {
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 700 : 500
                        }
                      }}
                    />

                  </ListItemButton>
                </ListItem>
              );
            })}
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRight: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;