import React, { useState, useEffect } from 'react';
import {
  Box, Stepper, Step, StepLabel, StepContent, Button, Paper,
  Typography, TextField, Radio, RadioGroup, FormControlLabel,
  FormControl, FormLabel, InputAdornment, IconButton, Tooltip,
  CircularProgress, Alert, Card, CardContent, Grid, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText
} from '@mui/material';
import {
  MyLocation, ContentCopy, CheckCircle, WhatsApp,
  Download, Upload, Wifi, CloudDone, WifiOff, Place, PersonPin,
  FactCheck, HelpOutlined
} from '@mui/icons-material';

import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

import { obtenerDireccion } from '../../services/geocodeService';
import { useProspectos } from '../../hooks/useProspectos';
import { usePlanes } from '../../hooks/usePlanes';
import {
  validarNombrePersona, validarTelefonoMx, validarDireccion, validarTextoLibre
} from '../../utils/validaciones';

const pasos = [
  { label: 'Información Básica del Prospecto', description: 'Registra los datos de contacto iniciales.' },
  { label: 'Captura de Ubicación', description: 'Selecciona cómo registrarás las coordenadas del domicilio.' },
  { label: 'Interés y Cotización', description: 'Define qué servicio o paquete le interesa.' },
  { label: 'Resumen y Cierre', description: 'Confirma los datos para enviarlos al sistema.' }
];

const ClicEnMapa = ({ alHacerClic }) => {
  useMapEvents({
    click: (e) => {
      alHacerClic(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};


const AjustarTamanoMapa = () => {
  const map = useMap();
  useEffect(() => {
    const timers = [150, 450, 800].map(ms => setTimeout(() => map.invalidateSize(), ms));
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
};

const TarjetaPlanCanvaceo = ({ plan, seleccionado, onSelect }) => {
  return (
    <Card onClick={() => onSelect(plan)} sx={{ position: 'relative', cursor: 'pointer', borderRadius: 3, overflow: 'hidden', border: seleccionado ? '3px solid #1976d2' : '2px solid #e0e0e0', transition: 'all 0.3s ease', transform: seleccionado ? 'scale(1.02)' : 'scale(1)', boxShadow: seleccionado ? '0 8px 25px rgba(25, 118, 210, 0.35)' : '0 4px 15px rgba(0,0,0,0.08)', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' } }}>
      {plan.destacado && (<Box sx={{ position: 'absolute', top: 8, right: -25, backgroundColor: '#ff9800', color: 'white', px: 3, py: 0.5, fontSize: '0.65rem', fontWeight: 700, transform: 'rotate(45deg)', zIndex: 2 }}>POPULAR</Box>)}
      <Box sx={{ background: plan.colorGradient, py: 1.5, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 900, letterSpacing: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{plan.nombre}</Typography>
      </Box>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>${plan.precio}</Typography>
          <Typography sx={{ color: '#d63384', fontSize: '0.75rem', fontWeight: 600 }}>mensual</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
          <Download sx={{ color: '#9c27b0', fontSize: 16 }} />
          <Typography variant="caption" sx={{ color: '#333' }}>Bajada: <strong>{plan.descarga || plan.velocidad}Mbps</strong></Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
          <Upload sx={{ color: '#9c27b0', fontSize: 16 }} />
          <Typography variant="caption" sx={{ color: '#333' }}>Subida: <strong>{plan.subida || plan.velocidad}Mbps</strong></Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
          <Wifi sx={{ color: '#d63384', fontSize: 16 }} />
          <Typography variant="caption" sx={{ color: '#333' }}>{plan.simetrica !== undefined ? <><strong style={{ color: plan.simetrica ? '#4CAF50' : '#ff9800' }}>{plan.simetrica ? 'Simétrica' : 'Asimétrica'}</strong></> : 'Wireless'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 14 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>IFT: {plan.ift || 'N/A'}</Typography>
        </Box>
        {seleccionado && <Chip label="✓ Seleccionado" color="success" size="small" sx={{ fontWeight: 700, width: '100%' }} />}
      </CardContent>
    </Card>
  );
};

const TablaPlanesCanvaceo = ({ planes, seleccionadoId, onSelect, titulo, colorPrincipal }) => {
  const color = colorPrincipal || '#26a69a';
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: `2px solid ${color}`, background: `linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)` }}>
      <Box sx={{ p: 2, textAlign: 'center', background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'white', letterSpacing: 1 }}>{titulo}</Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        {planes.map((plan) => (
          <Box key={plan.id} onClick={() => onSelect(plan)} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', mb: 0.5, borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer', border: seleccionadoId === plan.id ? '2px solid #1976d2' : '2px solid transparent', backgroundColor: seleccionadoId === plan.id ? '#e3f2fd' : 'white', transition: 'all 0.2s', '&:hover': { backgroundColor: '#e0f7fa', transform: 'scale(1.01)' } }}>
            <Typography sx={{ p: 1, textAlign: 'center', textDecoration: 'underline', fontWeight: 600, color: '#333', fontSize: '0.85rem' }}>{plan.nombre}</Typography>
            <Typography sx={{ p: 1, textAlign: 'center', fontWeight: 700, color: color, borderLeft: '2px solid #b2ebf2', fontSize: '0.9rem' }}>${plan.precio}/mes</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

const SeleccionPlanesCanvaceo = ({ planSeleccionado, onPlanSeleccionado, planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV, planesHibridos, planesAntenaWireless }) => {
  const [categoria, setCategoria] = useState('simetrica');
  const handleSeleccionar = (plan) => { onPlanSeleccionado(plan); };

  const categoriasDisponibles = [];

  if (planesFibraSimetrica.length > 0) categoriasDisponibles.push({ value: 'simetrica', label: 'Fibra Simétrica', planes: planesFibraSimetrica, esTabla: false });
  if (planesFibraAsimetrica.length > 0) categoriasDisponibles.push({ value: 'asimetrica', label: 'Fibra Asimétrica', planes: planesFibraAsimetrica, esTabla: false });
  if (planesSolitTV.length > 0) categoriasDisponibles.push({ value: 'solittv', label: 'Solit + TV', planes: planesSolitTV, esTabla: false });
  if (planesHibridos.length > 0) categoriasDisponibles.push({ value: 'hibrido', label: 'Híbrido', planes: planesHibridos, esTabla: true, color: '#26a69a' });
  if (planesAntenaWireless.length > 0) categoriasDisponibles.push({ value: 'wireless', label: 'Wireless', planes: planesAntenaWireless, esTabla: true, color: '#7c4dff' });

  React.useEffect(() => {
    if (categoriasDisponibles.length > 0 && !categoriasDisponibles.find(c => c.value === categoria)) {
      setCategoria(categoriasDisponibles[0].value);
    }
  }, [categoriasDisponibles]);

  if (categoriasDisponibles.length === 0) {
    return <Alert severity="info" sx={{ my: 2 }}>No hay planes disponibles en la memoria. Necesitas conexión para descargarlos la primera vez.</Alert>;
  }

  const categoriaActual = categoriasDisponibles.find(c => c.value === categoria);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>Selecciona el Paquete de Interés</Typography>
      <RadioGroup row value={categoria} onChange={(e) => setCategoria(e.target.value)} sx={{ mb: 2, '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 600 } }}>
        {categoriasDisponibles.map((cat) => (
          <FormControlLabel key={cat.value} value={cat.value} control={<Radio size="small" />} label={cat.label} />
        ))}
      </RadioGroup>

      {categoriaActual && (
        <Box>
          {categoriaActual.esTabla ? (
            <Box sx={{ maxWidth: 500 }}>
              <TablaPlanesCanvaceo planes={categoriaActual.planes} seleccionadoId={planSeleccionado?.id} onSelect={handleSeleccionar} titulo={categoriaActual.label.toUpperCase()} colorPrincipal={categoriaActual.color} />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {categoriaActual.planes.map((plan) => (
                <Grid item xs={12} sm={4} key={plan.id}>
                  <TarjetaPlanCanvaceo plan={plan} seleccionado={planSeleccionado?.id === plan.id} onSelect={handleSeleccionar} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {planSeleccionado && (
        <Paper sx={{ mt: 2, p: 1.5, backgroundColor: '#e8f5e9', borderRadius: 2, border: '2px solid #4CAF50', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', display: 'block' }}>Plan: {planSeleccionado.nombre}</Typography>
            <Typography variant="caption" sx={{ color: '#555' }}>${planSeleccionado.precio}/mes • {planSeleccionado.descarga || planSeleccionado.velocidad}Mbps</Typography>
          </Box>
          <Chip label="✓" color="success" size="small" sx={{ fontWeight: 700 }} />
        </Paper>
      )}
    </Box>
  );
};
const NuevoProspect = ({
  usuarioActual,
  enModal = false,
  ubicacionInicial = null,
  verificarCobertura = null,
  poligonoCobertura = null,
  onFinalizar = null
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());
  const [metodoUbicacion, setMetodoUbicacion] = useState(ubicacionInicial ? 'mapa' : 'manual');

  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  const [coordenadas, setCoordenadas] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [planInteres, setPlanInteres] = useState(null);
  const [errorApi, setErrorApi] = useState(null);
  const [guardando, setGuardando] = useState(false);


  const [dentroCobertura, setDentroCobertura] = useState(null);
  const [resultadoGuardado, setResultadoGuardado] = useState(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [alertaOffline, setAlertaOffline] = useState(null);

  // Diálogo de resumen y confirmación previo al guardado.
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  // Falla del servicio de mapas al traducir coordenadas.
  const [errorGeocode, setErrorGeocode] = useState(null);

  const [erroresValidacion, setErroresValidacion] = useState({
    nombre: false, nombreMensaje: '',
    telefono: false, telefonoMensaje: '',
    direccionMensaje: '',
    notasMensaje: ''
  });

  const { createProspecto } = useProspectos();
  const {
    planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV,
    planesHibridos, planesAntenaWireless, loading: loadingPlanesOriginal
  } = usePlanes();

  // CACHÉ LOCAL DE PLANES
  const [planesCache, setPlanesCache] = useState({
    simetrica: [], asimetrica: [], tv: [], hibridos: [], wireless: []
  });
  const [cargandoPlanes, setCargandoPlanes] = useState(true);

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono_whatsapp: '',
    direccion_calle_numero: '',
    direccion_colonia: '',
    referencia_domicilio: '',
    notas_canvaceador: ''
  });

  const estadoFinal =
    dentroCobertura === true ? 'Posible Cliente'
      : dentroCobertura === false ? 'Prospecto'
        : 'Nuevo';

  useEffect(() => {
    const cacheLocal = JSON.parse(localStorage.getItem('planes_canvaceo_offline'));
    const hayPlanesNuevos = planesFibraSimetrica.length > 0 || planesFibraAsimetrica.length > 0 || planesSolitTV.length > 0 || planesHibridos.length > 0 || planesAntenaWireless.length > 0;

    if (hayPlanesNuevos) {
      const objPlanes = {
        simetrica: planesFibraSimetrica,
        asimetrica: planesFibraAsimetrica,
        tv: planesSolitTV,
        hibridos: planesHibridos,
        wireless: planesAntenaWireless
      };
      localStorage.setItem('planes_canvaceo_offline', JSON.stringify(objPlanes));
      setPlanesCache(objPlanes);
      setCargandoPlanes(false);
    } else if (!isOnline && cacheLocal) {
      setPlanesCache(cacheLocal);
      setCargandoPlanes(false);
    } else if (!loadingPlanesOriginal) {
      setCargandoPlanes(false);
    }
  }, [planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV, planesHibridos, planesAntenaWireless, loadingPlanesOriginal, isOnline]);

  // MONITOR OFFLINE/ONLINE
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sincronizarPendientes();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    revisarPendientes();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (ubicacionInicial && ubicacionInicial.lat != null && ubicacionInicial.lng != null) {
      const { lat, lng } = ubicacionInicial;
      setCoordenadas(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      consultarDireccionHumana(lat, lng);
    }
  }, []);
  useEffect(() => {
    if (typeof verificarCobertura !== 'function' || !coordenadas.includes(',')) {
      setDentroCobertura(null);
      return;
    }
    const partes = coordenadas.split(',');
    const lat = parseFloat(partes[0].trim());
    const lng = parseFloat(partes[1].trim());
    if (isNaN(lat) || isNaN(lng)) {
      setDentroCobertura(null);
      return;
    }
    setDentroCobertura(verificarCobertura(lat, lng));
  }, [coordenadas, verificarCobertura]);

  const revisarPendientes = () => {
    const p = JSON.parse(localStorage.getItem('prospectos_offline')) || [];
    setPendientesOffline(p.length);
  };

  const sincronizarPendientes = async () => {
    const p = JSON.parse(localStorage.getItem('prospectos_offline')) || [];
    if (p.length === 0) return;

    let restantes = [...p];
    let enviados = 0;

    for (const item of p) {
      try {
        await api.post('/prospectos/', item);
        restantes = restantes.filter(x => x.id_local !== item.id_local);
        enviados++;
      } catch (error) {
        console.error("Error sincronizando prospecto:", error);
        break;
      }
    }

    localStorage.setItem('prospectos_offline', JSON.stringify(restantes));
    revisarPendientes();
    if (enviados > 0) {
      setAlertaOffline(`¡Se sincronizaron ${enviados} prospectos atrasados con el servidor!`);
      setTimeout(() => setAlertaOffline(null), 5000);
    }
  };

  const guardarOffline = (datos) => {
    const pActuales = JSON.parse(localStorage.getItem('prospectos_offline')) || [];
    const nuevo = { ...datos, id_local: Date.now() };
    pActuales.push(nuevo);
    localStorage.setItem('prospectos_offline', JSON.stringify(pActuales));
    revisarPendientes();
  };

  const obtenerIdYRolReal = async () => {
    let idFinal = null;
    let rolDetectado = null;

    const rolSesion = (usuarioActual?.rol || '').toLowerCase().trim();
    const idUsuarioLogueado = Number(usuarioActual?.id);
    const nombreCompleto = `${usuarioActual?.nombre || ''} ${usuarioActual?.apellido || ''}`.trim().toLowerCase();

    if (rolSesion === 'canvaceador') {
      rolDetectado = 'canvaceador';
      if (usuarioActual?.perfil_id) return { id: Number(usuarioActual.perfil_id), rol: rolDetectado };

      try {
        const resCanv = await api.get('/usuarios/?rol=Canvaceador');
        const match = resCanv.data.find(c => {
          const uId_1 = typeof c.usuario_id === 'object' ? c.usuario_id?.id : c.usuario_id;
          const numEmpleado = String(c.numero_empleado || '').toLowerCase().trim();
          return Number(uId_1) === idUsuarioLogueado || numEmpleado === nombreCompleto;
        });
        if (match) idFinal = match.id;
      } catch (error) { console.error("Error canvaceadores:", error); }
    }
    else if (rolSesion === 'tecnico') {
      rolDetectado = 'tecnico';
      if (usuarioActual?.perfil_id) return { id: Number(usuarioActual.perfil_id), rol: rolDetectado };

      try {
        const resTec = await api.get('/usuarios/?rol=Tecnico');
        const match = resTec.data.find(t => {
          const uId_1 = typeof t.usuario_id === 'object' ? t.usuario_id?.id : t.usuario_id;
          const numEmpleado = String(t.numero_empleado || '').toLowerCase().trim();
          return Number(uId_1) === idUsuarioLogueado || numEmpleado === nombreCompleto;
        });
        if (match) idFinal = match.id;
      } catch (error) { console.error("Error tecnicos:", error); }
    }

    return { id: idFinal, rol: rolDetectado };
  };

  const isStepOptional = (step) => step === 1;
  const isStepSkipped = (step) => skipped.has(step);

  const soloLetras = (valor) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]*$/.test(valor);

  const handleNombreChange = (valor) => {
    // Filtramos caracteres inválidos al teclear, pero la validación de fondo
    // (que sea un nombre y no relleno) se hace al intentar avanzar de paso.
    if (!soloLetras(valor)) {
      setErroresValidacion(prev => ({ ...prev, nombre: true, nombreMensaje: 'El nombre solo puede llevar letras' }));
      return;
    }
    setFormData(prev => ({ ...prev, nombre_completo: valor }));
    setErroresValidacion(prev => ({ ...prev, nombre: false, nombreMensaje: '' }));
  };

  const handleTelefonoChange = (valor) => {
    if (!/^\d*$/.test(valor)) {
      setErroresValidacion(prev => ({ ...prev, telefono: true, telefonoMensaje: 'El teléfono solo lleva números' }));
      return;
    }
    const valorLimpio = valor.slice(0, 10);
    setFormData(prev => ({ ...prev, telefono_whatsapp: valorLimpio }));
    setErroresValidacion(prev => ({ ...prev, telefono: false, telefonoMensaje: '' }));
  };

  /**
   * Valida el paso indicado y deja los errores en pantalla.
   *
   * Cada paso se valida al intentar salir de él, no al final: si el canvaceador
   * puso datos al azar en el paso 1, no tiene sentido enterarse hasta el paso 4.
   */
  const validarPaso = (paso) => {
    let errores = {};

    if (paso === 0) {
      const errNombre = validarNombrePersona(formData.nombre_completo);
      const errTelefono = validarTelefonoMx(formData.telefono_whatsapp);
      if (errNombre) errores.nombre = errNombre;
      if (errTelefono) errores.telefono = errTelefono;
    }

    if (paso === 1) {
      // La ubicación es opcional (el paso se puede saltar), pero si el
      // canvaceador escribió algo, tiene que ser información real.
      if (metodoUbicacion === 'manual') {
        const errCalle = validarDireccion(formData.direccion_calle_numero, {
          obligatorio: false, etiqueta: 'La calle y número'
        });
        const errColonia = validarTextoLibre(formData.direccion_colonia, { etiqueta: 'La colonia' });
        const errRef = validarTextoLibre(formData.referencia_domicilio, { etiqueta: 'La referencia' });
        if (errCalle) errores.direccion = errCalle;
        else if (errColonia) errores.direccion = errColonia;
        else if (errRef) errores.direccion = errRef;
      }
      if ((metodoUbicacion === 'gps' || metodoUbicacion === 'mapa') && !coordenadas.includes(',')) {
        errores.direccion = metodoUbicacion === 'gps'
          ? 'Toca "Obtener GPS" para capturar la ubicación, o cambia de método'
          : 'Toca el mapa para fijar el pin en la casa del cliente';
      }
    }

    if (paso === 2) {
      const errNotas = validarTextoLibre(formData.notas_canvaceador, { etiqueta: 'Las notas' });
      if (errNotas) errores.notas = errNotas;
    }

    setErroresValidacion(prev => ({
      ...prev,
      nombre: Boolean(errores.nombre), nombreMensaje: errores.nombre || '',
      telefono: Boolean(errores.telefono), telefonoMensaje: errores.telefono || '',
      direccionMensaje: errores.direccion || '',
      notasMensaje: errores.notas || ''
    }));

    const mensajes = Object.values(errores);
    setErrorApi(mensajes.length ? mensajes.join(' · ') : null);
    return mensajes.length === 0;
  };

  const handleNext = async () => {
    if (!validarPaso(activeStep)) return;

    // Último paso: no guardamos directo, primero mostramos el resumen para que
    // confirme. Guardar sin confirmación es lo que provoca registros basura.
    if (activeStep === pasos.length - 1) {
      setConfirmacionAbierta(true);
      return;
    }
    let newSkipped = skipped;
    if (isStepSkipped(activeStep)) {
      newSkipped = new Set(newSkipped.values());
      newSkipped.delete(activeStep);
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setSkipped(newSkipped);
  };

  const guardarProspecto = async () => {
    setGuardando(true);
    setErrorApi(null);
    try {
      const { id: idRealEmpleado, rol: rolEmpleado } = await obtenerIdYRolReal();

      let lat = null, lng = null;
      if (coordenadas && coordenadas.includes(',')) {
        const partes = coordenadas.split(',');
        lat = parseFloat(partes[0].trim());
        lng = parseFloat(partes[1].trim());
      }

      const datosParaBackend = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono_whatsapp: formData.telefono_whatsapp,
        metodo_ubicacion: metodoUbicacion,
        direccion_calle_numero: formData.direccion_calle_numero?.trim() || null,
        direccion_colonia: formData.direccion_colonia?.trim() || null,
        referencia_domicilio: formData.referencia_domicilio?.trim() || null,
        plan_interes: planInteres?.nombre || null,
        notas_canvaceador: formData.notas_canvaceador?.trim() || null,

        estado: estadoFinal,
        dentro_cobertura: dentroCobertura,

        fecha_captura_real: new Date().toISOString(),

        canvaceador_id: rolEmpleado === 'canvaceador' ? idRealEmpleado : null,
        tecnico_id: rolEmpleado === 'tecnico' ? idRealEmpleado : null
      };

      if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
        datosParaBackend.ubicacion_gps = {
          type: "Point",
          coordinates: [lng, lat]
        };
      }

      if (isOnline) {
        try {
          await createProspecto(datosParaBackend);
        } catch (err) {
          console.warn("Fallo API online, guardando offline", err);
          guardarOffline(datosParaBackend);
        }
      } else {
        guardarOffline(datosParaBackend);
      }

      setResultadoGuardado({
        lat, lng,
        estado: estadoFinal,
        nombre: formData.nombre_completo.trim(),
        dentroCobertura
      });

      setActiveStep((prev) => prev + 1);

    } catch (err) {
      console.error(err);
      setErrorApi(`Error crítico: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleBack = () => { setActiveStep((prev) => prev - 1); };

  const handleSkip = () => {
    if (!isStepOptional(activeStep)) throw new Error("Paso no opcional.");
    setActiveStep((prev) => prev + 1);
    setSkipped((prev) => new Set(prev.values()).add(activeStep));
  };

  const handleReset = () => {
    setActiveStep(0);
    setPlanInteres(null);
    setErrorApi(null);
    setDentroCobertura(null);
    setResultadoGuardado(null);
    setFormData({ nombre_completo: '', telefono_whatsapp: '', direccion_calle_numero: '', direccion_colonia: '', referencia_domicilio: '', notas_canvaceador: '' });

  
    if (ubicacionInicial && ubicacionInicial.lat != null && ubicacionInicial.lng != null) {
      setMetodoUbicacion('mapa');
      setCoordenadas(`${ubicacionInicial.lat.toFixed(6)}, ${ubicacionInicial.lng.toFixed(6)}`);
    } else {
      setMetodoUbicacion('manual');
      setCoordenadas('');
    }
  };

  const consultarDireccionHumana = async (latitude, longitude) => {
    if (!isOnline) {
      setFormData(prev => ({
        ...prev,
        direccion_calle_numero: `Ubicación GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (Modo Offline)`
      }));
      return;
    }

    setLoadingGeocode(true);
    setErrorGeocode(null);

    const { direccion, error } = await obtenerDireccion(latitude, longitude);
    setLoadingGeocode(false);

    if (direccion) {
      setFormData(prev => ({ ...prev, direccion_calle_numero: direccion }));
      return;
    }

    // Sin traducción avisamos en pantalla en vez de escribir las coordenadas
    // dentro del campo de dirección, que se leía como si esa fuera la calle.
    setErrorGeocode(error);
    console.warn('No se pudo traducir las coordenadas:', error);
  };

  const obtenerUbicacionGPS = () => {
    setLoadingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordenadas(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLoadingGps(false);
          consultarDireccionHumana(lat, lng);
        },
        (error) => { alert("Permite el acceso a la ubicación."); setLoadingGps(false); },
        { enableHighAccuracy: true }
      );
    } else { alert("Navegador no soportado."); setLoadingGps(false); }
  };

  const copiarLinkCliente = () => {
    navigator.clipboard.writeText("https://solitsystem.app/loc/req-98x7");
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  };

  const centroFormMapa = ubicacionInicial && ubicacionInicial.lat != null
    ? [ubicacionInicial.lat, ubicacionInicial.lng]
    : [18.4628, -97.3928];

  const BannerCobertura = () => {
    if (typeof verificarCobertura !== 'function') return null;
    if (dentroCobertura === null) {
      const hayCoordenadas = coordenadas.includes(',') &&
        !isNaN(parseFloat(coordenadas.split(',')[0]));

      return hayCoordenadas ? (
        <Alert severity="warning" icon={<Place />} sx={{ mb: 2 }}>
          <strong>No se pudo verificar la cobertura</strong> (la capa de zonas no cargó).
          El registro se guardará como <strong>NUEVO</strong> para clasificarlo después.
        </Alert>
      ) : (
        <Alert severity="info" icon={<Place />} sx={{ mb: 2 }}>
          Fija la ubicación del domicilio para clasificar automáticamente el registro.
        </Alert>
      );
    }
    return dentroCobertura ? (
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
        <strong>Dentro de la zona de cobertura.</strong> Se registrará como <strong>POSIBLE CLIENTE</strong>.
      </Alert>
    ) : (
      <Alert severity="warning" icon={<Place />} sx={{ mb: 2 }}>
        <strong>Fuera de la zona de cobertura.</strong> Se registrará como <strong>PROSPECTO</strong>.
      </Alert>
    );
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre Completo del Prospecto *" fullWidth size="small" required
              value={formData.nombre_completo} onChange={(e) => handleNombreChange(e.target.value)}
              error={erroresValidacion.nombre}
              helperText={erroresValidacion.nombreMensaje || 'Nombre(s), apellido paterno y materno'}
            />
            <TextField
              label="Teléfono (WhatsApp) *" fullWidth size="small" required
              value={formData.telefono_whatsapp} onChange={(e) => handleTelefonoChange(e.target.value)}
              error={erroresValidacion.telefono} helperText={erroresValidacion.telefonoMensaje || `${formData.telefono_whatsapp.length}/10 dígitos`}
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>Método de Registro de Domicilio</FormLabel>
              <RadioGroup value={metodoUbicacion} onChange={(e) => setMetodoUbicacion(e.target.value)}>
                <FormControlLabel value="manual" control={<Radio />} label="1. Dirección Manual" />
                <FormControlLabel value="gps" control={<Radio />} label="2. GPS en Tiempo Real" />
                <FormControlLabel value="mapa" control={<Radio />} label="3. Fijar Pin en el Mapa" />
                <FormControlLabel value="link" control={<Radio />} label="4. Link por WhatsApp" />
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>

              {erroresValidacion.direccionMensaje && (
                <Alert severity="error" sx={{ mb: 2 }}>{erroresValidacion.direccionMensaje}</Alert>
              )}

              {/* Se capturó el punto pero el servicio de mapas no dio la calle */}
              {errorGeocode && !loadingGeocode && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit" size="small"
                      onClick={() => {
                        const [la, ln] = coordenadas.split(',').map(v => parseFloat(v));
                        if (!isNaN(la) && !isNaN(ln)) consultarDireccionHumana(la, ln);
                      }}
                    >
                      Reintentar
                    </Button>
                  }
                >
                  <strong>No se pudo obtener la calle y número.</strong> {errorGeocode}
                  {' '}La ubicación sí quedó registrada.
                </Alert>
              )}

              {metodoUbicacion === 'manual' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Calle y Número" fullWidth size="small" error={Boolean(erroresValidacion.direccionMensaje)} value={formData.direccion_calle_numero} onChange={(e) => setFormData({ ...formData, direccion_calle_numero: e.target.value })} />
                  <TextField label="Colonia" fullWidth size="small" value={formData.direccion_colonia} onChange={(e) => setFormData({ ...formData, direccion_colonia: e.target.value })} />
                  <TextField label="Referencia" fullWidth size="small" multiline rows={2} value={formData.referencia_domicilio} onChange={(e) => setFormData({ ...formData, referencia_domicilio: e.target.value })} />
                </Box>
              )}

              {metodoUbicacion === 'gps' && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Button variant="contained" startIcon={loadingGps || loadingGeocode ? <CircularProgress size={20} color="inherit" /> : <MyLocation />} onClick={obtenerUbicacionGPS} disabled={loadingGps || loadingGeocode}>
                    {loadingGeocode ? 'Traduciendo Dirección...' : 'Obtener GPS'}
                  </Button>
                  {formData.direccion_calle_numero && !loadingGeocode && (
                    <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                      Ubicación detectada: <strong>{formData.direccion_calle_numero}</strong>
                    </Alert>
                  )}
                </Box>
              )}

              {metodoUbicacion === 'mapa' && (
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                    Haz clic en el mapa para soltar/mover el marcador en la casa del cliente.
                  </Typography>

                  <Box sx={{ width: '100%', height: 300, borderRadius: 2, overflow: 'hidden', mb: 2, border: '1px solid #cbd5e1' }}>
                    <MapContainer
                      center={centroFormMapa}
                      zoom={ubicacionInicial ? 17 : 14}
                      style={{ height: '100%', width: '100%' }}
                      preferCanvas={true}
                    >
                      <TileLayer
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        attribution='&copy; Google Maps'
                      />
                      <AjustarTamanoMapa />

                      {poligonoCobertura && (
                        <GeoJSON
                          data={poligonoCobertura}
                          style={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.25 }}
                        />
                      )}

                      <ClicEnMapa alHacerClic={(lat, lng) => {
                        setCoordenadas(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        consultarDireccionHumana(lat, lng);
                      }} />

                      {coordenadas && coordenadas.includes(',') && (
                        <CircleMarker
                          center={[parseFloat(coordenadas.split(',')[0]), parseFloat(coordenadas.split(',')[1])]}
                          radius={8}
                          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
                        />
                      )}
                    </MapContainer>
                  </Box>

                  {loadingGeocode && (
                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                      <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} /> Traduciendo coordenadas con Google...
                    </Alert>
                  )}

                  {formData.direccion_calle_numero && !loadingGeocode && coordenadas && (
                    <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
                      Pin fijado en: <strong>{formData.direccion_calle_numero}</strong>
                    </Alert>
                  )}
                </Box>
              )}

              {metodoUbicacion === 'link' && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>Genera un enlace para enviarlo al cliente.</Typography>
                  <TextField fullWidth size="small" value="https://solitsystem.app/loc/req-98x7" InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"> <Tooltip title={linkCopiado ? "¡Copiado!" : "Copiar"}> <IconButton onClick={copiarLinkCliente} color={linkCopiado ? "success" : "default"}> {linkCopiado ? <CheckCircle /> : <ContentCopy />} </IconButton> </Tooltip> </InputAdornment>), }} />
                  <Button variant="outlined" color="success" startIcon={<WhatsApp />} sx={{ mt: 2, textTransform: 'none' }}>Enviar por WhatsApp</Button>
                </Box>
              )}

            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            {cargandoPlanes ? (<CircularProgress />) : (
              <SeleccionPlanesCanvaceo
                planSeleccionado={planInteres} onPlanSeleccionado={setPlanInteres}
                planesFibraSimetrica={planesCache.simetrica}
                planesFibraAsimetrica={planesCache.asimetrica}
                planesSolitTV={planesCache.tv}
                planesHibridos={planesCache.hibridos}
                planesAntenaWireless={planesCache.wireless}
              />
            )}
            <TextField
              label="Notas del Canvaceador" fullWidth size="small" multiline rows={3} sx={{ mt: 3 }}
              value={formData.notas_canvaceador}
              onChange={(e) => setFormData({ ...formData, notas_canvaceador: e.target.value })}
              error={Boolean(erroresValidacion.notasMensaje)}
              helperText={erroresValidacion.notasMensaje || 'Opcional'}
            />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            {errorApi && (<Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{errorApi}</Alert>)}

            {/* Chip con la clasificación resultante */}
            {typeof verificarCobertura === 'function' && dentroCobertura !== null && (
              <Chip
                icon={dentroCobertura ? <CheckCircle /> : <Place />}
                label={dentroCobertura ? 'Se guardará como: POSIBLE CLIENTE' : 'Se guardará como: PROSPECTO'}
                color={dentroCobertura ? 'success' : 'warning'}
                sx={{ mb: 2, fontWeight: 700 }}
              />
            )}

            <Alert severity="info" icon={<FactCheck />}>
              Ya está todo listo. Al tocar <strong>Finalizar Registro</strong> verás el
              resumen para revisarlo antes de guardar.
            </Alert>
          </Box>
        );
      default: return '';
    }
  };

  return (
    <Box sx={{ maxWidth: enModal ? '100%' : 800, margin: enModal ? 0 : 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {!enModal && (
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Registrar Nuevo Prospecto
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, ml: enModal ? 'auto' : 0 }}>
          <Chip
            icon={isOnline ? <CloudDone /> : <WifiOff />}
            label={isOnline ? "En Línea" : "Sin Conexión"}
            color={isOnline ? "success" : "warning"}
            variant="outlined"
            size="small"
          />
          {pendientesOffline > 0 && (
            <Chip
              label={`${pendientesOffline} pendientes`}
              color="error"
              size="small"
              onClick={isOnline ? sincronizarPendientes : null}
            />
          )}
        </Box>
      </Box>

      {alertaOffline && <Alert severity="success" sx={{ mb: 2 }}>{alertaOffline}</Alert>}

      <Paper variant={enModal ? 'elevation' : 'outlined'} elevation={enModal ? 0 : undefined} sx={{ p: enModal ? 0 : 4, borderRadius: 3, boxShadow: enModal ? 'none' : undefined }}>

        {activeStep < pasos.length && <BannerCobertura />}

        <Stepper activeStep={activeStep} orientation="vertical">
          {pasos.map((paso, index) => (
            <Step key={paso.label} completed={activeStep > index && !isStepSkipped(index)}>
              <StepLabel optional={isStepOptional(index) ? <Typography variant="caption" color="error">Opcional</Typography> : null}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{paso.label}</Typography>
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}

                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button variant="contained" onClick={handleNext} disabled={guardando} color={isOnline ? "primary" : "warning"} sx={{ mr: 1 }}>
                    {guardando ? 'Guardando...' : (index === pasos.length - 1 ? (isOnline ? 'Finalizar Registro' : 'Guardar Localmente') : 'Continuar')}
                  </Button>
                  {isStepOptional(index) && <Button color="inherit" onClick={handleSkip} sx={{ mr: 1 }}>Saltar</Button>}
                  <Button disabled={index === 0 || guardando} onClick={handleBack} sx={{ mr: 1 }}>Atrás</Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === pasos.length && (
          <Paper square elevation={0} sx={{ p: 3, textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: 2, mt: 2 }}>
            <CheckCircle sx={{ fontSize: 60, color: '#22c55e', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#166534', fontWeight: 600 }}>
              ¡Prospecto guardado con éxito!
            </Typography>

            {resultadoGuardado && (
              <Chip
                icon={resultadoGuardado.dentroCobertura ? <CheckCircle /> : <PersonPin />}
                label={`Registrado como: ${resultadoGuardado.estado}`}
                color={resultadoGuardado.dentroCobertura ? 'success' : 'warning'}
                sx={{ mt: 1, fontWeight: 700 }}
              />
            )}

            <Typography sx={{ mt: 1, mb: 3, color: '#15803d' }}>
              {isOnline ? 'La información ha sido enviada a la base de datos.' : 'Guardado en el teléfono. Se enviará automáticamente cuando recuperes la señal.'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button onClick={handleReset} variant="outlined" color="success">
                Registrar otro prospecto
              </Button>
              {enModal && (
                <Button
                  onClick={() => onFinalizar && onFinalizar(resultadoGuardado)}
                  variant="contained"
                  color="primary"
                >
                  Cerrar y ver en el mapa
                </Button>
              )}
            </Box>
          </Paper>
        )}
      </Paper>

      {/* Resumen y confirmación antes de guardar */}
      <Dialog
        open={confirmacionAbierta}
        onClose={() => !guardando && setConfirmacionAbierta(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <HelpOutlined color="primary" />
          ¿Guardar este prospecto?
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Revisa que los datos sean correctos antes de guardar.
          </Typography>

          <List dense disablePadding>
            <ListItem disableGutters divider>
              <ListItemText primary="Nombre" secondary={formData.nombre_completo || '—'}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText primary="Teléfono (WhatsApp)" secondary={formData.telefono_whatsapp || '—'}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText
                primary="Domicilio"
                secondary={
                  [formData.direccion_calle_numero, formData.direccion_colonia]
                    .filter(Boolean).join(', ') || 'Sin registrar'
                }
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }}
              />
            </ListItem>
            {coordenadas.includes(',') && (
              <ListItem disableGutters divider>
                <ListItemText primary="Coordenadas" secondary={coordenadas}
                  secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
              </ListItem>
            )}
            <ListItem disableGutters divider>
              <ListItemText primary="Plan de interés" secondary={planInteres?.nombre || 'Sin definir'}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            {formData.notas_canvaceador && (
              <ListItem disableGutters divider>
                <ListItemText primary="Notas" secondary={formData.notas_canvaceador} />
              </ListItem>
            )}
          </List>

          <Alert
            severity={dentroCobertura === true ? 'success' : dentroCobertura === false ? 'warning' : 'info'}
            sx={{ mt: 2 }}
          >
            Se registrará como <strong>{estadoFinal}</strong>
            {dentroCobertura === true && ' (dentro de la zona de cobertura)'}
            {dentroCobertura === false && ' (fuera de la zona de cobertura)'}
          </Alert>

          {!isOnline && (
            <Alert severity="warning" icon={<WifiOff />} sx={{ mt: 1 }}>
              Sin conexión: se guardará en el teléfono y se enviará al recuperar señal.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmacionAbierta(false)} disabled={guardando} color="inherit">
            Revisar de nuevo
          </Button>
          <Button
            variant="contained"
            color={isOnline ? 'primary' : 'warning'}
            disabled={guardando}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            onClick={async () => {
              await guardarProspecto();
              setConfirmacionAbierta(false);
            }}
          >
            {guardando ? 'Guardando...' : 'Sí, guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NuevoProspect;