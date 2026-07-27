import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Chip, TextField, MenuItem, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Grid, 
  Card, Divider, CircularProgress
} from '@mui/material';
import { 
  CalendarMonth, Close, EventAvailableOutlined, AssignmentOutlined,
  PieChartOutlined, BarChartOutlined, Pending, AssignmentTurnedIn,
  CheckCircle, Edit, Visibility, CreditCard, Receipt, Home
} from '@mui/icons-material';
import { useContratos } from '../../hooks/useContratos';
import api from '../../services/api'; 

const AgendaInstalaciones = () => {
  const { 
    contratos, 
    loading, 
    error, 
    asignarCita, 
    refetchPendientes
  } = useContratos();
  
  const [tecnicosBD, setTecnicosBD] = useState([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);

  const datosPastel = [
    { label: 'Completadas', value: 55, color: '#10b981' },
    { label: 'Pendientes', value: 30, color: '#f59e0b' }
  ];

  const datosBarras = [
    { dia: 'Lun', cantidad: 12, altura: '60%' },
    { dia: 'Mar', cantidad: 18, altura: '90%' },
    { dia: 'Mié', cantidad: 10, altura: '50%' },
    { dia: 'Jue', cantidad: 20, altura: '100%' },
    { dia: 'Vie', cantidad: 14, altura: '70%' }
  ];

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [fecha, setFecha] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [mensajeExito, setMensajeExito] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState(null);
  
  const [dialogoEditarOpen, setDialogoEditarOpen] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  
  const [datosEditar, setDatosEditar] = useState({
    nombre_completo: '',
    telefono1: '',
    correo: '',
    calle_numero: '',
    plan_contratado: '',
    nota: ''
  });

  const [dialogoEditarTecnicoOpen, setDialogoEditarTecnicoOpen] = useState(false);
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');

  const [filtroEstatus, setFiltroEstatus] = useState('pendientes');

  useEffect(() => {
    refetchPendientes();
    cargarTecnicosReales();
  }, []);

  const cargarTecnicosReales = async () => {
    setLoadingTecnicos(true);
    try {
      const res = await api.get('/tecnicos/');
      setTecnicosBD(res.data);
    } catch (error) {
      console.warn("No se encontró la ruta /tecnicos/, buscando en /usuarios/...");
      try {
        const res2 = await api.get('/usuarios/');
        const tecnicosFiltrados = res2.data.filter(u => u.rol && u.rol.toLowerCase() === 'tecnico');
        setTecnicosBD(tecnicosFiltrados);
      } catch (err2) {
        console.error("Error al cargar técnicos:", err2);
      }
    } finally {
      setLoadingTecnicos(false);
    }
  };

  const ordenes = contratos.map(contrato => ({
    id: contrato.id || `C-${contrato.id}`,
    cliente: contrato.nombre_completo,
    plan: contrato.plan_contratado,
    direccion: contrato.calle_numero,
    estatus: contrato.estatus,
    contrato_id: contrato.id,
    telefono: contrato.telefono1,
    correo: contrato.correo,
    nota: contrato.nota || '',
    tecnico_id: contrato.tecnico_id,
    foto_ine_frente: contrato.foto_ine_frente || null,
    foto_ine_reverso: contrato.foto_ine_reverso || null,
    foto_recibo_luz: contrato.foto_recibo_luz || null,
    foto_fachada: contrato.foto_fachada || null
  }));

  const ordenesFiltradas = ordenes.filter(orden => {
    switch (filtroEstatus) {
      case 'pendientes':
        return orden.estatus === 'Pendiente Asignar' || orden.estatus === 'Pendiente';
      case 'asignadas':
        return orden.estatus === 'Asignado' || orden.estatus === 'Programada' || orden.estatus === 'En Proceso';
      case 'completadas':
        return orden.estatus === 'Completado' || orden.estatus === 'Completada';
      default:
        return true;
    }
  });

  const totalPendientes = ordenes.filter(o => o.estatus === 'Pendiente Asignar' || o.estatus === 'Pendiente').length;
  const totalAsignadas = ordenes.filter(o => o.estatus === 'Asignado' || o.estatus === 'Programada' || o.estatus === 'En Proceso').length;
  const totalCompletadas = ordenes.filter(o => o.estatus === 'Completado' || o.estatus === 'Completada').length;

  const handleAbrirModal = (orden) => {
    setOrdenSeleccionada(orden);
    setFecha('');
    setTecnico('');
    setMensajeExito(false);
    setErrorAsignacion(null);
  };

  const handleCerrarModal = () => setOrdenSeleccionada(null);

  const handleAbrirEditar = (orden) => {
    setOrdenSeleccionada(orden);
    setDatosEditar({
      nombre_completo: orden.cliente || '',
      telefono1: orden.telefono || '',
      correo: orden.correo || '',
      calle_numero: orden.direccion || '',
      plan_contratado: orden.plan || '',
      nota: orden.nota || ''
    });
    setErrorAsignacion(null);
    setDialogoEditarOpen(true);
  };

  const handleCerrarEditar = () => {
    setDialogoEditarOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleAbrirEditarTecnico = (orden) => {
    setOrdenSeleccionada(orden);
    setTecnicoAsignado(orden.tecnico_id || '');
    setErrorAsignacion(null);
    setDialogoEditarTecnicoOpen(true);
  };

  const handleCerrarEditarTecnico = () => {
    setDialogoEditarTecnicoOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDatosEditar(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarEdicion = async () => {
    if (!datosEditar.nombre_completo.trim()) {
      setErrorAsignacion("El nombre completo es obligatorio");
      return;
    }
    if (datosEditar.telefono1 && datosEditar.telefono1.length !== 10) {
      setErrorAsignacion("El teléfono debe tener exactamente 10 dígitos");
      return;
    }

    setGuardandoEdicion(true);
    try {
      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, datosEditar);
      setMensajeExito(true);
      handleCerrarEditar();
      refetchPendientes();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      console.error("Error al guardar:", err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Django rechazó los datos: ${errorMsg}`);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleGuardarCambioTecnico = async () => {
    try {
      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, { 
        tecnico_id: tecnicoAsignado || null 
      });
      setMensajeExito(true);
      handleCerrarEditarTecnico();
      refetchPendientes();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Backend rechazó el técnico: ${errorMsg}`);
    }
  };

  const handleGuardarAsignacion = async (e) => {
    e.preventDefault();
    setErrorAsignacion(null);
    
    try {
      await asignarCita(ordenSeleccionada.contrato_id, {
        tecnico_id: tecnico || null,
        estatus: 'Asignado'
      });

      setMensajeExito(true);
      handleCerrarModal();
      refetchPendientes();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Error de Backend: ${errorMsg}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando contratos pendientes...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Error al cargar contratos: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentOutlined color="primary" /> Mesa de Control y Asignación de Logística
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Asigna citas y gestiona las agendas de instalación técnica en campo.
        </Typography>
      </Box>

      {mensajeExito && (
        <Alert severity="success" onClose={() => setMensajeExito(false)} sx={{ borderRadius: 2 }}>
          ✅ Operación completada con éxito. El tablero se ha actualizado.
        </Alert>
      )}

      {errorAsignacion && (
        <Alert severity="error" onClose={() => setErrorAsignacion(null)} sx={{ borderRadius: 2 }}>
          {errorAsignacion}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#475569' }}>
          Filtrar por Estatus:
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant={filtroEstatus === 'pendientes' ? 'contained' : 'outlined'}
            startIcon={<Pending />}
            onClick={() => setFiltroEstatus('pendientes')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'pendientes' ? '#f59e0b' : 'transparent',
              color: filtroEstatus === 'pendientes' ? 'white' : '#f59e0b',
              borderColor: '#f59e0b', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'pendientes' ? '#d97706' : 'rgba(245, 158, 11, 0.08)', borderColor: '#d97706' }
            }}
          >
            Pendientes ({totalPendientes})
          </Button>
          
          <Button
            variant={filtroEstatus === 'asignadas' ? 'contained' : 'outlined'}
            startIcon={<AssignmentTurnedIn />}
            onClick={() => setFiltroEstatus('asignadas')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'asignadas' ? '#3b82f6' : 'transparent',
              color: filtroEstatus === 'asignadas' ? 'white' : '#3b82f6',
              borderColor: '#3b82f6', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'asignadas' ? '#2563eb' : 'rgba(59, 130, 246, 0.08)', borderColor: '#2563eb' }
            }}
          >
            Asignadas ({totalAsignadas})
          </Button>
          
          <Button
            variant={filtroEstatus === 'completadas' ? 'contained' : 'outlined'}
            startIcon={<CheckCircle />}
            onClick={() => setFiltroEstatus('completadas')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'completadas' ? '#10b981' : 'transparent',
              color: filtroEstatus === 'completadas' ? 'white' : '#10b981',
              borderColor: '#10b981', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'completadas' ? '#059669' : 'rgba(16, 185, 129, 0.08)', borderColor: '#059669' }
            }}
          >
            Completadas ({totalCompletadas})
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Plan Contratado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Dirección de Servicio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estatus</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay contratos {filtroEstatus} para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              ordenesFiltradas.map((orden) => (
                <TableRow key={orden.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>{orden.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{orden.cliente}</TableCell>
                  <TableCell>{orden.plan}</TableCell>
                  <TableCell>{orden.direccion}</TableCell>
                  <TableCell>
                    <Chip
                      label={orden.estatus}
                      color={orden.estatus === 'Asignado' ? 'success' : 
                             orden.estatus === 'Completado' || orden.estatus === 'Completada' ? 'success' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {filtroEstatus === 'pendientes' && (
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          variant="outlined" size="small" startIcon={<Visibility />}
                          onClick={() => handleAbrirEditar(orden)}
                          sx={{ 
                            textTransform: 'none', borderRadius: 1.5, color: '#3b82f6', borderColor: '#3b82f6',
                            '&:hover': { borderColor: '#2563eb', backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                          }}
                        >
                          Ver/Editar
                        </Button>
                        <Button
                          variant="contained" size="small" onClick={() => handleAbrirModal(orden)}
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Asignar Cita
                        </Button>
                      </Stack>
                    )}
                    
                    {filtroEstatus === 'asignadas' && (
                      <Button
                        variant="outlined" size="small" startIcon={<Edit />} onClick={() => handleAbrirEditarTecnico(orden)}
                        sx={{ 
                          textTransform: 'none', borderRadius: 1.5, color: '#f59e0b', borderColor: '#f59e0b',
                          '&:hover': { borderColor: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.04)' }
                        }}
                      >
                        Editar Técnico
                      </Button>
                    )}
                    
                    {filtroEstatus === 'completadas' && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Completado
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ width: '100%' }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartOutlined color="primary" fontSize="small" /> Estatus Global
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ 
                  width: 120, height: 120, borderRadius: '50%', 
                  background: `conic-gradient(${datosPastel[0].color} 0% ${datosPastel[0].value}%, ${datosPastel[1].color} ${datosPastel[0].value}% 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Box sx={{ width: 80, height: 80, backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>100%</Typography>
                  </Box>
                </Box>
                <Stack spacing={1}>
                  {datosPastel.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: item.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.label} ({item.value}%)</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartOutlined color="secondary" fontSize="small" /> Volumen por Día
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                {datosBarras.map((barra, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '15%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#3b82f6' }}>{barra.cantidad}</Typography>
                    <Box sx={{ width: '100%', maxWidth: 30, height: barra.altura, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mt: 0.5 }}>{barra.dia}</Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Dialog 
        open={Boolean(ordenSeleccionada) && !dialogoEditarOpen && !dialogoEditarTecnicoOpen} 
        onClose={handleCerrarModal} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
              Agendar Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarModal} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <form onSubmit={handleGuardarAsignacion}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Cliente: <strong>{ordenSeleccionada?.cliente}</strong><br/>
              Dirección: {ordenSeleccionada?.direccion}
            </Typography>

            <TextField
              type="date"
              label="Fecha Programada"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            
            <TextField
              select
              label="Asignar Técnico Responsable"
              fullWidth
              required
              disabled={loadingTecnicos}
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              helperText={loadingTecnicos ? 'Buscando técnicos...' : ''}
            >
              {tecnicosBD.length > 0 ? (
                tecnicosBD.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.numero_empleado} - {t.usuario || t.nombreCompleto || `Técnico #${t.id}`}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>No hay técnicos registrados</MenuItem>
              )}
            </TextField>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button onClick={handleCerrarModal} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<CalendarMonth />}>
              Confirmar Agenda
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={dialogoEditarOpen} onClose={handleCerrarEditar} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Ver/Editar Datos - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarEditar} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3, maxHeight: 700, overflow: 'auto' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Nombre Completo *" name="nombre_completo" value={datosEditar.nombre_completo}
                onChange={handleInputChange} required error={!datosEditar.nombre_completo.trim()}
                helperText={!datosEditar.nombre_completo.trim() ? "Este campo es obligatorio" : ""}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Teléfono *" name="telefono1" value={datosEditar.telefono1}
                inputProps={{ maxLength: 10 }}
                onChange={(e) => {
                  const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setDatosEditar(prev => ({ ...prev, telefono1: soloNumeros }));
                }}
                error={datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10}
                helperText={datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10 ? "Debe tener 10 dígitos" : ""}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Correo Electrónico" name="correo" type="email" value={datosEditar.correo} onChange={handleInputChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Plan Contratado" name="plan_contratado" value={datosEditar.plan_contratado} onChange={handleInputChange} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Nota" name="nota" value={datosEditar.nota} onChange={handleInputChange} multiline rows={3}
                placeholder="Agregar notas adicionales sobre el cliente o la instalación..."
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
             Evidencias Fotográficas del Contrato
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CreditCard color="primary" /> Frente INE
                </Typography>
                {ordenSeleccionada?.foto_ine_frente ? (
                  <img src={ordenSeleccionada.foto_ine_frente} alt="Frente INE" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                ) : (<Typography variant="body2" color="text.secondary">Sin foto</Typography>)}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CreditCard color="primary" /> Reverso INE
                </Typography>
                {ordenSeleccionada?.foto_ine_reverso ? (
                  <img src={ordenSeleccionada.foto_ine_reverso} alt="Reverso INE" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                ) : (<Typography variant="body2" color="text.secondary">Sin foto</Typography>)}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Receipt color="warning" /> Recibo de Luz
                </Typography>
                {ordenSeleccionada?.foto_recibo_luz ? (
                  <img src={ordenSeleccionada.foto_recibo_luz} alt="Recibo de Luz" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                ) : (<Typography variant="body2" color="text.secondary">Sin foto</Typography>)}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Home color="info" /> Fachada
                </Typography>
                {ordenSeleccionada?.foto_fachada ? (
                  <img src={ordenSeleccionada.foto_fachada} alt="Fachada" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                ) : (<Typography variant="body2" color="text.secondary">Sin foto</Typography>)}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={handleCerrarEditar} color="inherit" disabled={guardandoEdicion}>Cancelar</Button>
          <Button 
            onClick={handleGuardarEdicion} variant="contained" 
            startIcon={guardandoEdicion ? <CircularProgress size={20} color="inherit" /> : <Edit />}
            disabled={guardandoEdicion || !datosEditar.nombre_completo.trim() || (datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10)}
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, '&.Mui-disabled': { bgcolor: '#93c5fd' } }}
          >
            {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={dialogoEditarTecnicoOpen} onClose={handleCerrarEditarTecnico} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="warning" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
              Cambiar Técnico - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarEditarTecnico} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Cliente: <strong>{ordenSeleccionada?.cliente}</strong><br/>
            Dirección: {ordenSeleccionada?.direccion}
          </Typography>

          <TextField
            select
            label="Seleccionar Nuevo Técnico"
            fullWidth
            required
            disabled={loadingTecnicos}
            value={tecnicoAsignado}
            onChange={(e) => setTecnicoAsignado(e.target.value)}
          >
            {tecnicosBD.length > 0 ? (
              tecnicosBD.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.numero_empleado} - {t.usuario || t.nombreCompleto || `Técnico #${t.id}`}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>No hay técnicos registrados</MenuItem>
            )}
          </TextField>

        </DialogContent>
        
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleCerrarEditarTecnico} color="inherit">Cancelar</Button>
          <Button 
            onClick={handleGuardarCambioTecnico} variant="contained" startIcon={<Edit />}
            sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            Guardar Cambio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgendaInstalaciones;