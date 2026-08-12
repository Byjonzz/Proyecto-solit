import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, Alert,
  Stack, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Divider, Tooltip
} from '@mui/material';
import {
  EmojiEvents, ChevronLeft, ChevronRight, Build, Savings, InfoOutlined,
  CheckCircle, Visibility, Today
} from '@mui/icons-material';

import api from '../../services/api';
import { ESTADOS } from '../../services/instalacionesSeguimientoService';
import { formatearDuracion } from '../../services/rutaService';
import {
  lunesDeLaSemana, domingoDeLaSemana, desplazarSemana, claveSemanaISO,
  rangoLegible, dentroDeLaSemana
} from '../../utils/semana';

const META_SEMANAL_POR_DEFECTO = 10;
const MONTO_POR_EXCEDENTE_POR_DEFECTO = 150;

const dinero = (n) =>
  `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const idDeCampo = (valor) => {
  if (valor == null) return null;
  const n = Number(typeof valor === 'object' ? valor.id : valor);
  return isNaN(n) ? null : n;
};

const BonoProactividad = () => {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [tecnicos, setTecnicos] = useState([]);
  const [instalaciones, setInstalaciones] = useState([]);
  const [bonos, setBonos] = useState([]);

  const [metaSemanal, setMetaSemanal] = useState(META_SEMANAL_POR_DEFECTO);
  const [montoPorExcedente, setMontoPorExcedente] = useState(MONTO_POR_EXCEDENTE_POR_DEFECTO);

  const [semana, setSemana] = useState(() => lunesDeLaSemana(new Date()));
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');

      const [resTecnicos, resInstalaciones, resBonos] = await Promise.all([
        api.get('/usuarios/?rol=Tecnico'),
        api.get('/instalaciones/'),
        api.get('/bonos_proactividad/')
      ]);

      const lista = resTecnicos.data || [];
      setTecnicos(lista);
      setInstalaciones(resInstalaciones.data || []);
      setBonos(resBonos.data || []);

      const conMeta = lista.find((t) => Number(t.insta_semanal) > 0);
      if (conMeta) setMetaSemanal(Number(conMeta.insta_semanal));
    } catch (err) {
      setError('No se pudieron cargar los datos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCargando(false);
    }
  };

  const claveSemana = claveSemanaISO(semana);

  const calculo = useMemo(() => {
    return tecnicos
      .map((tecnico) => {
        const idTecnico = Number(tecnico.id);

        const suyas = instalaciones.filter((inst) =>
          idDeCampo(inst.tecnico_id) === idTecnico &&
          inst.estado === ESTADOS.COMPLETADA &&
          dentroDeLaSemana(inst.fecha_completada, semana)
        );

        const completadas = suyas.length;
        const excedentes = Math.max(0, completadas - metaSemanal);

        const yaGenerado = bonos.find((b) =>
          idDeCampo(b.tecnico_id) === idTecnico && b.periodo_semana === claveSemana
        ) || null;

        return {
          id: tecnico.id,
          nombre: `${tecnico.nombre || ''} ${tecnico.apellido || ''}`.trim() || `Técnico #${tecnico.id}`,
          numeroEmpleado: tecnico.numero_empleado || `TEC-${tecnico.id}`,
          completadas,
          excedentes,
          monto: excedentes * montoPorExcedente,
          suyas,
          yaGenerado
        };
      })
      .sort((a, b) => b.completadas - a.completadas);
  }, [tecnicos, instalaciones, bonos, semana, claveSemana, metaSemanal, montoPorExcedente]);

  const resumen = useMemo(() => ({
    conBono: calculo.filter((t) => t.excedentes > 0).length,
    totalInstalaciones: calculo.reduce((s, t) => s + t.completadas, 0),
    totalExcedentes: calculo.reduce((s, t) => s + t.excedentes, 0),
    totalPagar: calculo.reduce((s, t) => s + t.monto, 0),
    porGenerar: calculo.filter((t) => t.excedentes > 0 && !t.yaGenerado).length
  }), [calculo]);

  const guardarMeta = async () => {
    setGuardando(true);
    setError('');
    setAviso('');
    try {
      await Promise.all(
        tecnicos.map((t) => api.patch(`/usuarios/${t.id}/`, { insta_semanal: Number(metaSemanal) }))
      );
      setAviso(`Meta de ${metaSemanal} instalaciones guardada para ${tecnicos.length} técnico(s).`);
      await cargarDatos();
    } catch (err) {
      setError('No se pudo guardar la meta: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGuardando(false);
    }
  };

  const generarBonos = async () => {
    const pendientes = calculo.filter((t) => t.excedentes > 0 && !t.yaGenerado);
    if (pendientes.length === 0) return;

    setGenerando(true);
    setError('');
    setAviso('');
    try {
      await Promise.all(
        pendientes.map((t) => api.post('/bonos_proactividad/', {
          tecnico_id: t.id,
          instalaciones_exedentes: t.excedentes,
          monto: t.monto,
          periodo_semana: claveSemana,
          estado: 'Pendiente'
        }))
      );
      setAviso(`Se generaron ${pendientes.length} bono(s) por ${dinero(pendientes.reduce((s, t) => s + t.monto, 0))}.`);
      await cargarDatos();
    } catch (err) {
      setError('No se pudieron generar los bonos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerando(false);
    }
  };

  const esSemanaEnCurso = claveSemana === claveSemanaISO(lunesDeLaSemana(new Date()));

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}
      >
        <EmojiEvents sx={{ color: '#f59e0b' }} />
        Bono por Proactividad — Técnicos
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {aviso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAviso('')}>{aviso}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Savings sx={{ color: '#16a34a' }} /> Esquema
              </Typography>

              <TextField
                label="Meta semanal de instalaciones"
                type="number"
                fullWidth
                value={metaSemanal}
                onChange={(e) => setMetaSemanal(Math.max(0, Number(e.target.value)))}
                helperText="El bono empieza a contar a partir de la instalación siguiente."
                sx={{ mb: 2.5 }}
              />

              <TextField
                label="Pago por instalación excedente"
                type="number"
                fullWidth
                value={montoPorExcedente}
                onChange={(e) => setMontoPorExcedente(Math.max(0, Number(e.target.value)))}
                InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: '#64748b' }}>$</Typography> }}
                sx={{ mb: 2.5 }}
              />

              <Alert severity="info" icon={<InfoOutlined fontSize="inherit" />} sx={{ mb: 2 }}>
                Solo cuentan las instalaciones que el técnico dejó <strong>completadas</strong> dentro
                de la semana. Las que quedaron aceptadas o en sitio no entran.
              </Alert>

              <Button
                variant="contained"
                fullWidth
                onClick={guardarMeta}
                disabled={guardando || tecnicos.length === 0}
                sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
              >
                {guardando ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Guardar meta'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={() => setSemana(desplazarSemana(semana, -1))} size="small">
                    <ChevronLeft />
                  </IconButton>
                  <Box sx={{ textAlign: 'center', minWidth: 190 }}>
                    <Typography sx={{ fontWeight: 800, color: '#1e293b' }}>
                      {rangoLegible(semana)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {claveSemana}{esSemanaEnCurso ? ' · semana en curso' : ''}
                    </Typography>
                  </Box>
                  <IconButton onClick={() => setSemana(desplazarSemana(semana, 1))} size="small">
                    <ChevronRight />
                  </IconButton>
                  {!esSemanaEnCurso && (
                    <Tooltip title="Ir a la semana en curso">
                      <IconButton size="small" onClick={() => setSemana(lunesDeLaSemana(new Date()))}>
                        <Today fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                <Button
                  variant="contained"
                  onClick={generarBonos}
                  disabled={generando || resumen.porGenerar === 0}
                  sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                >
                  {generando
                    ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                    : `Generar bonos (${resumen.porGenerar})`}
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip icon={<Build />} label={`${resumen.totalInstalaciones} completadas`} />
                <Chip
                  icon={<EmojiEvents />}
                  label={`${resumen.totalExcedentes} excedentes`}
                  sx={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}
                />
                <Chip
                  label={`Total a pagar: ${dinero(resumen.totalPagar)}`}
                  sx={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}
                />
              </Stack>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Técnico</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Completadas</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Meta</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Excedentes</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Bono</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Estado</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Detalle</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calculo.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No hay técnicos registrados</Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {calculo.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{t.nombre}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {t.numeroEmpleado}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{t.completadas}</TableCell>
                        <TableCell align="center" sx={{ color: '#64748b' }}>{metaSemanal}</TableCell>
                        <TableCell align="center">
                          <Typography sx={{ fontWeight: 800, color: t.excedentes > 0 ? '#d97706' : '#94a3b8' }}>
                            {t.excedentes > 0 ? `+${t.excedentes}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 800, color: t.monto > 0 ? '#15803d' : '#94a3b8' }}>
                            {t.monto > 0 ? dinero(t.monto) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {t.yaGenerado ? (
                            <Chip
                              size="small"
                              icon={<CheckCircle />}
                              label={t.yaGenerado.estado || 'Generado'}
                              sx={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}
                            />
                          ) : t.excedentes > 0 ? (
                            <Chip size="small" label="Por generar" sx={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
                          ) : (
                            <Chip size="small" label="Sin excedentes" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver las instalaciones que se contaron">
                            <span>
                              <IconButton
                                size="small"
                                disabled={t.completadas === 0}
                                onClick={() => setDetalle(t)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={Boolean(detalle)} onClose={() => setDetalle(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {detalle?.nombre}
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Instalaciones completadas del {rangoLegible(semana)}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {(detalle?.suyas || []).map((inst) => (
              <Paper key={inst.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{inst.numero_orden}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {new Date(inst.fecha_completada).toLocaleString('es-MX', {
                        weekday: 'long', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                  {inst.duracion_instalacion_seg != null && (
                    <Chip size="small" label={formatearDuracion(inst.duracion_instalacion_seg)} />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ color: '#64748b' }}>
              {detalle?.completadas} completadas · meta {metaSemanal} · {detalle?.excedentes} excedentes
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#15803d' }}>{dinero(detalle?.monto)}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalle(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BonoProactividad;
