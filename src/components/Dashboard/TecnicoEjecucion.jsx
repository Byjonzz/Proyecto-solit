import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CheckCircle,
  Build,
  LocationOn,
  Phone,
  Person,
  Schedule,
  Assignment,
  Email,
  Visibility,
  AssignmentTurnedIn  
} from '@mui/icons-material';
import api from '../../services/api';

const TecnicoEjecucion = ({ usuarioActual }) => {
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  const [formData, setFormData] = useState({
    verificar_equipos: false,
    tendido_cable: false,
    config_ont: false,
    serial_ont: '',
    serial_router: '',
    metraje_fibra: '',
    potencia_dbm: '',
    tipo_instalacion: 'Residencial',
    conectores_utilizados: 2,
    notas_instalacion: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  
  const [filtroEstatus, setFiltroEstatus] = useState('asignadas');

  useEffect(() => {
    if (usuarioActual) {
      fetchInstalaciones();
    }
  }, [usuarioActual]);

  const fetchInstalaciones = async () => {
    try {
      setLoading(true);
      setError('');
      
      const rol = usuarioActual?.rol?.toLowerCase().trim();
      const esAdmin = rol === 'admin' || rol === 'administrador' || rol === 'supervisor';
      
      setVistaAdmin(esAdmin);
      
      try {
        const tecnicosResponse = await api.get('/tecnicos/');
        setTecnicos(tecnicosResponse.data);
      } catch (err) {
        console.warn("No se pudo cargar /tecnicos/, intentando /usuarios/...");
        try {
          const res2 = await api.get('/usuarios/');
          const tecnicosFiltrados = res2.data.filter(u => u.rol && u.rol.toLowerCase() === 'tecnico');
          setTecnicos(tecnicosFiltrados);
        } catch (err2) {
          console.error("Error al cargar técnicos:", err2);
        }
      }
      
      const contratosResponse = await api.get('/contratos/');
      const todosLosContratos = contratosResponse.data;
      
      let contratosFiltrados = [];
      
      const todosLosEstatus = [
        'Pendiente Asignar', 'Pendiente',
        'Asignado', 'Programada', 'Asignada', 'En Proceso',
        'Completado', 'Completada'
      ];
      
      if (esAdmin) {
        contratosFiltrados = todosLosContratos.filter(contrato => {
          const tieneTecnico = contrato.tecnico_id && contrato.tecnico_id !== null;
          const estatusValido = todosLosEstatus.includes(contrato.estatus);
          return tieneTecnico && estatusValido;
        });
      } else {
        contratosFiltrados = todosLosContratos.filter(contrato => {
          const esMio = contrato.tecnico_id == usuarioActual?.perfil_id || contrato.tecnico_id == usuarioActual?.id;
          const estatusValido = todosLosEstatus.includes(contrato.estatus);
          return esMio && estatusValido;
        });
      }
      
      const instalacionesFormateadas = contratosFiltrados.map(contrato => {
        let tecnicoNombre = 'Sin asignar';
        if (contrato.tecnico_id) {
          const tecnico = tecnicos.find(t => t.id === contrato.tecnico_id);
          if (tecnico) {
            tecnicoNombre = tecnico.numero_empleado || tecnico.nombre || tecnico.usuario || `Técnico #${tecnico.id}`;
          } else {
            tecnicoNombre = `Técnico ID: ${contrato.tecnico_id}`;
          }
        }
        
        return {
          id: contrato.id,
          contrato_id: contrato.id,
          contrato: contrato,
          tecnico_id: contrato.tecnico_id,
          tecnico_nombre: tecnicoNombre,
          estado: contrato.estatus,
          fecha_programada: contrato.fecha_asignada || contrato.fecha_cita || null,
          hora_asignada: contrato.hora_asignada || null,
          observaciones: contrato.observaciones || contrato.nota || ''
        };
      });
      
      setInstalaciones(instalacionesFormateadas);
      
    } catch (error) {
      setError('Error al cargar las instalaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInstalacionesFiltradas = () => {
    switch (filtroEstatus) {
      case 'asignadas':
        return instalaciones.filter(inst => 
          inst.estado === 'Asignado' || inst.estado === 'Programada' || 
          inst.estado === 'Asignada' || inst.estado === 'En Proceso' ||
          inst.estado === 'Pendiente Asignar' || inst.estado === 'Pendiente'
        );
      case 'completadas':
        return instalaciones.filter(inst => 
          inst.estado === 'Completado' || inst.estado === 'Completada'
        );
      default:
        return instalaciones;
    }
  };

  const totalAsignadas = instalaciones.filter(i => 
    i.estado === 'Asignado' || i.estado === 'Programada' || 
    i.estado === 'Asignada' || i.estado === 'En Proceso' ||
    i.estado === 'Pendiente Asignar' || i.estado === 'Pendiente'
  ).length;
  
  const totalCompletadas = instalaciones.filter(i => 
    i.estado === 'Completado' || i.estado === 'Completada'
  ).length;

  const instalacionesFiltradas = getInstalacionesFiltradas();

  const handleEjecutar = (instalacion) => {
    if (instalacion.estado === 'Completado' || instalacion.estado === 'Completada') {
      setError('Esta instalación ya está completada');
      return;
    }
    
    if (!vistaAdmin && instalacion.tecnico_id != usuarioActual?.perfil_id && instalacion.tecnico_id != usuarioActual?.id) {
      setError('No tienes permisos para ejecutar esta instalación');
      return;
    }
    
    setInstalacionSeleccionada(instalacion);
    setFormData({
      verificar_equipos: false,
      tendido_cable: false,
      config_ont: false,
      serial_ont: '',
      serial_router: '',
      metraje_fibra: '',
      potencia_dbm: '',
      tipo_instalacion: 'Residencial',
      conectores_utilizados: 2,
      notas_instalacion: ''
    });
    setDialogOpen(true);
  };

  const handleCompletar = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.serial_ont || !formData.potencia_dbm || !formData.metraje_fibra) {
        setError('Los campos obligatorios deben estar completos');
        return;
      }

      await api.put(`/contratos/${instalacionSeleccionada.contrato_id}/`, {
        ...instalacionSeleccionada.contrato,
        estatus: 'Completado',
        fecha_completada: new Date().toISOString()
      });

      setSuccess('Instalación completada correctamente');
      setTimeout(() => {
        setDialogOpen(false);
        fetchInstalaciones();
      }, 1500);
    } catch (error) {
      setError('Error al completar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'Programada': 'info',
      'Asignado': 'info',
      'Asignada': 'info',
      'En Proceso': 'warning',
      'Completada': 'success',
      'Completado': 'success',
      'Pendiente Asignar': 'warning',
      'Pendiente': 'warning'
    };
    return colores[estado] || 'default';
  };

  const getNombreTecnico = (tecnicoId) => {
    const tecnico = tecnicos.find(t => t.id === tecnicoId);
    return tecnico ? (tecnico.numero_empleado || tecnico.nombre || `Técnico #${tecnico.id}`) : 'Sin asignar';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando instalaciones...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {vistaAdmin ? 'Todas las Instalaciones Asignadas' : 'Mis Instalaciones Asignadas'} ({instalaciones.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {vistaAdmin ? (
          <span>Vista de <strong>Administrador</strong> - Todas las instalaciones de técnicos</span>
        ) : (
          <span>Técnico: <strong>{usuarioActual?.nombre}</strong> | perfil_id: <strong>{usuarioActual?.perfil_id}</strong></span>
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {!vistaAdmin && (
        <Paper sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#475569' }}>
            Filtrar por Estado:
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant={filtroEstatus === 'asignadas' ? 'contained' : 'outlined'}
              startIcon={<AssignmentTurnedIn />}
              onClick={() => setFiltroEstatus('asignadas')}
              sx={{ 
                minWidth: 160,
                bgcolor: filtroEstatus === 'asignadas' ? '#3b82f6' : 'transparent',
                color: filtroEstatus === 'asignadas' ? 'white' : '#3b82f6',
                borderColor: '#3b82f6',
                borderWidth: 2,
                fontWeight: 700,
                '&:hover': {
                  bgcolor: filtroEstatus === 'asignadas' ? '#2563eb' : 'rgba(59, 130, 246, 0.08)',
                  borderColor: '#2563eb',
                }
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
                borderColor: '#10b981',
                borderWidth: 2,
                fontWeight: 700,
                '&:hover': {
                  bgcolor: filtroEstatus === 'completadas' ? '#059669' : 'rgba(16, 185, 129, 0.08)',
                  borderColor: '#059669',
                }
              }}
            >
              Completadas ({totalCompletadas})
            </Button>
          </Stack>
        </Paper>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchInstalaciones}
          startIcon={<CheckCircle />}
        >
          Recargar
        </Button>
      </Stack>

      {vistaAdmin ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Folio</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Técnico Asignado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dirección</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fecha/Hora</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {instalaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography sx={{ py: 3, color: 'text.secondary' }}>
                      No hay instalaciones asignadas a ningún técnico
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                instalaciones.map((inst) => (
                  <TableRow key={inst.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>#{inst.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {inst.contrato?.nombre_completo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inst.contrato?.telefono1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={inst.tecnico_nombre} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{inst.contrato?.calle_numero}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inst.contrato?.plan_contratado}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {inst.fecha_programada ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d4ed8' }}>
                          {new Date(inst.fecha_programada).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {inst.hora_asignada && (
                            <>
                              <br/>
                              <span style={{color: '#64748b', fontWeight: 400}}>
                                {inst.hora_asignada}
                              </span>
                            </>
                          )}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin programar</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={inst.estado} 
                        color={getEstadoColor(inst.estado)} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleEjecutar(inst)}
                        disabled={inst.estado === 'Completado' || inst.estado === 'Completada'}
                        sx={{ textTransform: 'none', mr: 1 }}
                      >
                        {inst.estado === 'Completado' || inst.estado === 'Completada' ? 'Finalizado' : 'Ver'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {instalacionesFiltradas.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', width: '100%' }}>
              <Build sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No tienes instalaciones {filtroEstatus}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {filtroEstatus === 'asignadas' && 'Las instalaciones asignadas aparecerán aquí'}
                {filtroEstatus === 'completadas' && 'Las instalaciones completadas aparecerán aquí'}
              </Typography>
            </Paper>
          ) : (
            instalacionesFiltradas.map((inst) => (
              <Card key={inst.id} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' }, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Folio #{inst.id}
                    </Typography>
                    <Chip 
                      label={inst.estado} 
                      color={getEstadoColor(inst.estado)} 
                      size="small"
                    />
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    {inst.contrato?.nombre_completo}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.nombre_completo}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.telefono1}</Typography>
                    </Box>
                    {inst.contrato?.correo && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2">{inst.contrato.correo}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.calle_numero}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d4ed8' }}>
                        {inst.fecha_programada 
                          ? new Date(inst.fecha_programada).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Fecha por definir'}
                        {inst.hora_asignada && ` - ${inst.hora_asignada}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assignment fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Plan:</strong> {inst.contrato?.plan_contratado}
                      </Typography>
                    </Box>
                    {inst.tecnico_nombre && inst.tecnico_nombre !== 'Sin asignar' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Build fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Técnico:</strong> {inst.tecnico_nombre}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {inst.observaciones && (
                    <Alert severity="info" sx={{ mt: 2, fontSize: '0.85rem' }}>
                      <strong>Notas:</strong> {inst.observaciones}
                    </Alert>
                  )}
                </CardContent>

                <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleEjecutar(inst)}
                    sx={{ py: 1.5 }}
                    disabled={inst.estado === 'Completado' || inst.estado === 'Completada'}
                  >
                    {inst.estado === 'Completado' || inst.estado === 'Completada' ? 'Finalizado' : 'Ejecutar Instalación'}
                  </Button>
                </Box>
              </Card>
            ))
          )}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build color="primary" />
            {vistaAdmin ? 'Ver Instalación' : 'Ejecutar Instalación'} - Folio #{instalacionSeleccionada?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          {instalacionSeleccionada && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Cliente:</strong> {instalacionSeleccionada.contrato?.nombre_completo}<br/>
                <strong>Técnico:</strong> {instalacionSeleccionada.tecnico_nombre}<br/>
                <strong>Fecha Programada:</strong> {instalacionSeleccionada.fecha_programada 
                  ? new Date(instalacionSeleccionada.fecha_programada).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Sin programar'}<br/>
                <strong>Estado:</strong> {instalacionSeleccionada.estado}
              </Alert>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Detalles de la Instalación
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Cliente"
                    value={instalacionSeleccionada.contrato?.nombre_completo}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={instalacionSeleccionada.contrato?.telefono1}
                    InputProps={{ readOnly: true }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Dirección"
                  value={instalacionSeleccionada.contrato?.calle_numero}
                  InputProps={{ readOnly: true }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Plan"
                    value={instalacionSeleccionada.contrato?.plan_contratado}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    fullWidth
                    label="Fecha/Hora"
                    value={`${instalacionSeleccionada.fecha_programada 
                      ? new Date(instalacionSeleccionada.fecha_programada).toLocaleDateString('es-MX')
                      : 'N/A'} ${instalacionSeleccionada.hora_asignada || ''}`}
                    InputProps={{ readOnly: true }}
                  />
                </Box>

                {!vistaAdmin && instalacionSeleccionada.estado !== 'Completado' && instalacionSeleccionada.estado !== 'Completada' && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Checklist de Instalación
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.verificar_equipos}
                          onChange={(e) => setFormData({ ...formData, verificar_equipos: e.target.checked })}
                        />
                      }
                      label="Verificar equipos"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.tendido_cable}
                          onChange={(e) => setFormData({ ...formData, tendido_cable: e.target.checked })}
                        />
                      }
                      label="Tendido de cable correcto"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.config_ont}
                          onChange={(e) => setFormData({ ...formData, config_ont: e.target.checked })}
                        />
                      }
                      label="Configuración de ONT completada"
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Serial ONT *"
                        value={formData.serial_ont}
                        onChange={(e) => setFormData({ ...formData, serial_ont: e.target.value })}
                        required
                      />
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Metraje de Fibra (metros) *"
                        type="number"
                        value={formData.metraje_fibra}
                        onChange={(e) => setFormData({ ...formData, metraje_fibra: e.target.value })}
                        required
                      />
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Potencia (dBm) *"
                        value={formData.potencia_dbm}
                        onChange={(e) => setFormData({ ...formData, potencia_dbm: e.target.value })}
                        required
                      />
                    </Box>

                    <TextField
                      multiline
                      rows={3}
                      fullWidth
                      label="Notas de la Instalación"
                      value={formData.notas_instalacion}
                      onChange={(e) => setFormData({ ...formData, notas_instalacion: e.target.value })}
                    />
                  </>
                )}
                
                {(instalacionSeleccionada.estado === 'Completado' || instalacionSeleccionada.estado === 'Completada') && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Esta instalación ya fue completada
                  </Alert>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
          {!vistaAdmin && instalacionSeleccionada?.estado !== 'Completado' && instalacionSeleccionada?.estado !== 'Completada' && (
            <Button onClick={handleCompletar} variant="contained" color="success" startIcon={<CheckCircle />}>
              Completar Instalación
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TecnicoEjecucion;