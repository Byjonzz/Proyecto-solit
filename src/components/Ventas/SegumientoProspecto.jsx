import React, { useState, useEffect, useMemo } from 'react';
import { useProspectos } from '../../hooks/useProspectos';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  MenuItem
} from '@mui/material';

import {
  WhatsApp, Phone, AssignmentTurnedIn, Close, Verified, Cancel,
  Pending, ListAlt
} from '@mui/icons-material';
import api from '../../services/api';
import { clientesService } from '../../services/clientesService';
import { extraerCoordenadas } from '../../utils/geo';
import { soloMisRegistros } from '../../utils/propiedad';
import PlanCotizacion from './PlanCotizacion';

const ETAPAS_EMBUDO = ['Nuevo', 'Posible Cliente', 'Prospecto', 'Contactado', 'Interesado', 'Perdido'];
const ESTADO_VENDIDO = 'Vendido';
const ESTADO_PERDIDO = 'Perdido';
const FILTROS = [
  { value: 'activos', label: 'Activos', icono: Pending, color: '#f59e0b', colorHover: '#d97706' },
  { value: 'perdidos', label: 'Perdidos', icono: Cancel, color: '#ef4444', colorHover: '#dc2626' },
  { value: 'clientes', label: 'Ya son Clientes', icono: Verified, color: '#10b981', colorHover: '#059669' },
  { value: 'todos', label: 'Todos', icono: ListAlt, color: '#64748b', colorHover: '#475569' }
];

const SegumientoProspecto = ({ usuarioActual }) => {
  // El hook ya pide al servidor solo los prospectos de este usuario.
  const { prospectos, loading, error, updateEstadoProspecto } = useProspectos(usuarioActual);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null);

  const [tipoInteraccion, setTipoInteraccion] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [filtro, setFiltro] = useState('activos');

  const [contratoOpen, setContratoOpen] = useState(false);
  const [prospectoContrato, setProspectoContrato] = useState(null);
  const [avisoContrato, setAvisoContrato] = useState(null);

  const [idsConCliente, setIdsConCliente] = useState(new Set());

  useEffect(() => {
    let montado = true;
    clientesService.getAll()
      .then(data => {
        if (!montado || !Array.isArray(data)) return;
        const ids = data
          .map(c => (typeof c.prospecto_id === 'object' ? c.prospecto_id?.id : c.prospecto_id))
          .filter(id => id != null)
          .map(Number);
        setIdsConCliente(new Set(ids));
      })
      .catch(err => console.warn('No se pudo cargar la lista de clientes:', err?.message));
    return () => { montado = false; };
  }, []);

  const handleView = (prospecto) => {
    setProspectoSeleccionado(prospecto);
    setTipoInteraccion('');
    setNotas('');
    setMensaje(null);
    setDialogOpen(true);
  };

  const esCliente = (prospecto) =>
    prospecto.estado === ESTADO_VENDIDO || idsConCliente.has(Number(prospecto.id));

  // Cada quien ve solo lo que capturó; logística y administración ven todo.
  const prospectosDelUsuario = useMemo(
    () => soloMisRegistros(prospectos, usuarioActual),
    [prospectos, usuarioActual]
  );

  const conteos = useMemo(() => {
    const clientes = prospectosDelUsuario.filter(esCliente);
    const perdidos = prospectosDelUsuario.filter(p => p.estado === ESTADO_PERDIDO && !esCliente(p));
    const activos = prospectosDelUsuario.filter(p => !esCliente(p) && p.estado !== ESTADO_PERDIDO);
    return {
      activos: activos.length,
      perdidos: perdidos.length,
      clientes: clientes.length,
      todos: prospectosDelUsuario.length,
      listas: { activos, perdidos, clientes, todos: prospectosDelUsuario }
    };
  }, [prospectosDelUsuario, idsConCliente]);

  const prospectosFiltrados = conteos.listas[filtro] || [];

  const handleGenerarContrato = (prospecto) => {
    setProspectoContrato(prospecto);
    setAvisoContrato(null);
    setContratoOpen(true);
  };

  const datosParaContrato = useMemo(() => {
    if (!prospectoContrato) return null;

    const direccionCompleta = [
      prospectoContrato.direccion_calle_numero,
      prospectoContrato.direccion_colonia
    ].filter(Boolean).join(', ');

    const { texto, lat, lng } = extraerCoordenadas(prospectoContrato.ubicacion_gps);

    return {
      nombre: prospectoContrato.nombre_completo || '',
      telefono1: prospectoContrato.telefono_whatsapp || '',
      calleNumero: direccionCompleta,
      referencias: prospectoContrato.referencia_domicilio || '',
      planNombre: prospectoContrato.plan_interes || null,
      coordenadasGPS: texto,
      lat,
      lng
    };
  }, [prospectoContrato]);

  const handleContratoCreado = async () => {
    const prospecto = prospectoContrato;
    setAvisoContrato({
      tipo: 'success',
      texto: `Contrato de ${prospecto?.nombre_completo || 'el prospecto'} guardado. Aparecerá en Agenda de Instalaciones.`
    });
    if (prospecto?.id) {
      try {
        await updateEstadoProspecto(prospecto.id, ESTADO_VENDIDO);
      } catch (err) {
        console.error('Contrato creado pero no se pudo actualizar el estado:', err);
        setAvisoContrato({
          tipo: 'warning',
          texto: 'El contrato se guardó, pero no se pudo marcar el prospecto como Vendido. Cámbialo a mano desde el seguimiento.'
        });
      }
    }

    setContratoOpen(false);
    setProspectoContrato(null);
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    if (!prospectoSeleccionado || nuevoEstado === prospectoSeleccionado.estado) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const actualizado = await updateEstadoProspecto(prospectoSeleccionado.id, nuevoEstado);
      setProspectoSeleccionado(actualizado);
      setMensaje({ tipo: 'success', texto: `Estado cambiado a "${nuevoEstado}".` });
    } catch (err) {
      console.error('Error al cambiar el estado:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo cambiar el estado. Verifica tu conexión.' });
    }
    setEnviando(false);
  };

  const handleGuardarSeguimiento = async () => {
    if (!tipoInteraccion || !notas.trim()) {
      setMensaje({ tipo: 'error', texto: 'Selecciona el tipo de contacto y escribe una nota.' });
      return;
    }

    setEnviando(true);
    setMensaje(null);

    const datosInteraccion = {
      prospecto_id: prospectoSeleccionado.id,
      tipo_interaccion: tipoInteraccion,
      notas_comerciales: notas
    };

    try {
      await api.post('interacciones/', datosInteraccion);
      setMensaje({ tipo: 'success', texto: ' Seguimiento registrado con éxito.' });
      setNotas('');
      setTipoInteraccion('');
    } catch (err) {
      console.error('Error al guardar seguimiento:', err);
      setMensaje({ tipo: 'error', texto: ' Hubo un error al guardar. Verifica tu conexión.' });
    }
    setEnviando(false);
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'Nuevo': 'primary',
      'Posible Cliente': 'success',
      'Prospecto': 'warning',
      'Contactado': 'info',
      'Interesado': 'warning',
      'Vendido': 'success',
      'Perdido': 'error'
    };
    return colores[estado] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando prospectos...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error al cargar los prospectos: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Seguimiento de Prospectos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Da seguimiento a tus prospectos y convierte en contrato a los que ya se animaron.
        </Typography>
      </Box>

      {avisoContrato && (
        <Alert severity={avisoContrato.tipo} onClose={() => setAvisoContrato(null)} sx={{ borderRadius: 2 }}>
          {avisoContrato.texto}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#475569' }}>
          Filtrar por Estatus:
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {FILTROS.map(({ value, label, icono: Icono, color, colorHover }) => {
            const activo = filtro === value;
            return (
              <Button
                key={value}
                variant={activo ? 'contained' : 'outlined'}
                startIcon={<Icono />}
                onClick={() => setFiltro(value)}
                sx={{
                  minWidth: 160,
                  bgcolor: activo ? color : 'transparent',
                  color: activo ? 'white' : color,
                  borderColor: color, borderWidth: 2, fontWeight: 700,
                  '&:hover': {
                    bgcolor: activo ? colorHover : `${color}14`,
                    borderColor: colorHover
                  }
                }}
              >
                {label} ({conteos[value]})
              </Button>
            );
          })}
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Prospecto</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Dirección</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Plan de Interés</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Fecha de Captura</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estatus</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prospectosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filtro === 'activos' ? 'No tienes prospectos activos por atender'
                      : filtro === 'perdidos' ? 'No hay prospectos marcados como perdidos'
                      : filtro === 'clientes' ? 'Todavía no hay prospectos convertidos en clientes'
                      : 'No tienes prospectos registrados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              prospectosFiltrados.map((prospecto) => {
                const yaEsCliente = esCliente(prospecto);
                return (
                  <TableRow key={prospecto.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>{prospecto.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {prospecto.nombre_completo || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      {prospecto.telefono_whatsapp || (
                        <Typography variant="caption" color="text.secondary">Sin teléfono</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {prospecto.direccion_calle_numero
                        ? [prospecto.direccion_calle_numero, prospecto.direccion_colonia].filter(Boolean).join(', ')
                        : <Typography variant="caption" color="text.secondary">Sin dirección</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      {prospecto.plan_interes || (
                        <Typography variant="caption" color="text.secondary">Sin definir</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {prospecto.fecha_captura ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                          {formatDate(prospecto.fecha_captura)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin fecha</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          label={prospecto.estado || 'Nuevo'}
                          color={getEstadoColor(prospecto.estado)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        {idsConCliente.has(Number(prospecto.id)) && prospecto.estado !== ESTADO_VENDIDO && (
                          <Tooltip title="Ya existe como cliente">
                            <Verified sx={{ fontSize: 18, color: '#10b981' }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          variant="outlined" size="small" startIcon={<Phone />}
                          onClick={() => handleView(prospecto)}
                          sx={{
                            textTransform: 'none', borderRadius: 1.5, color: '#3b82f6', borderColor: '#3b82f6',
                            '&:hover': { borderColor: '#2563eb', backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                          }}
                        >
                          Seguimiento
                        </Button>

                        {yaEsCliente ? (
                          <Button
                            variant="contained" size="small" disabled startIcon={<Verified />}
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Ya es Cliente
                          </Button>
                        ) : (
                          <Button
                            variant="contained" size="small"
                            onClick={() => handleGenerarContrato(prospecto)}
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Generar Contrato
                          </Button>
                        )}
                      </Stack>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          Gestión del Prospecto
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {prospectoSeleccionado && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
                Información del Contacto
              </Typography>
              <Typography variant="body2"><strong>Nombre:</strong> {prospectoSeleccionado.nombre_completo}</Typography>
              <Typography variant="body2"><strong>Teléfono:</strong> {prospectoSeleccionado.telefono_whatsapp}</Typography>
              <Typography variant="body2"><strong>Dirección:</strong> {prospectoSeleccionado.direccion_calle_numero}, {prospectoSeleccionado.direccion_colonia}</Typography>
              <Typography variant="body2"><strong>Interés:</strong> {prospectoSeleccionado.plan_interes || 'N/A'}</Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1e293b' }}>
                Etapa del Prospecto
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  select
                  label="Estado"
                  size="small"
                  fullWidth
                  value={ETAPAS_EMBUDO.includes(prospectoSeleccionado.estado) ? prospectoSeleccionado.estado : ''}
                  onChange={(e) => handleCambiarEstado(e.target.value)}
                  disabled={enviando || esCliente(prospectoSeleccionado)}
                  helperText={
                    esCliente(prospectoSeleccionado)
                      ? 'Ya es cliente: la etapa no se modifica'
                      : 'Mueve el prospecto en el embudo'
                  }
                >
                  {ETAPAS_EMBUDO.map(etapa => (
                    <MenuItem key={etapa} value={etapa}>{etapa}</MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleCambiarEstado(ESTADO_PERDIDO)}
                  disabled={enviando || esCliente(prospectoSeleccionado) || prospectoSeleccionado.estado === ESTADO_PERDIDO}
                  sx={{ whiteSpace: 'nowrap', textTransform: 'none', minWidth: 180 }}
                >
                  Marcar como Perdido
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                Registrar Nuevo Seguimiento
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  variant={tipoInteraccion === 'WhatsApp' ? 'contained' : 'outlined'}
                  color="success"
                  startIcon={<WhatsApp />}
                  onClick={() => setTipoInteraccion('WhatsApp')}
                  fullWidth
                >
                  WhatsApp
                </Button>
                <Button
                  variant={tipoInteraccion === 'Llamada' ? 'contained' : 'outlined'}
                  color="primary"
                  startIcon={<Phone />}
                  onClick={() => setTipoInteraccion('Llamada')}
                  fullWidth
                >
                  Llamada
                </Button>
              </Stack>

              <TextField
                label="Notas Comerciales (Ej. 'Le marqué y pidió que le llame mañana')"
                multiline
                rows={3}
                fullWidth
                size="small"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={handleGuardarSeguimiento}
                disabled={enviando || !tipoInteraccion || !notas.trim()}
              >
                {enviando ? 'Guardando...' : 'Guardar Seguimiento'}
              </Button>

              {mensaje && (
                <Alert severity={mensaje.tipo} sx={{ mt: 2 }}>
                  {mensaje.texto}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          {prospectoSeleccionado && !esCliente(prospectoSeleccionado) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentTurnedIn />}
              onClick={() => {
                setDialogOpen(false);
                handleGenerarContrato(prospectoSeleccionado);
              }}
              sx={{ textTransform: 'none', mr: 'auto' }}
            >
              Se animó: Generar Contrato
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={contratoOpen}
        onClose={() => setContratoOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, gap: 1 }}>
          <Box>
            Nuevo Contrato
            {prospectoContrato && (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
                Datos precargados de {prospectoContrato.nombre_completo}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setContratoOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {contratoOpen && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Se reutilizaron nombre, teléfono, dirección y ubicación del prospecto.
                Faltan los datos que el contrato exige y el prospecto no tiene:
                <strong> INE, correo, evidencias y firma</strong>.
              </Alert>

              <PlanCotizacion
                usuarioActual={usuarioActual}
                datosDesdeProspecto={datosParaContrato}
                enModal
                onContratoCreado={handleContratoCreado}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SegumientoProspecto;