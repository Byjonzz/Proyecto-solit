import React, { useState } from 'react';
import {
  Box, Stepper, Step, StepLabel, StepContent, Button, Paper,
  Typography, TextField, Radio, RadioGroup, FormControlLabel,
  FormControl, FormLabel, InputAdornment, IconButton, Tooltip,
  CircularProgress, Alert, Card, CardContent, Grid, Divider, Chip
} from '@mui/material';
import {
  MyLocation, ContentCopy, CheckCircle, WhatsApp,
  Download, Upload, Wifi, AccountCircle
} from '@mui/icons-material';

import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';

import { useProspectos } from '../../hooks/useProspectos';
import { usePlanes } from '../../hooks/usePlanes';

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
    return <Alert severity="info" sx={{ my: 2 }}>No hay planes disponibles. Por favor, crea planes en el módulo de Administración.</Alert>;
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
                <Grid size={{ xs: 12, sm: 4 }} key={plan.id}>
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

const NuevoProspect = ({ usuarioActual }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [skipped, setSkipped] = useState(new Set());
  const [metodoUbicacion, setMetodoUbicacion] = useState('manual');

  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  const [coordenadas, setCoordenadas] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [planInteres, setPlanInteres] = useState(null);
  const [errorApi, setErrorApi] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [erroresValidacion, setErroresValidacion] = useState({
    nombre: false, nombreMensaje: '',
    telefono: false, telefonoMensaje: ''
  });

  const { createProspecto } = useProspectos();
  const { planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV, planesHibridos, planesAntenaWireless, loading: loadingPlanes } = usePlanes();

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono_whatsapp: '',
    direccion_calle_numero: '',
    direccion_colonia: '',
    referencia_domicilio: '',
    notas_canvaceador: ''
  });

  // 🚀 LA NUEVA FUNCIÓN MÁGICA "DOBLE BUSCADOR" (TÉCNICOS Y CANVACEADORES)
  const obtenerIdYRolReal = async () => {
    let idFinal = null;
    let rolDetectado = null;

    const rolSesion = (usuarioActual?.rol || '').toLowerCase().trim();
    const idUsuarioLogueado = Number(usuarioActual?.id);
    const nombreCompleto = `${usuarioActual?.nombre || ''} ${usuarioActual?.apellido || ''}`.trim().toLowerCase();

    // 1. SI ES UN CANVACEADOR
    if (rolSesion === 'canvaceador') {
      rolDetectado = 'canvaceador';
      if (usuarioActual?.perfil_id) return { id: Number(usuarioActual.perfil_id), rol: rolDetectado };

      try {
        const resCanv = await api.get('/canvaceadores/');
        const match = resCanv.data.find(c => {
          const uId_1 = typeof c.usuario_id === 'object' ? c.usuario_id?.id : c.usuario_id;
          const numEmpleado = String(c.numero_empleado || '').toLowerCase().trim();
          return Number(uId_1) === idUsuarioLogueado || numEmpleado === nombreCompleto;
        });
        if (match) idFinal = match.id;
      } catch (error) { console.error("Error canvaceadores:", error); }
    } 
    
    // 2. SI ES UN TÉCNICO
    else if (rolSesion === 'tecnico') {
      rolDetectado = 'tecnico';
      if (usuarioActual?.perfil_id) return { id: Number(usuarioActual.perfil_id), rol: rolDetectado };

      try {
        const resTec = await api.get('/tecnicos/');
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

  const validarNombre = (valor) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(valor);
  const validarTelefono = (valor) => /^\d*$/.test(valor);

  const handleNombreChange = (valor) => {
    if (validarNombre(valor)) {
      setFormData({ ...formData, nombre_completo: valor });
      setErroresValidacion({ ...erroresValidacion, nombre: false, nombreMensaje: '' });
    } else {
      setErroresValidacion({ ...erroresValidacion, nombre: true, nombreMensaje: 'Solo letras' });
    }
  };

  const handleTelefonoChange = (valor) => {
    if (validarTelefono(valor)) {
      const valorLimpio = valor.slice(0, 10);
      setFormData({ ...formData, telefono_whatsapp: valorLimpio });
      if (valorLimpio.length > 0 && valorLimpio.length < 10) {
        setErroresValidacion({ ...erroresValidacion, telefono: true, telefonoMensaje: `Faltan ${10 - valorLimpio.length} dígitos` });
      } else {
        setErroresValidacion({ ...erroresValidacion, telefono: false, telefonoMensaje: '' });
      }
    } else {
      setErroresValidacion({ ...erroresValidacion, telefono: true, telefonoMensaje: 'Solo números' });
    }
  };

  const validarPaso = () => {
    if (activeStep === 0) {
      if (!formData.nombre_completo.trim()) {
        setErroresValidacion({ ...erroresValidacion, nombre: true, nombreMensaje: 'Requerido' });
        setErrorApi('El nombre es obligatorio');
        return false;
      }
      if (!formData.telefono_whatsapp.trim() || formData.telefono_whatsapp.length !== 10) {
        setErroresValidacion({ ...erroresValidacion, telefono: true, telefonoMensaje: 'Deben ser 10 dígitos' });
        setErrorApi('Teléfono a 10 dígitos obligatorio');
        return false;
      }
    }
    setErrorApi(null);
    return true;
  };

  const handleNext = async () => {
    if (!validarPaso()) return;
    if (activeStep === pasos.length - 1) {
      await guardarProspecto();
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
      // 🚀 AQUI USAMOS LA MAGIA DEL DOBLE BUSCADOR
      const { id: idRealEmpleado, rol: rolEmpleado } = await obtenerIdYRolReal();

      const datosParaBackend = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono_whatsapp: formData.telefono_whatsapp,
        metodo_ubicacion: metodoUbicacion,
        direccion_calle_numero: formData.direccion_calle_numero?.trim() || null,
        direccion_colonia: formData.direccion_colonia?.trim() || null,
        referencia_domicilio: formData.referencia_domicilio?.trim() || null,
        plan_interes: planInteres?.nombre || null,
        notas_canvaceador: formData.notas_canvaceador?.trim() || null,
        estado: 'Nuevo',
        
        // 🚀 Si es canvaceador se va a uno, si es técnico se va al otro
        canvaceador_id: rolEmpleado === 'canvaceador' ? idRealEmpleado : null,
        tecnico_id: rolEmpleado === 'tecnico' ? idRealEmpleado : null
      };

      if (coordenadas && coordenadas.includes(',')) {
        const partes = coordenadas.split(',');
        const lat = parseFloat(partes[0].trim());
        const lng = parseFloat(partes[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          datosParaBackend.ubicacion_gps = {
            type: "Point",
            coordinates: [lng, lat]
          };
        }
      }

      await createProspecto(datosParaBackend);
      setActiveStep((prev) => prev + 1);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errores = typeof err.response.data === 'object'
          ? Object.entries(err.response.data).map(([key, val]) => `${key}: ${val}`).join(' | ')
          : JSON.stringify(err.response.data);
        setErrorApi(`Backend rechazó los datos: ${errores}`);
      } else {
        setErrorApi(`Error al guardar: ${err.message}`);
      }
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
    setCoordenadas('');
    setMetodoUbicacion('manual');
    setPlanInteres(null);
    setErrorApi(null);
    setFormData({ nombre_completo: '', telefono_whatsapp: '', direccion_calle_numero: '', direccion_colonia: '', referencia_domicilio: '', notas_canvaceador: '' });
  };

  const consultarDireccionHumana = async (latitude, longitude) => {
    try {
      setLoadingGeocode(true);
      const response = await api.get('/reverse-geocode/', {
        params: { lat: latitude, lng: longitude }
      });

      if (response.data && response.data.direccion) {
        setFormData(prev => ({
          ...prev,
          direccion_calle_numero: response.data.direccion
        }));
      }
    } catch (error) {
      console.error("Error al traducir coordenadas:", error);
    } finally {
      setLoadingGeocode(false);
    }
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

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

            <TextField
              label="Nombre Completo del Prospecto *" fullWidth size="small" required
              value={formData.nombre_completo} onChange={(e) => handleNombreChange(e.target.value)}
              error={erroresValidacion.nombre} helperText={erroresValidacion.nombreMensaje || 'Solo letras'}
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

              {metodoUbicacion === 'manual' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Calle y Número" fullWidth size="small" value={formData.direccion_calle_numero} onChange={(e) => setFormData({ ...formData, direccion_calle_numero: e.target.value })} />
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
                    Haz clic en el mapa para soltar un marcador en la casa del cliente.
                  </Typography>

                  <Box sx={{ width: '100%', height: 300, borderRadius: 2, overflow: 'hidden', mb: 2, border: '1px solid #cbd5e1' }}>
                    <MapContainer
                      center={[18.4628, -97.3928]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      preferCanvas={true}
                    >
                      <TileLayer
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        attribution='&copy; Google Maps'
                      />
                      <ClicEnMapa alHacerClic={(lat, lng) => {
                        setCoordenadas(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        consultarDireccionHumana(lat, lng);
                      }} />

                      {coordenadas && (
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
            {loadingPlanes ? (<CircularProgress />) : (
              <SeleccionPlanesCanvaceo
                planSeleccionado={planInteres} onPlanSeleccionado={setPlanInteres}
                planesFibraSimetrica={planesFibraSimetrica} planesFibraAsimetrica={planesFibraAsimetrica}
                planesSolitTV={planesSolitTV} planesHibridos={planesHibridos} planesAntenaWireless={planesAntenaWireless}
              />
            )}
            <TextField label="Notas del Canvaceador" fullWidth size="small" multiline rows={3} sx={{ mt: 3 }} value={formData.notas_canvaceador} onChange={(e) => setFormData({ ...formData, notas_canvaceador: e.target.value })} />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            {errorApi && (<Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{errorApi}</Alert>)}
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Resumen del Prospecto:</strong>
              <ul>
                <li>Nombre: <strong>{formData.nombre_completo}</strong></li>
                <li>Teléfono: <strong>{formData.telefono_whatsapp}</strong></li>
                {formData.direccion_calle_numero && <li>Dirección: <strong>{formData.direccion_calle_numero}</strong></li>}
                {planInteres && <li>Plan: <strong>{planInteres.nombre}</strong></li>}
              </ul>
            </Alert>
          </Box>
        );
      default: return '';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 3 }}>
        Registrar Nuevo Prospecto
      </Typography>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {pasos.map((paso, index) => (
            <Step key={paso.label} completed={activeStep > index && !isStepSkipped(index)}>
              <StepLabel optional={isStepOptional(index) ? <Typography variant="caption" color="error">Opcional</Typography> : null}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{paso.label}</Typography>
              </StepLabel>
              <StepContent>
                {(() => {
                  switch (index) {
                    case 0:
                      return (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

                          <TextField
                            label="Nombre Completo del Prospecto *" fullWidth size="small" required
                            value={formData.nombre_completo} onChange={(e) => handleNombreChange(e.target.value)}
                            error={erroresValidacion.nombre} helperText={erroresValidacion.nombreMensaje || 'Solo letras'}
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

                            {metodoUbicacion === 'manual' && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField label="Calle y Número" fullWidth size="small" value={formData.direccion_calle_numero} onChange={(e) => setFormData({ ...formData, direccion_calle_numero: e.target.value })} />
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
                                  Haz clic en el mapa para soltar un marcador en la casa del cliente.
                                </Typography>

                                <Box sx={{ width: '100%', height: 300, borderRadius: 2, overflow: 'hidden', mb: 2, border: '1px solid #cbd5e1' }}>
                                  <MapContainer
                                    center={[18.4628, -97.3928]}
                                    zoom={14}
                                    style={{ height: '100%', width: '100%' }}
                                    preferCanvas={true}
                                  >
                                    <TileLayer
                                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                      attribution='&copy; Google Maps'
                                    />
                                    <ClicEnMapa alHacerClic={(lat, lng) => {
                                      setCoordenadas(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                                      consultarDireccionHumana(lat, lng);
                                    }} />

                                    {coordenadas && (
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
                          {loadingPlanes ? (<CircularProgress />) : (
                            <SeleccionPlanesCanvaceo
                              planSeleccionado={planInteres} onPlanSeleccionado={setPlanInteres}
                              planesFibraSimetrica={planesFibraSimetrica} planesFibraAsimetrica={planesFibraAsimetrica}
                              planesSolitTV={planesSolitTV} planesHibridos={planesHibridos} planesAntenaWireless={planesAntenaWireless}
                            />
                          )}
                          <TextField label="Notas del Canvaceador" fullWidth size="small" multiline rows={3} sx={{ mt: 3 }} value={formData.notas_canvaceador} onChange={(e) => setFormData({ ...formData, notas_canvaceador: e.target.value })} />
                        </Box>
                      );
                    case 3:
                      return (
                        <Box sx={{ mt: 2 }}>
                          {errorApi && (<Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{errorApi}</Alert>)}
                          <Alert severity="info" sx={{ mb: 2 }}>
                            <strong>Resumen del Prospecto:</strong>
                            <ul>
                              <li>Nombre: <strong>{formData.nombre_completo}</strong></li>
                              <li>Teléfono: <strong>{formData.telefono_whatsapp}</strong></li>
                              {formData.direccion_calle_numero && <li>Dirección: <strong>{formData.direccion_calle_numero}</strong></li>}
                              {planInteres && <li>Plan: <strong>{planInteres.nombre}</strong></li>}
                            </ul>
                          </Alert>
                        </Box>
                      );
                    default: return '';
                  }
                })()}

                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button variant="contained" onClick={handleNext} disabled={guardando} sx={{ mr: 1 }}>
                    {guardando ? 'Guardando...' : (index === pasos.length - 1 ? 'Finalizar Registro' : 'Continuar')}
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
            <Typography sx={{ mt: 1, mb: 3, color: '#15803d' }}>
              La información ha sido enviada a la base de datos.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button onClick={handleReset} variant="outlined" color="success">
                Registrar otro prospecto
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default NuevoProspect;