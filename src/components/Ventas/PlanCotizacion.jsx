import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SeleccionPlanes from '../Forms/SeleccionPlanes';
import { useContratos } from '../../hooks/useContratos';
import api from '../../services/api';

import {
  Box, Paper, Typography, TextField, Button, MenuItem,
  Alert, Stack, Stepper, Step, StepLabel, StepContent, Divider,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  CircularProgress, InputAdornment, Tooltip, IconButton, Chip,
  Checkbox, Card, CardContent
} from '@mui/material';
import {
  BorderColor, Save, CheckCircle, AddPhotoAlternate, InfoOutlined,
  MyLocation, ContentCopy, WhatsApp, PinDrop, LocalOffer, SimCard,
  Receipt, Home 
} from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const pasosContrato = [
  { label: 'Datos Personales y Contacto', description: 'INE, teléfonos y correo (Obligatorios).' },
  { label: 'Ubicación y Plan', description: 'Dirección, referencias y paquete comercial.' },
  { label: 'Evidencias y Cierre', description: 'Fotos del INE, Recibo, Fachada y Firma.' } 
];

const ClicEnMapa = ({ alHacerClic }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      alHacerClic(lat, lng);
    },
  });
  return null;
};

const PlanCotizacion = ({ usuarioActual }) => {
  const location = useLocation();
  const { createContrato, loading: loadingContrato } = useContratos();

  const [activeStep, setActiveStep] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState(false);
  const [errorPlan, setErrorPlan] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const [activarChip, setActivarChip] = useState(false);

  const [formData, setFormData] = useState({
    ine: '',
    nombre: '',
    telefono1: '',
    telefono2: '',
    correo: '',
    plan: null,
    calleNumero: '',
    lat: '',
    lng: '',
    referencias: '',
    detallesCasa: ''
  });

  const [metodoUbicacion, setMetodoUbicacion] = useState('manual');
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [coordenadas, setCoordenadas] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [mapPin, setMapPin] = useState(null);
  const [fotoFrenteINE, setFotoFrenteINE] = useState(null);
  const [fotoReversoINE, setFotoReversoINE] = useState(null);
  const [fotoReciboLuz, setFotoReciboLuz] = useState(null);
  const [fotoFachada, setFotoFachada] = useState(null);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (location.state && location.state.datosDesdeProspecto) {
      const prospecto = location.state.datosDesdeProspecto;
      setFormData(prev => ({
        ...prev,
        nombre: prospecto.nombre || '',
        telefono1: prospecto.telefono1 || '',
        calleNumero: prospecto.calleNumero || '',
        referencias: prospecto.referencias || '',
        plan: prospecto.plan || null
      }));

      if (prospecto.coordenadasGPS) {
        setMetodoUbicacion('gps');
        setCoordenadas(prospecto.coordenadasGPS);
      } else if (prospecto.calleNumero) {
        setMetodoUbicacion('manual');
      }
    }
  }, [location.state]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
          calleNumero: response.data.direccion,
          lat: latitude.toString(),
          lng: longitude.toString()
        }));
      }
    } catch (error) {
      console.error("Error al traducir coordenadas en el backend:", error);
    } finally {
      setLoadingGeocode(false);
    }
  };

  const obtenerUbicacionGPS = () => {
    setLoadingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordenadas(`${position.coords.latitude}, ${position.coords.longitude}`);
          setLoadingGps(false);
          consultarDireccionHumana(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          alert("Por favor, permite el acceso a la ubicación en tu navegador.");
          setLoadingGps(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
      setLoadingGps(false);
    }
  };

  const copiarLinkCliente = () => {
    navigator.clipboard.writeText("https://solitsystem.app/loc/req-98x7");
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  };

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const simLat = (18.4628 - (y * 0.0005)).toFixed(6);
    const simLng = (-97.3928 + (x * 0.0005)).toFixed(6);
    setMapPin({ x, y });
    setCoordenadas(`${simLat}, ${simLng}`);
    consultarDireccionHumana(simLat, simLng);
  };

  const handleSeleccionarPlan = (plan) => {
    setFormData({ ...formData, plan: plan });
    setErrorPlan(false);
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!formData.plan) {
        setErrorPlan(true);
        return;
      }
      if (metodoUbicacion === 'manual' && !formData.calleNumero.trim()) {
        setErrorDireccion(true);
        return;
      }
    }
    setErrorDireccion(false);
    setErrorPlan(false);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleImageUpload = (e, setPhotoState) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoState(reader.result); 
      };
      reader.onerror = () => {
        alert('Error al leer la imagen. Intenta de nuevo.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorApi(null);

    if (!formData.ine || formData.ine.length !== 16) {
      setErrorApi('El INE debe tener exactamente 16 dígitos');
      return;
    }
    if (!formData.nombre.trim()) {
      setErrorApi('El nombre completo es obligatorio');
      return;
    }
    if (formData.telefono1.length !== 10) {
      setErrorApi('El teléfono 1 debe tener exactamente 10 dígitos');
      return;
    }
    if (formData.telefono2 && formData.telefono2.length !== 10) {
      setErrorApi('El teléfono 2 debe tener exactamente 10 dígitos');
      return;
    }
    if (!formData.correo.trim()) {
      setErrorApi('El correo electrónico es obligatorio');
      return;
    }
    if (!formData.plan) {
      setErrorApi('Debes seleccionar un plan');
      return;
    }
    if (metodoUbicacion === 'manual' && !formData.calleNumero.trim()) {
      setErrorApi('La dirección es requerida');
      setErrorDireccion(true);
      setActiveStep(1);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setErrorApi('Error al obtener la firma');
      return;
    }
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isCanvasBlank = !imageData.data.some(channel => channel !== 0);
    if (isCanvasBlank) {
      setErrorApi('Por favor firma el contrato antes de continuar');
      return;
    }

    setGuardado(true);

    try {
      const firmaDigital = canvas.toDataURL('image/jpeg', 0.5);

      let calleNumeroFinal = '';
      if (metodoUbicacion === 'manual') {
        calleNumeroFinal = formData.calleNumero.trim();
      } else if (metodoUbicacion === 'gps' || metodoUbicacion === 'mapa') {
        calleNumeroFinal = formData.calleNumero.trim() !== '' 
          ? formData.calleNumero.trim() 
          : `Ubicación por ${metodoUbicacion}: ${coordenadas}`;
      } else if (metodoUbicacion === 'link') {
        calleNumeroFinal = 'Ubicación enviada por link de WhatsApp';
      }

      const costoChip = activarChip ? 80 : 0;
      const montoPrimerMes = Number(formData.plan.precio) || 0;
      const montoTotal = montoPrimerMes + costoChip;

      const datosContrato = {
        ine_cliente: formData.ine,
        nombre_completo: formData.nombre.trim(),
        telefono1: formData.telefono1,
        telefono2: formData.telefono2 || '',
        correo: formData.correo.trim(),
        metodo_ubicacion: metodoUbicacion,
        calle_numero: calleNumeroFinal,
        referencias: formData.referencias || '',
        detalles_fachada: formData.detallesCasa || '',
        plan_contratado: formData.plan.nombre,
        monto_instalacion: 0,
        monto_primer_mes: montoPrimerMes,
        monto_total: montoTotal,
        extra_chip: activarChip,
        costo_chip: costoChip,
        firma_digital: firmaDigital,
        estatus: 'Pendiente Asignar',
        
        foto_ine_frente: fotoFrenteINE || '',
        foto_ine_reverso: fotoReversoINE || '',
        foto_recibo_luz: fotoReciboLuz || '',
        foto_fachada: fotoFachada || '',
        foto_poste: ''
      };

      datosContrato.canvaceador_id = null;
      datosContrato.tecnico_id = null;

      if (usuarioActual && typeof usuarioActual === 'object') {
        const idEmpleado = Number(usuarioActual.perfil_id || usuarioActual.id);
        const rolEmpleado = String(usuarioActual.rol || '').toLowerCase().trim();

        if (rolEmpleado === 'canvaceador') {
          datosContrato.canvaceador_id = idEmpleado;
        } else if (rolEmpleado === 'tecnico') {
          datosContrato.tecnico_id = idEmpleado;
        }
      }

      if (coordenadas && coordenadas.includes(',')) {
        const partes = coordenadas.split(',');
        const lat = parseFloat(partes[0].trim());
        const lng = parseFloat(partes[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          datosContrato.coordenadas_gps = `POINT(${lng} ${lat})`;
        }
      }

      await createContrato(datosContrato);

      setTimeout(() => {
        setGuardado(false);
        setActiveStep(0);
        setFormData({
          ine: '', nombre: '', telefono1: '', telefono2: '',
          correo: '', plan: null, calleNumero: '',
          referencias: '', detallesCasa: ''
        });
        setCoordenadas('');
        setMetodoUbicacion('manual');
        setActivarChip(false);
        limpiarFirma();
        
        setFotoFrenteINE(null);
        setFotoReversoINE(null);
        setFotoReciboLuz(null);
        setFotoFachada(null);
      }, 3000);

    } catch (err) {
      if (err.response && err.response.data) {
        const errores = Object.entries(err.response.data)
          .map(([campo, mensajes]) => {
            const msg = Array.isArray(mensajes) ? mensajes.join(', ') : String(mensajes);
            return `• ${campo}: ${msg}`;
          })
          .join('\n');
        setErrorApi(`Error de validación:\n${errores}`);
      } else {
        setErrorApi(`Error al guardar el contrato: ${err.message}`);
      }
      setGuardado(false);
    }
  };

  const calcularTotales = () => {
    if (!formData.plan) return { instalacion: 0, primerMes: 0, chip: 0, total: 0 };
    const primerMes = formData.plan.precio || 0;
    const instalacion = 0;
    const chip = activarChip ? 80 : 0;
    const total = instalacion + primerMes + chip;
    return { instalacion, primerMes, chip, total };
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="ID del INE (16 dígitos) *"
              required
              fullWidth
              size="small"
              slotProps={{ input: { maxLength: 16 } }}
              value={formData.ine}
              onChange={(e) => setFormData({ ...formData, ine: e.target.value.replace(/\D/g, '').slice(0, 16) })}
            />
            <TextField
              label="Nombre Completo *"
              required
              fullWidth
              size="small"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <TextField
              label="Teléfono 1 *"
              required
              fullWidth
              size="small"
              inputProps={{ maxLength: 10 }}
              value={formData.telefono1}
              onChange={(e) => setFormData({
                ...formData,
                telefono1: e.target.value.replace(/\D/g, '').slice(0, 10)
              })}
            />
            <TextField
              label="Teléfono 2"
              fullWidth
              size="small"
              inputProps={{ maxLength: 10 }}
              value={formData.telefono2}
              onChange={(e) => setFormData({
                ...formData,
                telefono2: e.target.value.replace(/\D/g, '').slice(0, 10)
              })}
            />
            <TextField
              label="Correo Electrónico *"
              type="email"
              required
              fullWidth
              size="small"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer color="primary" /> Selecciona el Paquete *
              </Typography>
              <SeleccionPlanes planSeleccionado={formData.plan} onPlanSeleccionado={handleSeleccionarPlan} />
              {errorPlan && (<Alert severity="error" sx={{ mt: 2 }}>Debes seleccionar un paquete comercial.</Alert>)}
            </Box>
            <Divider sx={{ my: 2 }} />
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>Método de Ubicación *</FormLabel>
              <RadioGroup value={metodoUbicacion} onChange={(e) => setMetodoUbicacion(e.target.value)}>
                <FormControlLabel value="manual" control={<Radio />} label="1. Dirección Manual" />
                <FormControlLabel value="gps" control={<Radio />} label="2. GPS en Tiempo Real" />
                <FormControlLabel value="link" control={<Radio />} label="3. Link por WhatsApp" />
                <FormControlLabel value="mapa" control={<Radio />} label="4. Fijar Pin en el Mapa" />
              </RadioGroup>
            </FormControl>
            <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              {metodoUbicacion === 'manual' && (
                <TextField
                  label="Dirección (Calle y Número)"
                  required
                  error={errorDireccion}
                  helperText={errorDireccion ? "Requerido" : "Se llenará solo si usas GPS o Mapa"}
                  fullWidth
                  size="small"
                  value={formData.calleNumero}
                  onChange={(e) => setFormData({ ...formData, calleNumero: e.target.value })}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: loadingGeocode && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    )
                  }}
                />
              )}
              {metodoUbicacion === 'gps' && (
                <Box sx={{ textAlign: 'center', py: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={loadingGps || loadingGeocode ? <CircularProgress size={20} color="inherit" /> : <MyLocation />}
                    onClick={obtenerUbicacionGPS}
                    disabled={loadingGps || loadingGeocode}
                    sx={{ mb: 2 }}
                  >
                    {loadingGps ? 'Calculando GPS...' : loadingGeocode ? 'Traduciendo dirección...' : 'OBTENER UBICACIÓN'}
                  </Button>

                  {formData.calleNumero && !loadingGeocode && metodoUbicacion === 'gps' && (
                    <Alert severity="success" icon={<CheckCircle />}>
                      Dirección detectada: <strong>{formData.calleNumero}</strong>
                    </Alert>
                  )}
                </Box>
              )}
              {metodoUbicacion === 'link' && (
                <Box sx={{ textAlign: 'center', py: 2, mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>Envía este link al cliente.</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value="https://solitsystem.app/loc/req-98x7"
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title={linkCopiado ? "¡Copiado!" : "Copiar"}>
                            <IconButton onClick={copiarLinkCliente} color={linkCopiado ? "success" : "default"}>
                              {linkCopiado ? <CheckCircle /> : <ContentCopy />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Button variant="outlined" color="success" startIcon={<WhatsApp />} sx={{ mt: 2 }}>Enviar por WhatsApp</Button>
                </Box>
              )}
              {metodoUbicacion === 'mapa' && (
                <Box sx={{ textAlign: 'center', py: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                    Haz clic en el mapa para soltar un marcador de ubicación.
                  </Typography>

                  <Box sx={{ width: '100%', height: 300, borderRadius: 2, overflow: 'hidden', mb: 2, border: '1px solid #cbd5e1' }}>
                    <MapContainer
                      center={[18.4628, -97.3928]}
                      zoom={14}
                      zoomControl={true}
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

                      {formData.lat && formData.lng && (
                        <CircleMarker
                          center={[parseFloat(formData.lat), parseFloat(formData.lng)]}
                          radius={8}
                          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
                        />
                      )}
                    </MapContainer>
                  </Box>

                  {loadingGeocode && (
                    <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                      <CircularProgress size={16} sx={{ mr: 1, verticalAlign: 'middle' }} />
                    </Alert>
                  )}

                  {formData.calleNumero && !loadingGeocode && formData.lat && (
                    <Alert severity="success" sx={{ mt: 2, textAlign: 'left' }}>
                      Pin fijado en: <strong>{formData.calleNumero}</strong>
                    </Alert>
                  )}
                </Box>
              )}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#334155' }}>Detalles Adicionales</Typography>
              <Stack spacing={3}>
                <TextField
                  label="Referencias"
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                  value={formData.referencias}
                  onChange={(e) => setFormData({ ...formData, referencias: e.target.value })}
                />
                <TextField
                  label="Detalles de Fachada"
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                  value={formData.detallesCasa}
                  onChange={(e) => setFormData({ ...formData, detallesCasa: e.target.value })}
                />
              </Stack>
            </Box>
          </Stack>
        );
      case 2:
        const totales = calcularTotales();
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Evidencias Fotográficas</Typography>
            
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: '#475569' }}>
              Documento de Identidad
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <Button 
                variant={fotoFrenteINE ? "contained" : "outlined"} 
                color={fotoFrenteINE ? "success" : "primary"} 
                component="label" 
                startIcon={<AddPhotoAlternate />} 
                fullWidth
                sx={{ py: 2 }}
              >
                {fotoFrenteINE ? "✓ Frente INE Cargado" : "Foto Frente INE"}
                <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, setFotoFrenteINE)} />
              </Button>
              <Button 
                variant={fotoReversoINE ? "contained" : "outlined"} 
                color={fotoReversoINE ? "success" : "primary"} 
                component="label" 
                startIcon={<AddPhotoAlternate />} 
                fullWidth
                sx={{ py: 2 }}
              >
                {fotoReversoINE ? "✓ Reverso INE Cargado" : "Foto Reverso INE"}
                <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, setFotoReversoINE)} />
              </Button>
            </Stack>

            <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block', color: '#475569' }}>
              Evidencias del Domicilio
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <Button 
                variant={fotoReciboLuz ? "contained" : "outlined"} 
                color={fotoReciboLuz ? "success" : "warning"} 
                component="label" 
                startIcon={<Receipt />} 
                fullWidth
                sx={{ py: 2 }}
              >
                {fotoReciboLuz ? "✓ Recibo de Luz Cargado" : "Foto Recibo de Luz"}
                <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, setFotoReciboLuz)} />
              </Button>
              <Button 
                variant={fotoFachada ? "contained" : "outlined"} 
                color={fotoFachada ? "success" : "info"} 
                component="label" 
                startIcon={<Home />} 
                fullWidth
                sx={{ py: 2 }}
              >
                {fotoFachada ? "✓ Fachada Cargada" : " Foto Fachada"}
                <input type="file" hidden accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, setFotoFachada)} />
              </Button>
            </Stack>

            {(fotoFrenteINE || fotoReversoINE || fotoReciboLuz || fotoFachada) && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Fotos listas para enviar:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {fotoFrenteINE && <Chip label="✓ Frente INE" color="success" size="small" />}
                  {fotoReversoINE && <Chip label="✓ Reverso INE" color="success" size="small" />}
                  {fotoReciboLuz && <Chip label="✓ Recibo Luz" color="warning" size="small" />}
                  {fotoFachada && <Chip label="✓ Fachada" color="info" size="small" />}
                </Stack>
              </Box>
            )}

            <Card variant="outlined" sx={{ mb: 3, borderColor: '#0ea5e9', bgcolor: '#f0f9ff' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <SimCard sx={{ color: '#0369a1', fontSize: 28, mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={activarChip}
                          onChange={(e) => setActivarChip(e.target.checked)}
                          color="primary"
                          sx={{ '&.Mui-checked': { color: '#0369a1' } }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                            Activar Chip SIM por $80.00 adicionales
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#0c4a6e', display: 'block' }}>
                            Incluye chip físico con número telefónico
                          </Typography>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Desglose de Cobros</Typography>
              {formData.plan && (
                <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, borderLeft: '3px solid #2196F3' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>
                    Plan: <strong>{formData.plan.nombre}</strong>
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Instalación:</Typography>
                <Typography variant="body2">${totales.instalacion.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Primer mes:</Typography>
                <Typography variant="body2">${totales.primerMes.toFixed(2)}</Typography>
              </Box>

              {activarChip && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                  p: 1,
                  backgroundColor: '#f0f9ff',
                  borderRadius: 1,
                  border: '1px dashed #0ea5e9'
                }}>
                  <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: 600 }}>
                    Activación de Chip SIM:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: 700 }}>
                    $80.00
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 1 }} />
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 1.5,
                backgroundColor: '#ecfdf5',
                borderRadius: 1,
                border: '1px solid #a7f3d0'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#065f46' }}>Total:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#059669', fontSize: '1.1rem' }}>
                  ${totales.total.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Firma del Cliente *</Typography>
            <Box sx={{ backgroundColor: '#fff', border: '2px dashed #cbd5e1', borderRadius: 2, height: 200, touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
              />
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Button size="small" onClick={limpiarFirma} color="error">Limpiar Firma</Button>
              <Button size="small" onClick={() => window.print()} color="secondary">Generar PDF</Button>
            </Stack>
          </Box>
        );
      default:
        return 'Desconocido';
    }
  };

  return (
    <Box sx={{ maxWidth: 900, margin: 'auto', p: 1 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Contrato y Firma</Typography>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {pasosContrato.map((paso, index) => (
            <Step key={paso.label}>
              <StepLabel>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {paso.label}
                </Typography>
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={index === 2 ? handleSubmit : handleNext}
                    disabled={loadingContrato}
                  >
                    {loadingContrato ? <CircularProgress size={20} color="inherit" /> : (index === 2 ? 'Finalizar' : 'Siguiente')}
                  </Button>
                  <Button disabled={index === 0} onClick={handleBack} sx={{ ml: 1 }}>Atrás</Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {errorApi && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
            {errorApi}
          </Alert>
        )}

        {guardado && !errorApi && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Contrato guardado exitosamente. Aparecerá en AgendaInstalaciones.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default PlanCotizacion;