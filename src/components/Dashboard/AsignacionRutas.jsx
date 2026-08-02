import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, IconButton, Tooltip, Stack, Alert, InputAdornment, Divider,
  CircularProgress, Autocomplete
} from '@mui/material';
import {
  AddLocationAlt, SaveOutlined, LayersOutlined,
  DeleteOutlined, MyLocation, RouteOutlined, SearchOutlined,
  UndoOutlined, LocationOn
} from '@mui/icons-material';

import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../services/api';

const createCustomIcon = (color) => new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});
const iconInicio = createCustomIcon('#060707');
const iconPunto = createCustomIcon('#3b82f6');
const iconDestino = createCustomIcon('#f43f5e');

const API_RUTAS_URL = '/rutas_canvaceadores/';
const API_CANVACEADORES_URL = '/usuarios/?rol=Canvaceador';

const AsignacionRutas = () => {
  const [canvaceadorId, setCanvaceadorId] = useState('');

  const [inputValue, setInputValue] = useState('');
  const [coloniaSeleccionada, setColoniaSeleccionada] = useState(null);
  const [opcionesColonias, setOpcionesColonias] = useState([]);
  const [loading, setLoading] = useState(false);

  const [centroMapa, setCentroMapa] = useState([18.4628, -97.3928]);
  const [limiteColonia, setLimiteColonia] = useState(null);

  const [puntosRuta, setPuntosRuta] = useState([]);
  const [rutaTrazada, setRutaTrazada] = useState([]);

  const debounceTimerRef = useRef(null);

  const [googleCargado, setGoogleCargado] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  const [canvaceadoresDisponibles, setCanvaceadoresDisponibles] = useState([]);
  const [rutasAsignadas, setRutasAsignadas] = useState([]);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const responseCanvaceadores = await api.get(API_CANVACEADORES_URL);
      const canvaceadoresReales = responseCanvaceadores.data.map(canv => ({
        id: canv.id, 
        nombre: canv.nombre || canv.usuario || `Canvaceador #${canv.id}`,
        apellido: canv.apellido || '',
      }));
      setCanvaceadoresDisponibles(canvaceadoresReales);

      const responseRutas = await api.get(API_RUTAS_URL);
      const rutasFormateadas = responseRutas.data.map(ruta => {
        const canv = canvaceadoresReales.find(c => c.id === (ruta.canvaceador || ruta.canvaceador_id));
        let puntosMarcados = ruta.camino_trazado?.includes('LINESTRING') ? ruta.camino_trazado.split(',').length : 0;
        return {
          id: ruta.id,
          canvaceador: canv ? canv.nombre : `Desconocido`,
          zona: ruta.zona_asignada,
          puntosMarcados: puntosMarcados,
          estado: ruta.estado
        };
      });
      setRutasAsignadas(rutasFormateadas);
    } catch (error) {
      console.error('Error de conexión al cargar datos:', error);
    }
  };

  const iniciarGoogleMaps = async () => {
    if (window.google?.maps?.importLibrary || googleCargado || cargandoGoogle) return;
    setCargandoGoogle(true);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    (g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
      key: apiKey,
      v: "weekly"
    });

    try {
      await window.google.maps.importLibrary("places");
      await window.google.maps.importLibrary("geocoding");
      setGoogleCargado(true);
    } catch (error) {
      console.error("Error al cargar Google Maps:", error);
    } finally {
      setCargandoGoogle(false);
    }
  };

  const buscarColonia = async (query) => {
    if (!query || !window.google?.maps) return;
    setLoading(true);

    try {
      const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places");
      const request = {
        input: query,
        includedRegionCodes: ["MX"],
        locationBias: {
          center: { lat: 18.4628, lng: -97.3928 },
          radius: 15000
        }
      };

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (suggestions && suggestions.length > 0) {
        const lugaresEncontrados = suggestions
          .filter(s => s.placePrediction)
          .map(s => {
            const prediction = s.placePrediction;
            return {
              id: prediction.placeId,
              nombre: prediction.mainText.text,
              direccion: prediction.secondaryText ? prediction.secondaryText.text : prediction.text.text,
              placeId: prediction.placeId
            };
          });
        setOpcionesColonias(lugaresEncontrados);
      } else {
        setOpcionesColonias([]);
      }
    } catch (error) {
      setOpcionesColonias([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarColonia = async (event, placeSeleccionado) => {
    setColoniaSeleccionada(placeSeleccionado);
    if (!placeSeleccionado) {
      setLimiteColonia(null);
      return;
    }

    try {
      const { Geocoder } = await window.google.maps.importLibrary("geocoding");
      const geocoder = new Geocoder();

      geocoder.geocode({ placeId: placeSeleccionado.placeId }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const { location, viewport } = results[0].geometry;
          setCentroMapa([location.lat(), location.lng()]);

          if (viewport) {
            const ne = viewport.getNorthEast();
            const sw = viewport.getSouthWest();
            setLimiteColonia({
              type: 'Polygon',
              coordinates: [[
                [sw.lng(), sw.lat()],
                [ne.lng(), sw.lat()],
                [ne.lng(), ne.lat()],
                [sw.lng(), ne.lat()],
                [sw.lng(), sw.lat()]
              ]]
            });
          }
        }
      });
    } catch (error) {
      console.error("Error geocodificando la colonia:", error);
    }
  };

  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!newInputValue || newInputValue.length < 2) {
      setOpcionesColonias([]);
      return;
    }
    debounceTimerRef.current = setTimeout(() => buscarColonia(newInputValue), 700);
  };

  const fetchRoute = async (puntos) => {
    if (!Array.isArray(puntos) || puntos.length < 2) return;
    const coordenadasUrl = puntos.map(p => `${p.lng},${p.lat}`).join(';');
    let url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordenadasUrl}?overview=full&geometries=geojson`;

    try {
      let response = await fetch(url);
      if (!response.ok) {
        url = `https://router.project-osrm.org/route/v1/foot/${coordenadasUrl}?overview=full&geometries=geojson&continue_straight=false`;
        response = await fetch(url);
      }
      const data = await response.json();
      if (data && data.routes && data.routes.length > 0) {
        const coords = data.routes[0]?.geometry?.coordinates;
        if (coords && Array.isArray(coords)) {
          setRutaTrazada(coords.map(c => [c[1], c[0]]));
        }
      }
    } catch (error) {
      console.error('Error calculando ruta:', error);
    }
  };

  useEffect(() => {
    if (Array.isArray(puntosRuta) && puntosRuta.length >= 2) {
      fetchRoute(puntosRuta);
    } else {
      setRutaTrazada([]);
    }
  }, [puntosRuta]);

  const limpiarMapa = () => {
    setPuntosRuta([]);
    setRutaTrazada([]);
  };

  const deshacerUltimoPunto = () => {
    setPuntosRuta(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return [];
      const nuevosPuntos = [...prev];
      nuevosPuntos.pop();
      return nuevosPuntos;
    });
  };

  const handleGuardarRuta = async () => {
    const wktLineString = `LINESTRING(${puntosRuta.map(p => `${p.lng} ${p.lat}`).join(', ')})`;
    const payload = {
      zona_asignada: coloniaSeleccionada ? coloniaSeleccionada.nombre : (inputValue || 'Zona sin especificar'),
      modo_trazado: 'Peatonal',
      estado: 'En Progreso',
      camino_trazado: wktLineString,
      canvaceador_id: parseInt(canvaceadorId) 
    };

    try {
      await api.post(API_RUTAS_URL, payload);
      alert("✅ Ruta guardada y asignada correctamente."); 
      cargarDatosIniciales();
      setCanvaceadorId('');
      setInputValue('');
      setColoniaSeleccionada(null);
      setOpcionesColonias([]);
      setLimiteColonia(null);
      limpiarMapa();
    } catch (error) {
      if (error.response && error.response.data) {
         alert(`❌ Django rechazó la ruta por esto:\n${JSON.stringify(error.response.data, null, 2)}`);
         console.error("Error exacto del backend:", error.response.data);
      } else {
         alert(`❌ Error de conexión: ${error.message}`);
      }
    }
  };

  const MapCenterUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center && center.length === 2) map.flyTo(center, 15, { animate: true, duration: 1.5 });
    }, [center, map]);
    return null;
  };

  const FixMapSize = () => {
    const map = useMap();
    useEffect(() => {
      const timer = setTimeout(() => map.invalidateSize(), 400);
      return () => clearTimeout(timer);
    }, [map]);
    return null;
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (e.latlng) setPuntosRuta(prev => [...(Array.isArray(prev) ? prev : []), e.latlng]);
      }
    });
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', pb: 5 }}>

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouteOutlined color="primary" fontSize="large" /> Ruteo Inteligente de Equipo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Busca una colonia (el sistema buscará exclusivamente dentro de tu ciudad) y asigna la ruta peatonal.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5} lg={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AddLocationAlt color="primary" /> Configurar Ruta Diaria
              </Typography>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 1, display: 'block' }}>
                    1. Buscar Colonia
                  </Typography>
                  <Autocomplete
                    freeSolo
                    options={opcionesColonias}
                    filterOptions={(x) => x}
                    getOptionLabel={(option) => typeof option === 'string' ? option : option.nombre}
                    loading={loading}
                    value={coloniaSeleccionada}
                    onChange={handleSeleccionarColonia}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    disabled={cargandoGoogle}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={cargandoGoogle ? "Despertando motor..." : "Ej. Del Valle"}
                        fullWidth
                        size="small"
                        onFocus={iniciarGoogleMaps}
                        onPointerEnter={iniciarGoogleMaps}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loading || cargandoGoogle ? <CircularProgress color="inherit" size={20} sx={{ mr: 1 }} /> : null}
                              {params.InputProps?.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <Box key={key} component="li" {...optionProps} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                          <LocationOn sx={{ color: '#94a3b8', mr: 2, fontSize: 20 }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {option.nombre}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {option.direccion}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    noOptionsText={inputValue.length >= 2 ? "No se encontraron resultados" : "Escribe al menos 2 caracteres"}
                  />
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mb: 1, display: 'block' }}>
                    2. Seleccionar Responsable
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={canvaceadorId}
                    onChange={(e) => setCanvaceadorId(e.target.value)}
                  >
                    {canvaceadoresDisponibles.length === 0 ? (
                      <MenuItem disabled value="">Cargando canvaceadores...</MenuItem>
                    ) : (
                      canvaceadoresDisponibles.map((canv) => (
                        <MenuItem key={canv.id} value={canv.id}>{canv.nombre} {canv.apellido}</MenuItem>
                      ))
                    )}
                  </TextField>
                </Box>

                <Box sx={{
                  p: 1.5, border: '1px solid', borderColor: Array.isArray(puntosRuta) && puntosRuta.length > 0 ? '#bfdbfe' : '#e2e8f0',
                  borderRadius: 2, backgroundColor: Array.isArray(puntosRuta) && puntosRuta.length > 0 ? '#eff6ff' : '#f8fafc',
                  textAlign: 'center', transition: 'all 0.3s'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: Array.isArray(puntosRuta) && puntosRuta.length > 0 ? '#1d4ed8' : '#64748b' }}>
                    Destinos marcados en mapa: {Array.isArray(puntosRuta) ? puntosRuta.length : 0}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<SaveOutlined />}
                  disabled={!Array.isArray(puntosRuta) || puntosRuta.length < 2 || !canvaceadorId || !inputValue}
                  onClick={handleGuardarRuta}
                  sx={{ py: 1.5, fontWeight: 700, textTransform: 'none', fontSize: '1rem' }}
                >
                  Guardar y Asignar Ruta
                </Button>

                <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                  El motor calculará automáticamente el camino peatonal utilizando calles y accesos oficiales.
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7} lg={8}>
          <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>

            <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
                <MyLocation fontSize="small" color="primary" /> Lienzo de Trazado
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Deshacer último punto trazado">
                  <span>
                    <IconButton size="small" color="warning" onClick={deshacerUltimoPunto} disabled={!Array.isArray(puntosRuta) || puntosRuta.length === 0} sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)' }}>
                      <UndoOutlined fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Borrar toda la ruta">
                  <span>
                    <IconButton size="small" color="error" onClick={limpiarMapa} disabled={!Array.isArray(puntosRuta) || puntosRuta.length === 0} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)' }}>
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ width: 900, height: { xs: 400, md: 600 }, position: 'relative' }}>
              <MapContainer
                center={centroMapa}
                zoom={14}
                style={{ width: '100%', height: '100%', zIndex: 1, cursor: 'crosshair' }}
                scrollWheelZoom={true}
                preferCanvas={true}
              >
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution='&copy; Google Maps'
                />

                <MapCenterUpdater center={centroMapa} />
                <MapClickHandler />
                <FixMapSize />

                {limiteColonia && (
                  <GeoJSON
                    key={JSON.stringify(limiteColonia)}
                    data={limiteColonia}
                    style={{ color: '#8b5cf6', weight: 3, fillColor: '#8b5cf6', fillOpacity: 0.15 }}
                  />
                )}

                {Array.isArray(rutaTrazada) && rutaTrazada.length > 0 && (
                  <Polyline positions={rutaTrazada} color="#3b82f6" weight={6} opacity={0.8} />
                )}

                {Array.isArray(puntosRuta) && puntosRuta.map((pos, idx) => {
                  let iconToUse = iconPunto;
                  if (idx === 0) iconToUse = iconInicio;
                  if (idx === puntosRuta.length - 1 && puntosRuta.length > 1) iconToUse = iconDestino;
                  return <Marker key={idx} position={pos} icon={iconToUse} />;
                })}
              </MapContainer>

              {(!Array.isArray(puntosRuta) || puntosRuta.length === 0) && (
                <Box sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,255,255,0.95)', px: 3, py: 1.5, borderRadius: 3, pointerEvents: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', zIndex: 1000 }}>
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700, textAlign: 'center' }}>
                    Selecciona una colonia a la izquierda y da clics en el mapa para trazar
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ width: '100%' }}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, px: 3, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LayersOutlined color="secondary" fontSize="small" /> Historial de Rutas Activas
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', backgroundColor: '#fff' }}>Canvaceador Asignado</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', backgroundColor: '#fff' }}>Zona / Colonia</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', backgroundColor: '#fff' }}>Total de Puntos</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', backgroundColor: '#fff' }}>Estado Operativo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!Array.isArray(rutasAsignadas) || rutasAsignadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                        <Typography variant="body2">Aún no hay rutas registradas en el servidor.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rutasAsignadas.map((ruta) => (
                      <TableRow key={ruta.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem', bgcolor: '#e0e7ff', color: '#4338ca' }}>
                              {ruta.canvaceador.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {ruta.canvaceador}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#475569', fontSize: '0.9rem' }}>
                          {ruta.zona}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${ruta.puntosMarcados} Destinos`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, color: '#3b82f6', borderColor: '#bfdbfe' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={ruta.estado}
                            size="small"
                            color={ruta.estado === 'En Progreso' ? 'primary' : 'success'}
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

    </Box>
  );
};

export default AsignacionRutas;