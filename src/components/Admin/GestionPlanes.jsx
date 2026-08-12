import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Chip, Alert, Tabs, Tab, Divider, Tooltip, Switch, FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  Add, Edit, Delete, Save, Close, Speed, CheckCircle, PhoneAndroid, Router
} from '@mui/icons-material';
import api from '../../services/api';
import { useCategorias } from '../../hooks/useCategorias';
import {
  categoriasCatalogoService, AMBITOS, ICONOS_CATEGORIA, VISTAS_CATEGORIA
} from '../../services/categoriasCatalogoService';

const FORM_CATEGORIA_VACIO = {
  nombre: '',
  color: '#1976d2',
  descripcion: '',
  icono: 'fibra',
  vista: 'tarjetas',
  orden: '',
  activo: true
};

const COLORES_PASTEL = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#E0BBE4', '#FFD1DC', '#C1F0C1', '#D4BBFF', '#FFCBA4',
  '#AFEEEE', '#FFC0CB', '#F0E68C', '#DDA0DD', '#98FB98',
  '#B0E0E6', '#F5DEB3', '#FFE4B5', '#D8BFD8', '#E6E6FA'
];

const getColorFromName = (nombre) => {
  if (!nombre) return COLORES_PASTEL[0];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    const char = nombre.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % COLORES_PASTEL.length;
  return COLORES_PASTEL[index];
};

const getLuminance = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

const getContrastTextColor = (backgroundColor) => {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
};

const getBadgeColor = (backgroundColor) => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  if (r > g && r > b && g > b * 0.8) return '#1e40af';
  if (b > r && b > g) return '#be185d';
  if (g > r && g > b) return '#6b21a8';
  if (r > 200 && g > 200 && b < 200) return '#1e3a8a';
  if (r > b && b > g) return '#166534';
  return '#7c2d12';
};

const GestionPlanes = ({ usuarioActual }) => {
  const [planesInternet, setPlanesInternet] = useState([]);
  const [planesSim, setPlanesSim] = useState([]);
  
  const [categoriaActivaInternet, setCategoriaActivaInternet] = useState(0);
  const [categoriaActivaChip, setCategoriaActivaChip] = useState(0);

  const { categorias: catalogoInternet, refetch: refetchInternet } = useCategorias(AMBITOS.INTERNET);
  const { categorias: catalogoChips, refetch: refetchChips } = useCategorias(AMBITOS.CHIP);

  const [dialogoCategorias, setDialogoCategorias] = useState(null);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [formCategoria, setFormCategoria] = useState(FORM_CATEGORIA_VACIO);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoModal, setTipoModal] = useState('internet');
  const [planEditando, setPlanEditando] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    precio: '',
    descarga: '',
    subida: '',
    velocidad: '',
    simetrica: true,
    canales: '',
    datos: '',
    llamadas: '',
    sms: '',
    beneficios: '',
    ift: '',
    destacado: false,
    activo: true
  });

  useEffect(() => {
    cargarPlanes();
  }, []);

  const cargarPlanes = async () => {
    try {
      setLoading(true);
      
      const responseInternet = await api.get('/planes/');
      setPlanesInternet(responseInternet.data);
      
      try {
        const responseSim = await api.get('/sims/');
        setPlanesSim(responseSim.data);
      } catch (e) {
        setPlanesSim([]);
      }
      
    } catch (error) {
      console.error('Error al cargar planes:', error);
      mostrarMensaje('Error al cargar los planes desde el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const handleOpenDialogInternet = (plan = null) => {
    setTipoModal('internet');
    if (plan) {
      setPlanEditando(plan);
      setFormData({ 
        nombre: plan.nombre || '',
        categoria: plan.categoria || categoriasInternetList[0] || '',
        precio: plan.precio || '',
        descarga: plan.descarga || '',
        subida: plan.subida || '',
        velocidad: plan.velocidad || '',
        simetrica: plan.simetrica !== undefined ? plan.simetrica : true,
        canales: plan.canales || '',
        ift: plan.ift || '',
        destacado: plan.destacado !== undefined ? plan.destacado : false,
        activo: plan.activo !== undefined ? plan.activo : true
      });
      setModoEdicion(true);
    } else {
      setPlanEditando(null);
      setFormData({
        nombre: '',
        categoria: categoriasInternetList[categoriaActivaInternet] || '',
        precio: '',
        descarga: '',
        subida: '',
        velocidad: '',
        simetrica: true,
        canales: '',
        ift: '',
        destacado: false,
        activo: true
      });
      setModoEdicion(false);
    }
    setDialogOpen(true);
  };

  const handleOpenDialogChip = (plan = null) => {
    setTipoModal('chip');
    if (plan) {
      setPlanEditando(plan);
      setFormData({ 
        nombre: plan.nombre || '',
        categoria: plan.categoria || categoriasChipsList[0] || '',
        precio: plan.precio || '',
        datos: plan.datos || plan.descarga || '',
        llamadas: plan.llamadas || plan.subida || '',
        sms: plan.sms || plan.velocidad || '',
        beneficios: plan.beneficios || plan.canales || '',
        ift: plan.ift || '',
        destacado: plan.destacado !== undefined ? plan.destacado : false,
        activo: plan.activo !== undefined ? plan.activo : true
      });
      setModoEdicion(true);
    } else {
      setPlanEditando(null);
      setFormData({
        nombre: '',
        categoria: categoriasChipsList[categoriaActivaChip] || '',
        precio: '',
        datos: '',
        llamadas: 'Ilimitadas',
        sms: '',
        beneficios: 'Redes sociales ilimitadas, Comparte Internet',
        ift: '',
        destacado: false,
        activo: true
      });
      setModoEdicion(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setPlanEditando(null);
    setModoEdicion(false);
  };

  const handleSavePlan = async () => {
    if (!formData.nombre || !formData.precio || !formData.ift) {
      mostrarMensaje('Nombre, precio e IFT son obligatorios', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let planData;
      let endpoint;
      
      if (tipoModal === 'internet') {
        endpoint = '/planes/';
        planData = {
          nombre: formData.nombre.trim(),
          categoria: formData.categoria,
          precio: parseFloat(formData.precio).toFixed(2),
          descarga: formData.descarga?.toString().trim() || '0',
          subida: formData.subida?.toString().trim() || '0',
          velocidad: formData.velocidad?.toString().trim() || '0',
          simetrica: formData.simetrica,
          canales: formData.canales?.trim() || null,
          ift: formData.ift.trim(),
          destacado: formData.destacado,
          activo: formData.activo
        };
      } else {
        endpoint = '/sims/';
        
        const idEmpleado = Number(usuarioActual?.perfil_id || usuarioActual?.id || 1);
        const rolEmpleado = String(usuarioActual?.rol || '').toLowerCase().trim();
        
        planData = {
          nombre: formData.nombre.trim(),
          categoria: formData.categoria,
          precio: parseFloat(formData.precio).toFixed(2),
          datos: formData.datos?.toString().trim() || '0',
          llamadas: formData.llamadas?.toString().trim() || '0',
          sms: formData.sms?.toString().trim() || '0',
          beneficios: formData.beneficios?.trim() || null,
          ift: formData.ift.trim(),
          destacado: formData.destacado,
          activo: formData.activo,
          canvaceador_id: rolEmpleado === 'canvaceador' ? idEmpleado : 1,
          tecnico_id: rolEmpleado === 'tecnico' ? idEmpleado : 1
        };
      }

      let response;
      if (modoEdicion && planEditando) {
        response = await api.put(`${endpoint}${planEditando.id}/`, planData);
        
        if (tipoModal === 'internet') {
          setPlanesInternet(planesInternet.map(p => p.id === planEditando.id ? response.data : p));
        } else {
          setPlanesSim(planesSim.map(p => p.id === planEditando.id ? response.data : p));
        }
        mostrarMensaje('Plan actualizado correctamente', 'success');
      } else {
        response = await api.post(endpoint, planData);
        
        if (tipoModal === 'internet') {
          setPlanesInternet([...planesInternet, response.data]);
        } else {
          setPlanesSim([...planesSim, response.data]);
        }
        mostrarMensaje('Plan creado correctamente', 'success');
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error al guardar:', error);
      if (error.response?.data) {
        console.error('Detalles del error:', error.response.data);
        const errores = Object.entries(error.response.data)
          .map(([campo, mensajes]) => `• ${campo}: ${Array.isArray(mensajes) ? mensajes.join(', ') : mensajes}`)
          .join('\n');
        mostrarMensaje(`Error de validación:\n${errores}`, 'error');
      } else {
        mostrarMensaje('Error al guardar el plan. Verifica tu conexión o que el IFT sea único.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId, tipo) => {
    if (window.confirm('¿Estás seguro de eliminar este plan? Esta acción no se puede deshacer.')) {
      try {
        setLoading(true);
        const endpoint = tipo === 'internet' ? '/planes/' : '/sims/';
        
        await api.delete(`${endpoint}${planId}/`);
        
        if (tipo === 'internet') {
          setPlanesInternet(planesInternet.filter(p => p.id !== planId));
        } else {
          setPlanesSim(planesSim.filter(p => p.id !== planId));
        }
        mostrarMensaje('Plan eliminado correctamente', 'success');
      } catch (error) {
        mostrarMensaje('Error al eliminar el plan', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleActivo = async (planId, tipo) => {
    try {
      const lista = tipo === 'internet' ? planesInternet : planesSim;
      const plan = lista.find(p => p.id === planId);
      if (!plan) return;
      
      const nuevoEstado = !plan.activo;
      const endpoint = tipo === 'internet' ? '/planes/' : '/sims/';
      
      const response = await api.patch(`${endpoint}${planId}/`, { activo: nuevoEstado });
      
      if (tipo === 'internet') {
        setPlanesInternet(planesInternet.map(p => p.id === planId ? response.data : p));
      } else {
        setPlanesSim(planesSim.map(p => p.id === planId ? response.data : p));
      }
      mostrarMensaje(`Plan ${nuevoEstado ? 'activado' : 'desactivado'}`, 'success');
    } catch (error) {
      mostrarMensaje('Error al cambiar el estado del plan', 'error');
    }
  };

  const getCardColorInternet = (categoria) =>
    catalogoInternet.find(c => c.nombre === categoria)?.color || '#1976d2';

  const categoriasInternetList = catalogoInternet.map(c => c.nombre);
  const planesInternetFiltrados = planesInternet.filter(p => p.categoria === categoriasInternetList[categoriaActivaInternet]);

  const categoriasChipsList = catalogoChips.map(c => c.nombre);
  const planesChipsFiltrados = planesSim.filter(p => p.categoria === categoriasChipsList[categoriaActivaChip]);

  const categoriaDelFormulario = catalogoInternet.find(c => c.nombre === formData.categoria);
  const categoriaEsTabla = (categoriaDelFormulario?.vista || 'tarjetas') === 'tabla';

  const catalogoActivo = dialogoCategorias === AMBITOS.CHIP ? catalogoChips : catalogoInternet;

  const abrirCategorias = (ambito) => {
    setDialogoCategorias(ambito);
    setCategoriaEditando(null);
    setFormCategoria(FORM_CATEGORIA_VACIO);
  };

  const editarCategoria = (cat) => {
    setCategoriaEditando(cat);
    setFormCategoria({
      nombre: cat.nombre || '',
      color: cat.color || '#1976d2',
      descripcion: cat.descripcion || '',
      icono: cat.icono || 'fibra',
      vista: cat.vista || 'tarjetas',
      orden: cat.orden ?? 0,
      activo: cat.activo !== undefined ? cat.activo : true
    });
  };

  const refrescarCatalogo = async () => {
    await Promise.all([refetchInternet(), refetchChips()]);
    await cargarPlanes();
  };

  const guardarCategoria = async () => {
    const nombre = formCategoria.nombre.trim();
    if (!nombre) {
      mostrarMensaje('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    setGuardandoCategoria(true);
    try {
      const datos = {
        ...formCategoria,
        nombre,
        ambito: dialogoCategorias,
        orden: Number(formCategoria.orden) || 0
      };

      if (categoriaEditando) {
        await categoriasCatalogoService.actualizar(categoriaEditando.id, datos);
        mostrarMensaje(
          categoriaEditando.nombre !== nombre
            ? `Categoría renombrada a "${nombre}". Sus planes se actualizaron solos.`
            : 'Categoría actualizada',
          'success'
        );
      } else {
        await categoriasCatalogoService.crear({
          ...datos,
          orden: formCategoria.orden === '' ? catalogoActivo.length : datos.orden
        });
        mostrarMensaje(`Categoría "${nombre}" creada`, 'success');
      }

      setCategoriaEditando(null);
      setFormCategoria(FORM_CATEGORIA_VACIO);
      await refrescarCatalogo();
    } catch (error) {
      const datosError = error.response?.data;
      const detalle = datosError ? JSON.stringify(datosError) : error.message;
      mostrarMensaje('No se pudo guardar la categoría: ' + detalle, 'error');
    } finally {
      setGuardandoCategoria(false);
    }
  };

  const eliminarCategoria = async (cat) => {
    if (cat.total_items > 0) {
      mostrarMensaje(
        `"${cat.nombre}" tiene ${cat.total_items} plan(es). Muévelos a otra categoría o desactívala en vez de borrarla.`,
        'error'
      );
      return;
    }
    try {
      await categoriasCatalogoService.eliminar(cat.id);
      mostrarMensaje(`Categoría "${cat.nombre}" eliminada`, 'success');
      if (categoriaEditando?.id === cat.id) {
        setCategoriaEditando(null);
        setFormCategoria(FORM_CATEGORIA_VACIO);
      }
      await refrescarCatalogo();
    } catch (error) {
      mostrarMensaje('No se pudo eliminar la categoría', 'error');
    }
  };


  if (loading && planesInternet.length === 0 && planesSim.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando catálogo general...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {mensaje && (
        <Alert severity={mensaje.tipo} sx={{ mb: 3, whiteSpace: 'pre-line' }}>
          {mensaje.texto}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Router fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Administración de Planes (Internet)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los planes de internet de casa, velocidades y Solit+TV
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Tabs
          value={Math.min(categoriaActivaInternet, Math.max(categoriasInternetList.length - 1, 0))}
          onChange={(e, newValue) => setCategoriaActivaInternet(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1, minWidth: 240 }}
        >
          {categoriasInternetList.map((cat, idx) => (
            <Tab key={idx} label={cat} />
          ))}
        </Tabs>
        <Button
          variant="outlined" startIcon={<Edit />}
          onClick={() => abrirCategorias(AMBITOS.INTERNET)}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          Categorías
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {categoriasInternetList[categoriaActivaInternet]} ({planesInternetFiltrados.length} planes)
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => handleOpenDialogInternet()}
          sx={{ 
            background: getCardColorInternet(categoriasInternetList[categoriaActivaInternet]),
            '&:hover': { opacity: 0.9 }
          }}
        >
          Agregar Plan de Internet
        </Button>
      </Box>

      <Grid container spacing={3}>
        {planesInternetFiltrados.map((plan) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id}>
            <Card sx={{ 
              position: 'relative',
              border: plan.activo ? '2px solid' : '2px solid #e0e0e0',
              borderColor: plan.activo ? getCardColorInternet(plan.categoria) : '#e0e0e0',
              opacity: plan.activo ? 1 : 0.6,
              transition: 'all 0.3s',
              overflow: 'hidden',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }
            }}>
              {plan.destacado && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 5
                }}>
                  <Box sx={{
                    position: 'absolute',
                    top: '18px',
                    right: '-28px',
                    width: '130px',
                    padding: '4px 0',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    textAlign: 'center',
                    transform: 'rotate(45deg)',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    textTransform: 'uppercase'
                  }}>
                    ★ Popular
                  </Box>
                </Box>
              )}
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{plan.nombre}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: getCardColorInternet(plan.categoria) }}>
                      ${parseFloat(plan.precio).toFixed(0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">/mes</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ mb: 1.5 }}>
                  {plan.descarga && plan.descarga !== '0' && plan.subida && plan.subida !== '0' ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Speed fontSize="small" sx={{ color: '#9c27b0' }} />
                        <Typography variant="body2">{plan.descarga} Mbps ↓ / {plan.subida} Mbps ↑</Typography>
                      </Box>
                      <Typography variant="caption" color={plan.simetrica ? 'success.main' : 'warning.main'}>
                        {plan.simetrica ? '✓ Simétrica' : '⚠ Asimétrica'}
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Speed fontSize="small" sx={{ color: '#9c27b0' }} />
                      <Typography variant="body2">
                        {plan.velocidad && plan.velocidad !== '0' ? `${plan.velocidad} Mbps` : 'N/A'}
                      </Typography>
                    </Box>
                  )}
                  {plan.canales && <Typography variant="body2" sx={{ mt: 0.5 }}> {plan.canales}</Typography>}
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>IFT: {plan.ift}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Tooltip title={plan.activo ? 'Desactivar' : 'Activar'}>
                    <IconButton size="small" onClick={() => handleToggleActivo(plan.id, 'internet')} color={plan.activo ? 'success' : 'default'}>
                      {plan.activo ? <CheckCircle /> : <Close />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleOpenDialogInternet(plan)} color="primary"><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => handleDeletePlan(plan.id, 'internet')} color="error"><Delete /></IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4, borderStyle: 'dashed', borderColor: '#cbd5e1' }} />

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PhoneAndroid fontSize="large" sx={{ color: '#3b82f6' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Administración de Chips SIM
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona los planes SIM, cuotas de Gigabytes y días de vigencia.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Tabs
          value={Math.min(categoriaActivaChip, Math.max(categoriasChipsList.length - 1, 0))}
          onChange={(e, newValue) => setCategoriaActivaChip(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1, minWidth: 240 }}
        >
          {categoriasChipsList.map((cat, idx) => (
            <Tab key={idx} label={cat} />
          ))}
        </Tabs>
        <Button
          variant="outlined" startIcon={<Edit />}
          onClick={() => abrirCategorias(AMBITOS.CHIP)}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
        >
          Categorías
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Vigencia de {categoriasChipsList[categoriaActivaChip]} ({planesChipsFiltrados.length} planes)
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => handleOpenDialogChip()}
          sx={{ background: '#1e293b', '&:hover': { background: '#0f172a' } }}
        >
          Agregar Plan SIM
        </Button>
      </Box>

      <Grid container spacing={3}>
        {planesChipsFiltrados.map((plan) => {
          const chipColor = getColorFromName(plan.nombre);
          const textColor = getContrastTextColor(chipColor);
          const badgeColor = getBadgeColor(chipColor);
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id}>
              <Card sx={{ 
                bgcolor: '#111827', 
                color: 'white', 
                borderRadius: 3, 
                position: 'relative',
                overflow: 'hidden',
                opacity: plan.activo ? 1 : 0.5, 
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }
              }}>
                {plan.destacado && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 120,
                    height: 120,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      top: '22px',
                      right: '-32px',
                      width: '160px',
                      padding: '5px 0',
                      backgroundColor: badgeColor,
                      color: 'white',
                      textAlign: 'center',
                      transform: 'rotate(45deg)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                      ★ POPULAR
                    </Box>
                  </Box>
                )}

                <Box sx={{ 
                  bgcolor: chipColor, 
                  pt: 2, 
                  pb: 2, 
                  textAlign: plan.destacado ? 'left' : 'center',
                  paddingLeft: plan.destacado ? 2.5 : 0,
                  borderRadius: '12px 12px 0 0',
                  position: 'relative'
                }}>
                  <Typography variant="caption" sx={{ 
                    fontWeight: 800, 
                    letterSpacing: 0.5, 
                    fontSize: '0.75rem', 
                    color: textColor,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    display: 'block',
                    width: plan.destacado ? '70%' : '100%'
                  }}>
                    {plan.nombre.toUpperCase()}
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 900, 
                    mt: 0.5, 
                    fontSize: '1.8rem', 
                    color: textColor,
                    textShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}>
                    <span style={{ fontSize: '1.1rem', verticalAlign: 'top', marginRight: '2px' }}>$</span>
                    {parseFloat(plan.precio).toFixed(0)}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    opacity: 0.85, 
                    fontSize: '0.75rem', 
                    color: textColor,
                    fontWeight: 600
                  }}>
                    /{plan.categoria.toLowerCase()}
                  </Typography>
                </Box>
                
                <CardContent sx={{ p: 1.5 }}>
                  <Grid container sx={{ mb: 1.5, textAlign: 'center', borderBottom: '1px solid #374151', pb: 1 }}>
                    <Grid item xs={6} sx={{ borderRight: '1px solid #374151' }}>
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 0.3, fontSize: '0.65rem' }}>Datos</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: chipColor, fontSize: '0.9rem' }}>
                        {plan.datos || plan.descarga}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 0.3, fontSize: '0.65rem' }}>Llamadas</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: chipColor, fontSize: '0.9rem' }}>
                        {plan.llamadas || plan.subida}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mb: 2, minHeight: 80 }}>
                    {(plan.datos || plan.descarga) && (
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 13 }} /> 
                        <Typography variant="caption" sx={{ color: '#e5e7eb', fontSize: '0.7rem' }}>
                          {plan.datos || plan.descarga} de Datos
                        </Typography>
                      </Box>
                    )}
                    {(plan.llamadas || plan.subida) && (
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 13 }} /> 
                        <Typography variant="caption" sx={{ color: '#e5e7eb', fontSize: '0.7rem' }}>
                          Llamadas {String(plan.llamadas || plan.subida).toLowerCase()}
                        </Typography>
                      </Box>
                    )}
                    {(plan.sms || plan.velocidad) && plan.sms !== '0' && plan.velocidad !== '0' && (
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 13 }} /> 
                        <Typography variant="caption" sx={{ color: '#e5e7eb', fontSize: '0.7rem' }}>
                          {plan.sms || plan.velocidad} SMS
                        </Typography>
                      </Box>
                    )}
                    {(plan.beneficios || plan.canales) && String(plan.beneficios || plan.canales).split(',').map((beneficio, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <CheckCircle sx={{ color: '#10b981', fontSize: 13 }} /> 
                        <Typography variant="caption" sx={{ color: '#e5e7eb', fontSize: '0.7rem' }}>
                          {beneficio.trim()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Button 
                      size="small" 
                      variant="contained" 
                      onClick={() => handleToggleActivo(plan.id, 'sim')}
                      sx={{ 
                        minWidth: 0, 
                        px: 1.5, 
                        fontSize: '0.7rem', 
                        py: 0.5,
                        background: plan.activo ? '#22c55e' : '#ef4444',
                        color: 'white',
                        fontWeight: 700,
                        '&:hover': { 
                          background: plan.activo ? '#16a34a' : '#dc2626',
                        }
                      }}
                    >
                      {plan.activo ? 'ON' : 'OFF'}
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        color: 'white', 
                        borderColor: '#4b5563', 
                        '&:hover': { borderColor: 'white' }, 
                        fontSize: '0.7rem', 
                        py: 0.5, 
                        px: 1.5 
                      }} 
                      onClick={() => handleOpenDialogChip(plan)}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error" 
                      onClick={() => handleDeletePlan(plan.id, 'sim')}
                      sx={{ minWidth: 0, px: 1, py: 0.5 }}
                    >
                      <Delete sx={{ fontSize: 14 }} />
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tipoModal === 'internet' ? <Router color="primary"/> : <PhoneAndroid color="primary"/>}
          {modoEdicion ? 'Editar Plan' : 'Agregar Nuevo Plan'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth label="Nombre del Plan" value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              sx={{ mb: 2 }} required helperText={tipoModal === 'chip' ? "Ej: WISP 10GB" : "Ej: Terw, Gat"}
            />

            <TextField
              select fullWidth label="Vigencia / Categoría" value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              sx={{ mb: 2 }}
            >
              {(tipoModal === 'internet' ? categoriasInternetList : categoriasChipsList).map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth label="Precio ($)" type="number" value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              sx={{ mb: 2 }} required 
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />

            {tipoModal === 'internet' && (
              <>
                {!categoriaEsTabla && (
                  <>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <TextField fullWidth label="Descarga (Mbps)" value={formData.descarga} onChange={(e) => setFormData({ ...formData, descarga: e.target.value })} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField fullWidth label="Subida (Mbps)" value={formData.subida} onChange={(e) => setFormData({ ...formData, subida: e.target.value })} />
                      </Grid>
                    </Grid>
                    <FormControlLabel control={<Switch checked={formData.simetrica} onChange={(e) => setFormData({ ...formData, simetrica: e.target.checked })}/>} label="Conexión Simétrica" sx={{ mb: 2, display: 'block' }}/>
                    {(
                      <TextField fullWidth label="Canales (opcional)" value={formData.canales} onChange={(e) => setFormData({ ...formData, canales: e.target.value })} sx={{ mb: 2 }} placeholder="Ej: 47 (41 HD / 6 SD)" />
                    )}
                  </>
                )}
                {categoriaEsTabla && (
                  <TextField fullWidth label="Velocidad (Mbps)" value={formData.velocidad} onChange={(e) => setFormData({ ...formData, velocidad: e.target.value })} sx={{ mb: 2 }} />
                )}
              </>
            )}

            {tipoModal === 'chip' && (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Datos (GB)" value={formData.datos} onChange={(e) => setFormData({ ...formData, datos: e.target.value })} helperText="Ej: 6 GB" required />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Llamadas" value={formData.llamadas} onChange={(e) => setFormData({ ...formData, llamadas: e.target.value })} helperText="Ej: Ilimitadas, 100 Mins" required />
                  </Grid>
                </Grid>
                <TextField fullWidth label="Mensajes (SMS)" value={formData.sms} onChange={(e) => setFormData({ ...formData, sms: e.target.value })} sx={{ mb: 2 }} helperText="Ej: 875, 1750, 3500" required />
                <TextField fullWidth label="Beneficios (Separados por coma)" value={formData.beneficios} onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })} sx={{ mb: 2 }} helperText="Ej: Redes sociales ilimitadas, Comparte Internet" />
              </>
            )}

            <TextField fullWidth label="Número IFT *" value={formData.ift} onChange={(e) => setFormData({ ...formData, ift: e.target.value })} sx={{ mb: 2 }} required helperText="Obligatorio y único" />
            <FormControlLabel control={<Switch checked={formData.destacado} onChange={(e) => setFormData({ ...formData, destacado: e.target.checked })}/>} label="Marcar como plan DESTACADO / MÁS POPULAR" sx={{ display: 'block' }}/>
            <FormControlLabel control={<Switch checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}/>} label="Plan activo (Visible para ventas)" sx={{ display: 'block', mt: 1 }}/>

          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} startIcon={<Close />} disabled={loading} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleSavePlan} 
            variant="contained" 
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
            disabled={loading}
            sx={{ background: tipoModal === 'internet' ? getCardColorInternet(formData.categoria) : getColorFromName(formData.nombre) }}
          >
            {loading ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Guardar Plan')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(dialogoCategorias)}
        onClose={() => !guardandoCategoria && setDialogoCategorias(null)}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Categorías de {dialogoCategorias === AMBITOS.CHIP ? 'chips' : 'planes de internet'}
          <IconButton onClick={() => setDialogoCategorias(null)} disabled={guardandoCategoria}><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Estas son las pestañas que ve el vendedor. Al renombrar una,
            <strong> sus planes se mueven solos</strong> y el cambio aparece en el formulario
            de contrato y en el de prospectos sin que nadie recargue.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              {catalogoActivo.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Todavía no hay categorías. Crea la primera con el formulario de al lado.
                </Typography>
              ) : catalogoActivo.map((cat) => (
                <Paper
                  key={cat.id}
                  variant="outlined"
                  sx={{
                    p: 1.2, mb: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1,
                    borderLeft: `5px solid ${cat.color}`,
                    opacity: cat.activo ? 1 : 0.55,
                    borderColor: categoriaEditando?.id === cat.id ? cat.color : '#e2e8f0',
                    borderWidth: categoriaEditando?.id === cat.id ? 2 : 1
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {cat.nombre}
                      {!cat.activo && <Chip label="Oculta" size="small" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cat.total_items} plan(es) · vista {cat.vista}
                    </Typography>
                  </Box>

                  <Tooltip title="Editar">
                    <IconButton size="small" color="primary" onClick={() => editarCategoria(cat)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={cat.total_items > 0 ? 'Tiene planes: muévelos u ocúltala' : 'Eliminar'}>
                    <span>
                      <IconButton size="small" color="error" onClick={() => eliminarCategoria(cat)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Paper>
              ))}
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {categoriaEditando ? `Editar "${categoriaEditando.nombre}"` : 'Nueva categoría'}
                </Typography>

                <TextField
                  fullWidth size="small" label="Nombre *" sx={{ mb: 1.5 }}
                  value={formCategoria.nombre}
                  onChange={(e) => setFormCategoria({ ...formCategoria, nombre: e.target.value })}
                  helperText={categoriaEditando && categoriaEditando.total_items > 0
                    ? `Se renombrarán también sus ${categoriaEditando.total_items} plan(es).`
                    : 'Es el texto de la pestaña.'}
                />

                <TextField
                  fullWidth size="small" label="Descripción" sx={{ mb: 1.5 }}
                  value={formCategoria.descripcion}
                  onChange={(e) => setFormCategoria({ ...formCategoria, descripcion: e.target.value })}
                  helperText="Frase corta bajo la pestaña. Opcional."
                />

                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                  <TextField
                    type="color" size="small" label="Color" sx={{ width: 110 }}
                    value={formCategoria.color}
                    onChange={(e) => setFormCategoria({ ...formCategoria, color: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    select fullWidth size="small" label="Icono"
                    value={formCategoria.icono}
                    onChange={(e) => setFormCategoria({ ...formCategoria, icono: e.target.value })}
                  >
                    {ICONOS_CATEGORIA.map(i => (
                      <MenuItem key={i.clave} value={i.clave}>{i.etiqueta}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                  <TextField
                    select fullWidth size="small" label="Cómo se muestran sus planes"
                    value={formCategoria.vista}
                    onChange={(e) => setFormCategoria({ ...formCategoria, vista: e.target.value })}
                    helperText="Tabla: una sola velocidad. Tarjetas: descarga y subida."
                  >
                    {VISTAS_CATEGORIA.map(v => (
                      <MenuItem key={v.clave} value={v.clave}>{v.etiqueta}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small" label="Orden" sx={{ width: 110 }}
                    value={formCategoria.orden}
                    onChange={(e) => setFormCategoria({ ...formCategoria, orden: e.target.value.replace(/\D/g, '') })}
                    helperText="Menor primero"
                  />
                </Box>

                <FormControlLabel
                  sx={{ mb: 1 }}
                  control={
                    <Switch
                      checked={formCategoria.activo}
                      onChange={(e) => setFormCategoria({ ...formCategoria, activo: e.target.checked })}
                    />
                  }
                  label="Visible para el vendedor"
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained" fullWidth
                    startIcon={guardandoCategoria ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    onClick={guardarCategoria}
                    disabled={guardandoCategoria}
                  >
                    {categoriaEditando ? 'Guardar cambios' : 'Crear categoría'}
                  </Button>
                  {categoriaEditando && (
                    <Button
                      color="inherit"
                      onClick={() => { setCategoriaEditando(null); setFormCategoria(FORM_CATEGORIA_VACIO); }}
                      disabled={guardandoCategoria}
                    >
                      Nueva
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogoCategorias(null)} disabled={guardandoCategoria}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionPlanes;
