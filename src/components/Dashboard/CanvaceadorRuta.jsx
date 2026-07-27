import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, Chip, Tooltip, CircularProgress, Divider,
  Card, CardContent, Grid, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert
} from '@mui/material';
import {
  TrendingUp, AssignmentTurnedIn, InfoOutlined, PlayArrow, Stop,
  LocationOn, HistoryOutlined
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import api from '../../services/api';

const BannerComisiones = ({ usuarioActual }) => {
  const [datos, setDatos] = useState({
    ventas: 0,
    desglose: '',
    pagoCalculado: 0,
    etiquetaModalidad: 'Cargando...',
    etiquetaChip: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarComisiones = async () => {
      if (!usuarioActual?.perfil_id) return;

      if (usuarioActual.rol === 'Admin' || usuarioActual.is_superuser) {
          setDatos({
            ventas: 0,
            desglose: 'Vista de Administrador',
            pagoCalculado: 0,
            etiquetaModalidad: 'Modo Admin',
            etiquetaChip: 'Admin'
          });
          setLoading(false);
          return;
      }

      try {
        const resCanv = await api.get(`/canvaceadores/${usuarioActual.perfil_id}/`);
        const canvData = resCanv.data;

        const resContratos = await api.get('/contratos/');
        const misContratos = resContratos.data.filter(
          c => c.canvaceador_id === usuarioActual.perfil_id && c.comision_pagada === false
        );

        const conteoPlanes = {};
        misContratos.forEach(c => {
          const plan = c.plan_contratado || 'Otros';
          conteoPlanes[plan] = (conteoPlanes[plan] || 0) + 1;
        });

        const textoDesglose = Object.keys(conteoPlanes).length > 0
          ? Object.entries(conteoPlanes).map(([plan, cant]) => `${cant} ${plan}`).join(', ')
          : 'Sin ventas registradas';

        let modalidad = 'solo_metas';
        let base = 1000;
        let comisionFija = 50;

        try {
          const resEsquema = await api.get('/esquemas_pago/');
          if (resEsquema.data && resEsquema.data.length > 0) {
            const esquemaActivo = resEsquema.data[resEsquema.data.length - 1];
            modalidad = esquemaActivo.modalidad || 'solo_metas';
            base = parseFloat(esquemaActivo.salario_base || 1000);
            comisionFija = parseFloat(esquemaActivo.comision_plana_porcentaje || 50);
          }
        } catch (e) { }

        const totalVentas = canvData.contratos_pendientes || 0;
        const volumen = canvData.volumen_pendiente || 0;

        let pagoFinal = 0;
        let etiquetaModalidad = "";
        let etiquetaChip = "";

        if (modalidad === 'solo_metas') {
          let porcentaje = 0;
          if (totalVentas >= 6) porcentaje = 100;
          else if (totalVentas >= 4) porcentaje = 60;
          else if (totalVentas >= 1) porcentaje = 30;

          pagoFinal = volumen * (porcentaje / 100);
          etiquetaModalidad = "Pago por Metas";
          etiquetaChip = `Meta ${porcentaje}%`;
        }
        else if (modalidad === 'base_mas_comision') {
          pagoFinal = base + (volumen * (comisionFija / 100));
          etiquetaModalidad = "Base + Comisión";
          etiquetaChip = `Fijo ${comisionFija}%`;
        }
        else if (modalidad === 'comision_pura') {
          pagoFinal = volumen * (comisionFija / 100);
          etiquetaModalidad = "Comisión Pura";
          etiquetaChip = `Fijo ${comisionFija}%`;
        }

        setDatos({
          ventas: totalVentas,
          desglose: textoDesglose,
          pagoCalculado: pagoFinal,
          etiquetaModalidad,
          etiquetaChip
        });

      } catch (error) {
        if (error.response && error.response.status === 404) {
          setDatos({
            ventas: 0,
            desglose: 'Vista de Administrador',
            pagoCalculado: 0,
            etiquetaModalidad: 'Modo Admin',
            etiquetaChip: 'Admin'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    cargarComisiones();
  }, [usuarioActual]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, bgcolor: '#0f172a', borderRadius: 3, mb: 4 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{
      backgroundColor: '#0f172a', color: 'white', borderRadius: 3, p: { xs: 2, md: 3 },
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 3, mb: 4, boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>
          {usuarioActual?.nombre?.charAt(0) || 'U'}
        </Avatar>
        <Box>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Hola de nuevo,</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{usuarioActual?.nombre || 'Usuario'}</Typography>
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#334155', display: { xs: 'none', md: 'block' } }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssignmentTurnedIn sx={{ color: '#10b981', fontSize: 40 }} />
        <Box>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Contratos Semanales</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{datos.ventas} Ventas</Typography>
            <Chip
              label={datos.etiquetaChip}
              size="small"
              sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 700, height: 20 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>({datos.desglose})</Typography>
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#334155', display: { xs: 'none', md: 'block' } }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TrendingUp sx={{ color: '#f59e0b', fontSize: 40 }} />
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Pago Calculado Actual</Typography>
            <Tooltip title="Modalidad de trabajo asignada por administración.">
              <InfoOutlined sx={{ fontSize: 16, color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
            <Chip
              label={datos.etiquetaModalidad}
              size="small"
              sx={{ bgcolor: '#3b82f6', color: 'white', height: 18, fontSize: '0.65rem', fontWeight: 700 }}
            />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>
            ${datos.pagoCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const CanvaceadorRuta = ({ usuarioActual }) => {

  const [tracking, setTracking] = useState(false);
  const [posicionGPS, setPosicionGPS] = useState(null);
  const [errorGPS, setErrorGPS] = useState('Buscando señal GPS...');

  const [rutaData, setRutaData] = useState(null);
  const [historialRutas, setHistorialRutas] = useState([]); 
  const [puntosMapa, setPuntosMapa] = useState([]);
  const [puntosOriginales, setPuntosOriginales] = useState([]);
  const [loadingRuta, setLoadingRuta] = useState(true);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const consultarRutas = async () => {
      try {
        const respuesta = await api.get('rutas_canvaceadores/');

        if (respuesta.data && respuesta.data.length > 0) {

          const miRutaActiva = respuesta.data[respuesta.data.length - 1];
          setRutaData(miRutaActiva);

          const rutasAnteriores = respuesta.data.filter(r => r.id !== miRutaActiva.id);
          setHistorialRutas(rutasAnteriores);

          if (miRutaActiva.camino_trazado) {
            const coordString = miRutaActiva.camino_trazado
              .replace(/SRID=\d+;/g, "")
              .replace(/LINESTRING\s*\(/i, "")
              .replace(/\)/g, "");

            const parejas = coordString.split(",");
            const coordenadasProcesadas = [];

            parejas.forEach(par => {
              const partes = par.trim().split(/\s+/);
              if (partes.length >= 2) {
                const lng = parseFloat(partes[0]);
                const lat = parseFloat(partes[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  coordenadasProcesadas.push([lat, lng]);
                }
              }
            });

            setPuntosOriginales(coordenadasProcesadas);

            if (coordenadasProcesadas.length >= 2) {
              try {
                const stringParaApi = coordenadasProcesadas.map(c => `${c[1]},${c[0]}`).join(';');
                const resOsrm = await axios.get(`https://router.project-osrm.org/route/v1/foot/${stringParaApi}?overview=full&geometries=geojson`);
                
                if (resOsrm.data && resOsrm.data.routes && resOsrm.data.routes.length > 0) {
                  const rutaCalles = resOsrm.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                  setPuntosMapa(rutaCalles); 
                } else {
                  setPuntosMapa(coordenadasProcesadas);
                }
              } catch (e) {
                console.warn("No se pudo usar OSRM, usando línea recta:", e);
                setPuntosMapa(coordenadasProcesadas);
              }
            } else {
              setPuntosMapa(coordenadasProcesadas);
            }
          }
        }
      } catch (error) {
        console.error("Error al traer rutas de la API:", error);
      } finally {
        setLoadingRuta(false);
      }
    };

    consultarRutas();
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setPosicionGPS([position.coords.latitude, position.coords.longitude]);
          setErrorGPS('');
        },
        (error) => {
          setErrorGPS('Por favor, activa el GPS de tu dispositivo para iniciar ruta.');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      setErrorGPS('Tu navegador no soporta geolocalización.');
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    let intervaloPing;
    if (tracking && posicionGPS && rutaData) {
      intervaloPing = setInterval(async () => {
        try {
          await api.post('Tracking/', {
            ruta: rutaData.id,
            latitud: posicionGPS[0],
            longitud: posicionGPS[1]
          });
          console.log(" [TELEMETRÍA ENVIADA]");
        } catch (e) {
          console.error("Error al enviar ping:", e);
        }
      }, 10000);
    }
    return () => clearInterval(intervaloPing);
  }, [tracking, posicionGPS, rutaData]);

  const checarDistancia = (esPuntoInicial) => {
    if (!posicionGPS || puntosOriginales.length === 0) return false;

    const objetivoCoordenada = esPuntoInicial ? puntosOriginales[0] : puntosOriginales[puntosOriginales.length - 1];
    const vendedor = turf.point([posicionGPS[1], posicionGPS[0]]);
    const objetivo = turf.point([objetivoCoordenada[1], objetivoCoordenada[0]]);

    const metros = turf.distance(vendedor, objetivo) * 1000;
    return metros <= 50;
  };

  const manejarRuta = () => {
    if (puntosOriginales.length === 0) {
      alert("⚠️ No hay ninguna ruta cargada desde el servidor.");
      return;
    }
    if (!tracking) {
      if (checarDistancia(true)) {
        setTracking(true);
        alert("🟢 Ruta Iniciada con éxito.");
      } else {
        alert("❌ Error: Acércate a la zona de inicio.");
      }
    } else {
      if (checarDistancia(false)) {
        setTracking(false);
        alert("✅ Recorrido finalizado exitosamente.");
      } else {
        alert("❌ Error: No has llegado al destino de la ruta.");
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

      <BannerComisiones usuarioActual={usuarioActual} />

      {errorGPS && (
        <Alert severity="warning" sx={{ mb: 3 }}>{errorGPS}</Alert>
      )}

      {tracking && (
        <Alert severity="info" sx={{ mb: 3, border: '1px solid #bfdbfe' }}>
          📡 <strong>Recorrido Activo:</strong> Tu ubicación se está enviando al servidor.
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Mi Ruta de Canvaceo: {loadingRuta ? 'Cargando...' : (rutaData?.zona_asignada || 'Sin Zona')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inicia tu jornada de campo para trazar la ruta del día.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color={tracking ? "error" : "primary"}
            startIcon={tracking ? <Stop /> : <PlayArrow />}
            sx={{ fontWeight: 700 }}
            onClick={manejarRuta}
            disabled={!!errorGPS || loadingRuta}
          >
            {tracking ? "TERMINAR RUTA" : "INICIAR RUTA DE HOY"}
          </Button>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>

            <Grid item xs={12} md={7}>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, height: '100%' }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 700, color: '#475569' }}>
                  <LocationOn color={tracking ? "error" : "primary"} fontSize="small" />
                  Mapa del Recorrido Asignado
                </Typography>

                {puntosMapa.length > 0 && (posicionGPS || puntosOriginales[0]) ? (
                  <Box sx={{ height: 450, borderRadius: 2, overflow: 'hidden' }}>
                    <MapContainer
                      center={posicionGPS || puntosOriginales[0]}
                      zoom={16}
                      style={{ height: '100%', width: '700px' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                      <Polyline positions={puntosMapa} color="#ef4444" weight={6} />

                      <Marker position={puntosOriginales[0]}>
                        <Popup>Punto de Inicio Asignado</Popup>
                      </Marker>

                      {posicionGPS && (
                        <Marker position={posicionGPS}>
                          <Popup>Tu ubicación actual</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </Box>
                ) : (
                  <Box sx={{
                    height: 450, border: '2px dashed #cbd5e1', borderRadius: 2, backgroundColor: '#f8fafc',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                  }}>
                    <LocationOn sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2">Cargando mapa inteligente...</Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#475569' }}>
                  Destinos Asignados
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>• {rutaData?.zona_asignada || 'Cargando zona...'}</Typography>
                    <Chip label={tracking ? "En Progreso" : "Pendiente"} size="small" sx={{ bgcolor: tracking ? '#eff6ff' : '#e2e8f0', color: tracking ? '#2563eb' : '#475569', fontSize: '0.7rem' }} />
                  </Box>
                </Box>

                <Box sx={{ mt: 2, bgcolor: '#ecfdf5', p: 1.5, borderRadius: 1, border: '1px solid #a7f3d0' }}>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700 }}>
                    Meta: Registrar los prospectos vinculados a esta jornada.
                  </Typography>
                </Box>
              </Box>
            </Grid>

          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: '#475569' }}>
            <HistoryOutlined fontSize="small" /> Historial de Rutas Tomadas
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Zona / Recorrido</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historialRutas.length > 0 ? (
                historialRutas.map((ruta) => (
                  <TableRow hover key={ruta.id}>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {ruta.fecha_creacion ? new Date(ruta.fecha_creacion).toLocaleDateString('es-MX') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {ruta.zona_asignada}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={ruta.estado || 'Finalizada'} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                    No hay rutas anteriores registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

    </Box>
  );
};

export default CanvaceadorRuta;