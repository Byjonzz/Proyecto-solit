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
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; 
import axios from 'axios';
import api from '../../services/api';

const createCustomIcon = (color) => new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});
const iconInicio = createCustomIcon('#10b981'); 
const iconDestino = createCustomIcon('#f43f5e'); 
const iconUbicacionGps = createCustomIcon('#3b82f6'); 

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
};

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, map.getZoom());
    }
  }, [map, center]);
  return null;
};

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
        const resCanv = await api.get(`/usuarios/${usuarioActual.perfil_id}/`);
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

  const [tracking, setTracking] = useState(() => {
    return localStorage.getItem('canvaceo_tracking') === 'true';
  });
  const [activeRouteId, setActiveRouteId] = useState(() => {
    const savedId = localStorage.getItem('canvaceo_activeRouteId');
    return savedId ? parseInt(savedId, 10) : null;
  });

  const [posicionGPS, setPosicionGPS] = useState(null);
  const [errorGPS, setErrorGPS] = useState('Buscando señal GPS...');

  const [todasLasRutas, setTodasLasRutas] = useState([]);
  const [puntosMapa, setPuntosMapa] = useState([]); 
  const [rutaRestante, setRutaRestante] = useState([]); 
  const [puntosOriginales, setPuntosOriginales] = useState([]);
  const [loadingRuta, setLoadingRuta] = useState(true);
  
  const watchIdRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const rutasPendientes = todasLasRutas.filter(r => r.estado !== 'Finalizada');
  const historialRutas = todasLasRutas.filter(r => r.estado === 'Finalizada');
  const rutaData = todasLasRutas.find(r => r.id === activeRouteId) || null;

  useEffect(() => {
    if (activeRouteId) {
      localStorage.setItem('canvaceo_activeRouteId', activeRouteId);
    } else {
      localStorage.removeItem('canvaceo_activeRouteId');
    }
    localStorage.setItem('canvaceo_tracking', tracking);
  }, [activeRouteId, tracking]);

  useEffect(() => {
    const consultarRutas = async () => {
      if (!usuarioActual?.perfil_id) {
        setLoadingRuta(false);
        return;
      }
      try {
        const respuesta = await api.get('rutas_canvaceadores/');
        if (respuesta.data && respuesta.data.length > 0) {
          const misRutas = respuesta.data.filter(
            (ruta) => ruta.canvaceador_id === usuarioActual.perfil_id || ruta.canvaceador === usuarioActual.perfil_id
          );
          setTodasLasRutas(misRutas);

          const pend = misRutas.filter(r => r.estado !== 'Finalizada');
          if (pend.length > 0) {
            setActiveRouteId(prevId => {
              if (prevId) return prevId; 
              return pend[0].id;
            });
          } else {
            if(!tracking) setActiveRouteId(null);
          }
        }
      } catch (error) {
        console.error("Error al traer rutas de la API:", error);
      } finally {
        setLoadingRuta(false);
      }
    };

    consultarRutas();
  }, [usuarioActual, refreshTrigger, tracking]);

  useEffect(() => {
    const trazarMapa = async () => {
      if (!rutaData || !rutaData.camino_trazado) {
        setPuntosOriginales([]);
        setPuntosMapa([]);
        setRutaRestante([]);
        return;
      }

      const coordString = rutaData.camino_trazado
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
          if (!isNaN(lat) && !isNaN(lng)) coordenadasProcesadas.push([lat, lng]);
        }
      });

      setPuntosOriginales(coordenadasProcesadas);

      if (coordenadasProcesadas.length >= 2) {
        try {
          const stringParaApi = coordenadasProcesadas.map(c => `${c[1]},${c[0]}`).join(';');
          let url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${stringParaApi}?overview=full&geometries=geojson`;
          
          let response = await fetch(url);
          if (!response.ok) {
            url = `https://router.project-osrm.org/route/v1/foot/${stringParaApi}?overview=full&geometries=geojson&continue_straight=false`;
            response = await fetch(url);
          }
          const data = await response.json();
          if (data && data.routes && data.routes.length > 0) {
            const rutaCalles = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setPuntosMapa(rutaCalles); 
            setRutaRestante(rutaCalles); 
          } else {
            setPuntosMapa(coordenadasProcesadas);
            setRutaRestante(coordenadasProcesadas);
          }
        } catch (e) {
          console.warn("No se pudo usar OSRM, usando línea recta:", e);
          setPuntosMapa(coordenadasProcesadas);
          setRutaRestante(coordenadasProcesadas);
        }
      } else {
        setPuntosMapa(coordenadasProcesadas);
        setRutaRestante(coordenadasProcesadas);
      }
    };
    if (todasLasRutas.length > 0) {
        trazarMapa();
    }
  }, [rutaData, todasLasRutas]);

  useEffect(() => {
    if (!tracking || !posicionGPS || puntosMapa.length < 2) {
      setRutaRestante(puntosMapa); 
      return;
    }

    try {
      const lineaCompleta = turf.lineString(puntosMapa.map(p => [p[1], p[0]]));
      const ptUsuario = turf.point([posicionGPS[1], posicionGPS[0]]);
      const ptDestino = turf.point([puntosMapa[puntosMapa.length - 1][1], puntosMapa[puntosMapa.length - 1][0]]);
      const ptAjustadoALinea = turf.nearestPointOnLine(lineaCompleta, ptUsuario);
      const lineaRecortada = turf.lineSlice(ptAjustadoALinea, ptDestino, lineaCompleta);
      const nuevasCoordenadas = lineaRecortada.geometry.coordinates.map(c => [c[1], c[0]]);
      setRutaRestante(nuevasCoordenadas);

    } catch (e) {
      console.warn("Error recortando la ruta en vivo:", e);
      setRutaRestante(puntosMapa); 
    }
  }, [posicionGPS, puntosMapa, tracking]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setPosicionGPS([position.coords.latitude, position.coords.longitude]);
          setErrorGPS('');
        },
        (error) => {
          console.error("Error GPS:", error);
          setErrorGPS('Error al obtener GPS. Asegúrate de dar permisos.');
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
          console.log(" [TELEMETRÍA ENVIADA 3s]");
        } catch (e) {
          console.error("Error al enviar ping de rastreo:", e);
        }
      }, 3000); 
    }
    return () => clearInterval(intervaloPing);
  }, [tracking, posicionGPS, rutaData]);

  const checarDistancia = (esPuntoInicial) => {
    if (!posicionGPS || puntosOriginales.length === 0) return false;

    const objetivoCoordenada = esPuntoInicial ? puntosOriginales[0] : puntosOriginales[puntosOriginales.length - 1];
    const vendedor = turf.point([posicionGPS[1], posicionGPS[0]]);
    const objetivo = turf.point([objetivoCoordenada[1], objetivoCoordenada[0]]);

    const metros = turf.distance(vendedor, objetivo) * 1000;
    return metros <= 10; 
  };

  const manejarRuta = async () => {
    if (puntosOriginales.length === 0 || !rutaData) {
      alert("⚠️ No hay ninguna ruta cargada o seleccionada.");
      return;
    }
    
    if (!tracking) {
      if (checarDistancia(true)) {
        try {
          await api.patch(`rutas_canvaceadores/${rutaData.id}/`, { estado: 'En Progreso' });
          setTracking(true);
          alert("🟢 Ruta Iniciada con éxito. Rastreo activo cada 3 segundos.");
          setRefreshTrigger(prev => prev + 1);
        } catch (e) {
          console.error("Error al iniciar ruta en API", e);
          alert("❌ Hubo un error de conexión con el servidor.");
        }
      } else {
        alert("❌ Error: Acércate al punto de inicio (menos de 10 metros) para comenzar.");
      }
    } else {
      if (checarDistancia(false)) {
        try {
          await api.patch(`rutas_canvaceadores/${rutaData.id}/`, { estado: 'Finalizada' });
          setTracking(false);
          setActiveRouteId(null); 
          localStorage.removeItem('canvaceo_activeRouteId'); 
          localStorage.removeItem('canvaceo_tracking');

          alert("✅ Recorrido finalizado exitosamente. Rastreo detenido.");
          setRefreshTrigger(prev => prev + 1); 
        } catch (e) {
          console.error("Error al finalizar la ruta", e);
          alert("❌ Hubo un error al guardar la finalización en el servidor.");
        }
      } else {
        alert("❌ Error: Aún no has llegado al punto de destino final (debes estar a menos de 5 metros).");
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', px: { xs: 1, md: 0 } }}>

      <BannerComisiones usuarioActual={usuarioActual} />

      {errorGPS && (
        <Alert severity="warning" sx={{ mb: 3 }}>{errorGPS}</Alert>
      )}

      {tracking && rutaData && (
        <Alert severity="info" sx={{ mb: 3, border: '1px solid #bfdbfe', animation: 'pulse 2s infinite' }}>
          📡 <strong>Rastreo Activo en Zona: {rutaData.zona_asignada}</strong> - Tu ubicación se envía cada 3 segundos. Puedes navegar a otras secciones, el rastreo continuará al regresar.
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4, width: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: 2, md: 3 }, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Mi Ruta de Canvaceo: {loadingRuta ? 'Cargando...' : (rutaData?.zona_asignada || 'Sin Zona')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tracking ? "Ruta en ejecución. Llega al destino para finalizar." : "Inicia tu jornada de campo para trazar la ruta del día."}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color={tracking ? "error" : "primary"}
            startIcon={tracking ? <Stop /> : <PlayArrow />}
            sx={{ fontWeight: 700, px: 3 }}
            onClick={manejarRuta}
            disabled={!!errorGPS || loadingRuta || !rutaData}
          >
            {tracking ? "TERMINAR RUTA" : "INICIAR RUTA DE HOY"}
          </Button>
        </Box>

        <CardContent sx={{ p: { xs: 1, md: 3 }, width: '100%', boxSizing: 'border-box' }}>
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%', m: 0 }}>

            <Grid item xs={12} md={8} sx={{ width: '100%', p: { xs: '0px !important', md: 'inherit' }, mb: { xs: 2, md: 0 } }}>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: { xs: 1, md: 2 }, width: '100%', boxSizing: 'border-box' }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 700, color: '#475569' }}>
                  <LocationOn color={tracking ? "error" : "primary"} fontSize="small" />
                  Mapa del Recorrido Asignado
                </Typography>

                {puntosMapa.length > 0 && (posicionGPS || puntosOriginales[0]) ? (
                  <Box sx={{ height: { xs: 350, md: 550 }, width: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    <MapContainer
                      center={posicionGPS || puntosOriginales[0]}
                      zoom={16}
                      style={{ height: '100%', width: '100%', zIndex: 1 }}
                    >
                      <MapResizer />
                      <MapController center={tracking ? null : puntosOriginales[0]} />
                      <TileLayer 
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        attribution='&copy; Google Maps'
                      />
                      <Polyline positions={puntosMapa} color="#94a3b8" weight={6} opacity={0.4} />
                      <Polyline positions={rutaRestante} color="#3b82f6" weight={6} opacity={0.9} />
                      <Marker position={puntosOriginales[0]} icon={iconInicio}>
                        <Popup>Punto de Inicio Asignado</Popup>
                      </Marker>

                      {puntosOriginales.length > 1 && (
                        <Marker position={puntosOriginales[puntosOriginales.length - 1]} icon={iconDestino}>
                          <Popup>Destino Final</Popup>
                        </Marker>
                      )}

                      {posicionGPS && (
                        <Marker position={posicionGPS} icon={iconUbicacionGps}>
                          <Popup>Tu ubicación actual</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </Box>
                ) : (
                  <Box sx={{
                    height: { xs: 350, md: 550 }, width: '100%', border: '2px dashed #cbd5e1', borderRadius: 2, backgroundColor: '#f8fafc',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 1
                  }}>
                    {loadingRuta ? <CircularProgress size={24} /> : <LocationOn sx={{ fontSize: 40, opacity: 0.5 }} />}
                    <Typography variant="body2">{loadingRuta ? "Cargando datos de ruta..." : "Selecciona una ruta para visualizar el mapa."}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={4} sx={{ width: '100%', p: { xs: '0px !important', md: 'inherit' } }}>
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, height: '100%', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#475569' }}>
                  Rutas Pendientes
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: { xs: 250, md: 450 }, overflowY: 'auto', pr: 1 }}>
                  {rutasPendientes.length > 0 ? (
                    rutasPendientes.map((ruta) => (
                      <Box 
                        key={ruta.id} 
                        onClick={() => {
                          if (!tracking) setActiveRouteId(ruta.id);
                          else if (activeRouteId !== ruta.id) alert("Hay una ruta en progreso. Finalízala antes de seleccionar otra.");
                        }}
                        sx={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, 
                          border: '1px solid', borderColor: activeRouteId === ruta.id ? '#3b82f6' : '#e2e8f0', 
                          backgroundColor: activeRouteId === ruta.id ? '#eff6ff' : 'transparent',
                          borderRadius: 2, cursor: tracking ? 'default' : 'pointer',
                          transition: '0.2s',
                          '&:hover': { backgroundColor: tracking ? (activeRouteId === ruta.id ? '#eff6ff' : 'transparent') : '#f8fafc' }
                        }}
                      >
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: activeRouteId === ruta.id ? '#1e40af' : '#1e293b' }}>• {ruta.zona_asignada}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(ruta.fecha_ruta).toLocaleDateString()}</Typography>
                        </Box>
                        <Chip 
                          label={activeRouteId === ruta.id && tracking ? "En Progreso" : (ruta.estado || 'Pendiente')} 
                          size="small" 
                          color={activeRouteId === ruta.id && tracking ? "info" : "default"}
                          sx={{ 
                            fontSize: '0.7rem', fontWeight: 600
                          }} 
                        />
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2, textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      <Typography variant="body2" color="text.secondary">No tienes rutas pendientes asignadas.</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mt: 2, bgcolor: '#f0f9ff', p: 1.5, borderRadius: 2, border: '1px solid #bae6fd' }}>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <InfoOutlined fontSize="inherit" />
                    {tracking ? "Rastreo activo. No cierres la sesión." : "Selecciona una ruta y acércate al inicio para comenzar."}
                  </Typography>
                </Box>
              </Box>
            </Grid>

          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, width: '100%', mb: 4 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryOutlined color="action" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#475569' }}>Historial de Rutas Finalizadas</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Zona</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Modo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historialRutas.length > 0 ? (
                historialRutas.map((ruta) => (
                  <TableRow hover key={ruta.id}>
                    <TableCell>{new Date(ruta.fecha_ruta).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{ruta.zona_asignada}</TableCell>
                    <TableCell><Chip label={ruta.modo_trazado} size="small" variant="outlined" sx={{fontSize: '0.65rem'}}/></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#94a3b8' }}>No hay rutas finalizadas recientemente.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </Box>
  );
};

export default CanvaceadorRuta;