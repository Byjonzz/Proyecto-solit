import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Stack, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  Divider, Grid
} from '@mui/material';
import {
  Build, Cancel, Visibility, Close, CloudUpload, Send,
  CheckCircle, ReportProblem, Person, Phone, Home, LocalOffer, Block
} from '@mui/icons-material';

import {
  revisionContratosService, ESTATUS_CONTRATO, ESTATUS_EN_INSTALACION, FOTO_POR_MOTIVO
} from '../../services/revisionContratosService';
import { esPdf } from '../../utils/evidencias';
import { soloMisRegistros, paramsDeRegistrador } from '../../utils/propiedad';
import BotonEvidencia from '../Forms/BotonEvidencia';
import VistaEvidencia from '../Forms/VistaEvidencia';

// Fotos que el canvaceador puede volver a subir. Los datos de texto no se tocan:
// ya pasaron la validación del formulario de contrato.
const CAMPOS_FOTO = [
  { campo: 'foto_ine_frente', etiqueta: 'INE (frente)' },
  { campo: 'foto_ine_reverso', etiqueta: 'INE (reverso)' },
  { campo: 'foto_recibo_luz', etiqueta: 'Recibo de luz' },
  { campo: 'foto_fachada', etiqueta: 'Fachada' }
];

const FILTROS = [
  { value: 'instalacion', label: 'En Instalación', icono: Build, color: '#3b82f6', colorHover: '#2563eb' },
  { value: 'rechazados', label: 'Rechazados', icono: Cancel, color: '#ef4444', colorHover: '#dc2626' },
  // Gris: no es un problema que el canvaceador deba resolver, es una venta que
  // ya no va. Solo se consulta.
  { value: 'cancelados', label: 'Cancelados', icono: Block, color: '#64748b', colorHover: '#475569' }
];

const MisContratos = ({ usuarioActual }) => {
  const [contratos, setContratos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);

  const [filtro, setFiltro] = useState('instalacion');

  // Detalle en solo lectura (contratos en instalación)
  const [detalle, setDetalle] = useState(null);

  // Corrección de evidencias (contratos rechazados)
  const [corrigiendo, setCorrigiendo] = useState(null);
  const [fotosNuevas, setFotosNuevas] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [visor, setVisor] = useState({ open: false, url: '', titulo: '' });

  useEffect(() => {
    cargarContratos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual]);

  const cargarContratos = async () => {
    try {
      setCargando(true);
      setError('');
      // El servidor ya acota por registrador; el filtro local queda como red de
      // seguridad por si la respuesta llegara sin filtrar.
      const data = await revisionContratosService.getAll(paramsDeRegistrador(usuarioActual));
      setContratos(soloMisRegistros(data, usuarioActual));
    } catch (err) {
      setError('No se pudieron cargar tus contratos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCargando(false);
    }
  };

  const listas = useMemo(() => ({
    instalacion: contratos.filter(c => ESTATUS_EN_INSTALACION.includes(c.estatus)),
    rechazados: contratos.filter(c => c.estatus === ESTATUS_CONTRATO.RECHAZADO),
    cancelados: contratos.filter(c => c.estatus === ESTATUS_CONTRATO.CANCELADO)
  }), [contratos]);

  const visibles = listas[filtro] || [];

  const formatFecha = (iso) => {
    if (!iso) return 'Sin fecha';
    return new Date(iso).toLocaleString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      // Hora de México siempre, aunque el dispositivo tenga otra zona.
      timeZone: 'America/Mexico_City'
    });
  };

  // ===== Corrección de evidencias =====
  const abrirCorreccion = (contrato) => {
    setCorrigiendo(contrato);
    setFotosNuevas({});
    setError('');
  };

  const handleReenviar = async () => {
    if (!corrigiendo) return;
    if (Object.keys(fotosNuevas).length === 0) {
      setError('Sube al menos una foto corregida antes de reenviar');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await revisionContratosService.reenviarCorregido(corrigiendo.id, fotosNuevas);
      setAviso({
        tipo: 'success',
        texto: `Contrato #${corrigiendo.id} reenviado a logística para su revisión.`
      });
      setCorrigiendo(null);
      setFotosNuevas({});
      cargarContratos();
    } catch (err) {
      setError('No se pudo reenviar: ' + (err.response?.data?.detail || err.message));
    } finally {
      setEnviando(false);
    }
  };

  // Fotos que logística señaló como incorrectas, deducidas del motivo guardado.
  const fotosSenaladas = (contrato) => {
    const motivo = (contrato?.motivo_rechazo || '').toLowerCase();
    const senaladas = new Set();
    Object.entries(FOTO_POR_MOTIVO).forEach(([clave, campo]) => {
      const palabras = {
        ine_frente: 'ine (frente)', ine_reverso: 'ine (reverso)',
        recibo: 'recibo', fachada: 'fachada'
      }[clave];
      if (palabras && motivo.includes(palabras)) senaladas.add(campo);
    });
    return senaladas;
  };

  const renderFoto = (url, titulo) => (
    <VistaEvidencia
      valor={url}
      titulo={titulo}
      onAmpliar={url ? () => setVisor({ open: true, url, titulo }) : null}
    />
  );

  if (cargando) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Cargando tus contratos...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Mis Contratos</Typography>
        <Typography variant="body2" color="text.secondary">
          Consulta tus contratos en instalación y corrige los que logística te regresó.
        </Typography>
      </Box>

      {aviso && (
        <Alert severity={aviso.tipo} onClose={() => setAviso(null)} sx={{ borderRadius: 2 }}>
          {aviso.texto}
        </Alert>
      )}
      {error && !corrigiendo && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

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
                  '&:hover': { bgcolor: activo ? colorHover : `${color}14`, borderColor: colorHover }
                }}
              >
                {label} ({listas[value].length})
              </Button>
            );
          })}
        </Stack>
      </Paper>

      {filtro === 'rechazados' && listas.rechazados.length > 0 && (
        <Alert severity="warning" icon={<ReportProblem />}>
          Estos contratos los regresó logística. Corrige las fotos señaladas y reenvíalos.
          <strong> Solo puedes cambiar las evidencias</strong>: los demás datos ya fueron validados.
        </Alert>
      )}

      {filtro === 'cancelados' && listas.cancelados.length > 0 && (
        <Alert severity="info" icon={<Block />}>
          Ventas que ya no se concretaron. Se conservan
          <strong> solo como registro</strong>: no se pueden editar ni reenviar a revisión.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Dirección</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                {filtro === 'rechazados' ? 'Motivo del rechazo'
                  : filtro === 'cancelados' ? 'Motivo de la cancelación'
                  : 'Fecha de venta'}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estatus</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filtro === 'instalacion'
                      ? 'Todavía no tienes contratos con cita de instalación asignada'
                      : filtro === 'cancelados'
                        ? 'No tienes contratos cancelados'
                        : 'No tienes contratos rechazados. Buen trabajo.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : visibles.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>{c.id}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{c.nombre_completo}</TableCell>
                <TableCell>{c.plan_contratado}</TableCell>
                <TableCell>{c.calle_numero}</TableCell>
                <TableCell>
                  {filtro === 'rechazados' ? (
                    <Box>
                      <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600 }}>
                        {c.motivo_rechazo || 'Sin motivo registrado'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFecha(c.fecha_rechazo)}
                        {c.veces_rechazado > 1 && ` · regresado ${c.veces_rechazado} veces`}
                      </Typography>
                    </Box>
                  ) : filtro === 'cancelados' ? (
                    <Box>
                      <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
                        {c.motivo_cancelacion || 'Sin motivo registrado'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cancelado el {formatFecha(c.fecha_cancelacion)}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                      {formatFecha(c.fecha_creacion)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={c.estatus}
                    size="small"
                    color={c.estatus === ESTATUS_CONTRATO.RECHAZADO ? 'error'
                      : c.estatus === ESTATUS_CONTRATO.CANCELADO ? 'default'
                      : c.estatus.startsWith('Complet') ? 'success' : 'info'}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="center">
                  {/* Se pregunta por 'rechazados' y no por "el que no es
                      instalación": así un filtro nuevo nace de solo lectura en
                      vez de heredar el botón de corregir sin querer. */}
                  {filtro === 'rechazados' ? (
                    <Button
                      variant="contained" size="small" color="error" startIcon={<CloudUpload />}
                      onClick={() => abrirCorreccion(c)}
                      sx={{ textTransform: 'none', borderRadius: 1.5 }}
                    >
                      Corregir fotos
                    </Button>
                  ) : (
                    <Button
                      variant="outlined" size="small" startIcon={<Visibility />}
                      onClick={() => setDetalle(c)}
                      sx={{
                        textTransform: 'none', borderRadius: 1.5, color: '#3b82f6', borderColor: '#3b82f6',
                        '&:hover': { borderColor: '#2563eb', backgroundColor: 'rgba(59,130,246,0.04)' }
                      }}
                    >
                      Ver detalle
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===== Detalle en solo lectura ===== */}
      <Dialog open={Boolean(detalle)} onClose={() => setDetalle(null)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Contrato #{detalle?.id}
          <IconButton onClick={() => setDetalle(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detalle && (
            <Stack spacing={1.5}>
              {detalle.estatus === ESTATUS_CONTRATO.CANCELADO ? (
                <Alert severity="warning" icon={<Block />}>
                  Contrato cancelado el {formatFecha(detalle.fecha_cancelacion)}. Queda solo
                  como registro: no se puede editar ni reenviar.
                  {detalle.motivo_cancelacion && (
                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
                      {detalle.motivo_cancelacion}
                    </Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="info" icon={<Visibility />}>
                  Vista de solo lectura. Este contrato ya pasó la validación de logística.
                </Alert>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2"><strong>{detalle.nombre_completo}</strong></Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2">
                  {detalle.telefono1}{detalle.telefono2 ? ` / ${detalle.telefono2}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Home fontSize="small" color="action" />
                <Typography variant="body2">{detalle.calle_numero}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer fontSize="small" color="action" />
                <Typography variant="body2">
                  {detalle.plan_contratado} · <strong>${Number(detalle.monto_total).toFixed(2)}</strong>
                </Typography>
              </Box>

              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Evidencias</Typography>
              <Grid container spacing={1.5}>
                {CAMPOS_FOTO.map(({ campo, etiqueta }) => (
                  <Grid item xs={6} key={campo}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {etiqueta}
                    </Typography>
                    {renderFoto(detalle[campo], etiqueta)}
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ===== Corrección de evidencias ===== */}
      <Dialog open={Boolean(corrigiendo)} onClose={() => !enviando && setCorrigiendo(null)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
          Corregir evidencias — Contrato #{corrigiendo?.id}
          <IconButton onClick={() => setCorrigiendo(null)} disabled={enviando}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {corrigiendo && (
            <Stack spacing={2}>
              <Alert severity="error" icon={<ReportProblem />}>
                <strong>Logística regresó este contrato:</strong><br />
                {corrigiendo.motivo_rechazo || 'Sin motivo registrado'}
              </Alert>

              <Typography variant="body2" color="text.secondary">
                Sustituye las fotos marcadas. Los datos del cliente no se pueden editar
                aquí porque ya pasaron la validación del formulario.
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <Grid container spacing={2}>
                {CAMPOS_FOTO.map(({ campo, etiqueta }) => {
                  const senalada = fotosSenaladas(corrigiendo).has(campo);
                  const nueva = fotosNuevas[campo];
                  const esComprobante = campo === 'foto_recibo_luz';
                  return (
                    <Grid item xs={12} sm={6} key={campo}>
                      <Paper variant="outlined" sx={{
                        p: 1.5, borderRadius: 2,
                        borderColor: nueva ? '#16a34a' : senalada ? '#ef4444' : '#e2e8f0',
                        borderWidth: senalada || nueva ? 2 : 1
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, flex: 1 }}>{etiqueta}</Typography>
                          {senalada && !nueva && (
                            <Chip size="small" color="error" label="Corregir" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          {nueva && <CheckCircle sx={{ fontSize: 18, color: '#16a34a' }} />}
                        </Box>

                        <VistaEvidencia
                          valor={nueva || corrigiendo[campo]}
                          titulo={etiqueta}
                          onAmpliar={() => setVisor({ open: true, url: nueva || corrigiendo[campo], titulo: etiqueta })}
                        />

                        {/* El comprobante acepta PDF; el resto son fotos */}
                        <BotonEvidencia
                          etiqueta={nueva ? 'Cambiar de nuevo' : (esComprobante ? 'Subir comprobante' : 'Subir foto')}
                          cargada={Boolean(nueva)}
                          permitirPdf={esComprobante}
                          icono={<CloudUpload />}
                          size="small"
                          fullWidth
                          sx={{ mt: 1, textTransform: 'none' }}
                          onArchivo={(dataUri) => {
                            setFotosNuevas(prev => ({ ...prev, [campo]: dataUri }));
                            setError('');
                          }}
                          onError={(mensaje) => setError(mensaje)}
                        />
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCorrigiendo(null)} disabled={enviando} color="inherit">Cancelar</Button>
          <Button
            variant="contained" color="success" startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <Send />}
            onClick={handleReenviar}
            disabled={enviando || Object.keys(fotosNuevas).length === 0}
          >
            {enviando ? 'Reenviando...' : 'Reenviar a logística'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Visor de imagen */}
      <Dialog open={visor.open} onClose={() => setVisor({ open: false, url: '', titulo: '' })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {visor.titulo}
          <IconButton onClick={() => setVisor({ open: false, url: '', titulo: '' })}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2 }}>
          {/* Un PDF no se puede mostrar en <img>: va en un iframe */}
          {esPdf(visor.url) ? (
            <iframe
              src={visor.url}
              title={visor.titulo}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          ) : (
            <img src={visor.url} alt={visor.titulo} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MisContratos;
