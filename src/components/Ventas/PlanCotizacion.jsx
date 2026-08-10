import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SeleccionPlanes from '../Forms/SeleccionPlanes';
import { useContratos } from '../../hooks/useContratos';
import { usePlanes } from '../../hooks/usePlanes';
import api from '../../services/api';
import {
  validarNombrePersona, validarTelefonoMx,
  validarINE, validarDireccion, validarTextoLibre
} from '../../utils/validaciones';
import { esPdf } from '../../utils/evidencias';
import { obtenerDireccion } from '../../services/geocodeService';
import BotonEvidencia from '../Forms/BotonEvidencia';

import {
  Box, Paper, Typography, TextField, Button, MenuItem,
  Alert, Stack, Stepper, Step, StepLabel, StepContent, Divider,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  CircularProgress, InputAdornment, Tooltip, IconButton, Chip,
  Checkbox, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText
} from '@mui/material';
import {
  BorderColor, Save, CheckCircle, AddPhotoAlternate, InfoOutlined,
  MyLocation, ContentCopy, WhatsApp, PinDrop, LocalOffer, SimCard,
  Receipt, Home, HelpOutlined
} from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Grosor del trazo de la firma, en píxeles tal como se ven en pantalla. Al
// dibujar se multiplica por la escala del canvas, así que el trazo se ve igual
// de grueso en celular que en escritorio.
const GROSOR_FIRMA_PX = 1.6;

// Nota de un clic para el caso más común: el cliente no traía el comprobante.
// Se ofrece hecha para que la nota llegue a logística redactada igual siempre y
// el vendedor no la deje en blanco por pereza.
const NOTA_SIN_COMPROBANTE =
  'El cliente no tenía el comprobante de domicilio a la mano: pedírselo el día de la instalación.';

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

// Dentro de un <Dialog/> o de un <Collapse/> del Stepper, Leaflet mide el
// contenedor cuando todavía tiene 0px de alto y las teselas salen grises.
const AjustarTamanoMapa = () => {
  const map = useMap();
  useEffect(() => {
    const timers = [150, 450, 800].map(ms => setTimeout(() => map.invalidateSize(), ms));
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
};
const PlanCotizacion = ({
  usuarioActual,
  datosDesdeProspecto = null,
  enModal = false,
  onContratoCreado = null
}) => {
  const location = useLocation();
  const { createContrato, loading: loadingContrato } = useContratos();

  
  const {
    planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV,
    planesHibridos, planesAntenaWireless
  } = usePlanes();

  const todosLosPlanes = useMemo(() => [
    ...planesFibraSimetrica, ...planesFibraAsimetrica, ...planesSolitTV,
    ...planesHibridos, ...planesAntenaWireless
  ], [planesFibraSimetrica, planesFibraAsimetrica, planesSolitTV, planesHibridos, planesAntenaWireless]);

  const [activeStep, setActiveStep] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState(false);
  const [errorPlan, setErrorPlan] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const [activarChip, setActivarChip] = useState(false);

  // Errores por campo del paso en curso.
  const [erroresPaso, setErroresPaso] = useState({});
  // Falla del servicio de mapas al traducir coordenadas.
  const [errorGeocode, setErrorGeocode] = useState(null);
  // Resumen + confirmación antes de guardar.
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);

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
    detallesCasa: '',
    notas: ''
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
  // La firma vive en el bitmap del canvas y el canvas se desmonta al cambiar
  // de paso; se conserva aquí como imagen para restaurarla si el vendedor
  // regresa, en vez de obligar al cliente a firmar otra vez.
  const [firmaGuardada, setFirmaGuardada] = useState(null);

  const datosPrefill = datosDesdeProspecto || location.state?.datosDesdeProspecto || null;
  const [planInteresPendiente, setPlanInteresPendiente] = useState(null);
  const prefillAplicadoRef = useRef(null);

  useEffect(() => {
    if (!datosPrefill) return;
    const huella = JSON.stringify(datosPrefill);
    if (prefillAplicadoRef.current === huella) return;
    prefillAplicadoRef.current = huella;

    setFormData(prev => ({
      ...prev,
      nombre: datosPrefill.nombre || '',
      telefono1: datosPrefill.telefono1 || '',
      calleNumero: datosPrefill.calleNumero || '',
      referencias: datosPrefill.referencias || '',
      lat: datosPrefill.lat || '',
      lng: datosPrefill.lng || ''
    }));

    setPlanInteresPendiente(datosPrefill.planNombre || datosPrefill.plan?.nombre || null);

    if (datosPrefill.coordenadasGPS) {
      setMetodoUbicacion('mapa');
      setCoordenadas(datosPrefill.coordenadasGPS);
    } else if (datosPrefill.calleNumero) {
      setMetodoUbicacion('manual');
    }
  }, [datosPrefill]);
  useEffect(() => {
    if (!planInteresPendiente || todosLosPlanes.length === 0) return;

    const objetivo = planInteresPendiente.trim().toLowerCase();
    const encontrado = todosLosPlanes.find(
      p => (p.nombre || '').trim().toLowerCase() === objetivo
    );

    if (encontrado) {
      setFormData(prev => (prev.plan ? prev : { ...prev, plan: encontrado }));
      setPlanInteresPendiente(null);
    }
  }, [planInteresPendiente, todosLosPlanes]);

  /**
   * Convierte la posición del puntero a coordenadas internas del canvas.
   *
   * El canvas tiene un mapa de bits fijo de 800x200 pero se muestra al 100% del
   * ancho del contenedor (unos 430 px). Sin reescalar, una firma hecha al centro
   * de la pantalla se dibujaba a ~27% del ancho interno, es decir pegada a la
   * izquierda. Hay que multiplicar por la razón entre el tamaño interno y el
   * mostrado.
   */
  const obtenerPuntoCanvas = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();

    // En touch, clientX vive en e.touches; se revisa primero porque un toque en
    // el borde izquierdo da clientX = 0, que con `||` se tomaría como ausente.
    const fuente = e.touches?.[0] || e.changedTouches?.[0] || e;
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;

    return {
      x: (fuente.clientX - rect.left) * escalaX,
      y: (fuente.clientY - rect.top) * escalaY,
      escalaX
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y, escalaX } = obtenerPuntoCanvas(e, canvas);

    // El grosor también se escala para que el trazo se vea de ~3 px en pantalla
    // sin importar el ancho al que se esté mostrando el canvas.
    ctx.lineWidth = GROSOR_FIRMA_PX * escalaX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

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
    const { x, y } = obtenerPuntoCanvas(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Cada vez que levanta el lápiz se respalda el trazo acumulado.
    const canvas = canvasRef.current;
    if (canvas) setFirmaGuardada(canvas.toDataURL());
  };

  const limpiarFirma = () => {
    setFirmaGuardada(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Al volver al paso de evidencias el canvas se monta en blanco: se restaura
  // el último trazo respaldado.
  useEffect(() => {
    if (activeStep !== 2 || !firmaGuardada) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = firmaGuardada;
    // Solo al entrar al paso: redibujar en cada trazo pisaría la firma en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  /**
   * Traduce las coordenadas a una dirección.
   *
   * Si el servicio de mapas falla se avisa en pantalla en vez de dejar el campo
   * vacío: antes, al guardar, la dirección terminaba siendo "Ubicación por
   * mapa: 18.46, -97.39" y parecía que la traducción no existía.
   */
  const consultarDireccionHumana = async (latitude, longitude) => {
    setLoadingGeocode(true);
    setErrorGeocode(null);

    // Las coordenadas se guardan aunque falle la traducción: son el dato duro.
    setFormData(prev => ({
      ...prev,
      lat: latitude.toString(),
      lng: longitude.toString()
    }));

    const { direccion, error } = await obtenerDireccion(latitude, longitude);

    if (direccion) {
      setFormData(prev => ({ ...prev, calleNumero: direccion }));
    } else {
      setErrorGeocode(error);
      console.warn('No se pudo traducir las coordenadas:', error);
    }
    setLoadingGeocode(false);
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

  /**
   * Valida un paso y deja los mensajes junto a cada campo.
   *
   * Antes toda la validación vivía en handleSubmit: el vendedor llenaba los tres
   * pasos, subía cuatro fotos, tomaba la firma del cliente y hasta entonces se
   * enteraba de que el INE estaba mal. Ahora cada paso se valida al salir de él.
   */
  const validarPasoContrato = (paso) => {
    let errores = {};

    if (paso === 0) {
      const e1 = validarINE(formData.ine);
      const e2 = validarNombrePersona(formData.nombre);
      const e3 = validarTelefonoMx(formData.telefono1);
      const e4 = validarTelefonoMx(formData.telefono2, { obligatorio: false });
      if (e1) errores.ine = e1;
      if (e2) errores.nombre = e2;
      if (e3) errores.telefono1 = e3;
      if (e4) errores.telefono2 = e4;
      // El correo es obligatorio pero sin validar su formato: hay clientes
      // con correos poco comunes que el filtro anterior marcaba como falsos.
      if (!formData.correo.trim()) errores.correo = 'El correo es obligatorio';

      // Dos teléfonos iguales suele ser copiar y pegar por salir del paso.
      if (!e3 && !e4 && formData.telefono2 && formData.telefono1 === formData.telefono2) {
        errores.telefono2 = 'El teléfono 2 no puede ser igual al teléfono 1';
      }
    }

    if (paso === 1) {
      if (!formData.plan) errores.plan = 'Debes seleccionar un paquete comercial';

      if (metodoUbicacion === 'manual') {
        const eDir = validarDireccion(formData.calleNumero);
        if (eDir) errores.direccion = eDir;
      } else if (metodoUbicacion === 'gps' || metodoUbicacion === 'mapa') {
        if (!coordenadas.includes(',')) {
          errores.direccion = metodoUbicacion === 'gps'
            ? 'Toca "Obtener ubicación" para capturar el GPS del domicilio'
            : 'Toca el mapa para fijar el pin en el domicilio';
        }
      }

      const eRef = validarTextoLibre(formData.referencias, { etiqueta: 'Las referencias' });
      const eFach = validarTextoLibre(formData.detallesCasa, { etiqueta: 'Los detalles de fachada' });
      if (eRef) errores.referencias = eRef;
      if (eFach) errores.detallesCasa = eFach;
    }

    if (paso === 2) {
      // El comprobante de domicilio no es obligatorio aquí: si el cliente no
      // lo tiene a la mano, el técnico lo captura durante la instalación.
      if (!fotoFrenteINE) errores.evidencias = 'Falta la foto del frente del INE';
      else if (!fotoReversoINE) errores.evidencias = 'Falta la foto del reverso del INE';
      else if (!fotoFachada) errores.evidencias = 'Falta la foto de la fachada';

      if (!errores.evidencias && firmaEstaVacia()) {
        errores.firma = 'Falta la firma del cliente';
      }

      const eNotas = validarTextoLibre(formData.notas, { etiqueta: 'Las notas' });
      if (eNotas) errores.notas = eNotas;
    }

    setErroresPaso(errores);
    setErrorDireccion(Boolean(errores.direccion));
    setErrorPlan(Boolean(errores.plan));

    const mensajes = Object.values(errores);
    setErrorApi(mensajes.length ? mensajes.join('\n') : null);
    return mensajes.length === 0;
  };

  /** True si no hay firma ni en el canvas ni en el respaldo. */
  const firmaEstaVacia = () => {
    const canvas = canvasRef.current;
    if (!canvas) return !firmaGuardada;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const canvasVacio = !imageData.data.some(channel => channel !== 0);
    // El canvas puede estar recién montado y todavía sin restaurar; el
    // respaldo también cuenta como firma válida.
    return canvasVacio && !firmaGuardada;
  };

  const handleNext = () => {
    if (!validarPasoContrato(activeStep)) return;
    setErroresPaso({});
    setErrorApi(null);
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
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; 
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setPhotoState(compressedBase64); 
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        alert('Error al leer la imagen. Intenta de nuevo.');
      };
      reader.readAsDataURL(file);
    }
  };

  /** Agrega la nota estándar del comprobante sin pisar lo que ya se escribió. */
  const agregarNotaComprobante = () => {
    setFormData(prev => {
      const actual = (prev.notas || '').trim();
      if (actual.includes(NOTA_SIN_COMPROBANTE)) return prev;
      return {
        ...prev,
        notas: actual ? `${actual}\n${NOTA_SIN_COMPROBANTE}` : NOTA_SIN_COMPROBANTE
      };
    });
  };

  /**
   * Último paso: en vez de guardar, revalida todo y abre el resumen.
   *
   * Se revalidan también los pasos anteriores porque el vendedor pudo regresar y
   * dejar un campo a medias después de haberlo pasado.
   */
  const handleSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setErrorApi(null);

    for (const paso of [0, 1, 2]) {
      if (!validarPasoContrato(paso)) {
        // Devolvemos al vendedor al paso donde está el problema.
        setActiveStep(paso);
        return;
      }
    }

    setConfirmacionAbierta(true);
  };

  /** Guarda el contrato. Solo se llama desde el diálogo de confirmación. */
  const guardarContrato = async () => {
    setErrorApi(null);
    setConfirmacionAbierta(false);
    const canvas = canvasRef.current;

    setGuardado(true);

    try {
      // El canvas es la fuente primaria; si por un cambio de paso aún no se
      // restaura el trazo, se usa el respaldo.
      let firmaDigital = firmaGuardada;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const tieneTrazo = ctx
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some(channel => channel !== 0);
        if (tieneTrazo) firmaDigital = canvas.toDataURL('image/jpeg', 0.5);
      }

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
        notas: formData.notas.trim(),
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
      if (enModal) {
        if (onContratoCreado) onContratoCreado(datosContrato);
        return;
      }

      setTimeout(() => {
        setGuardado(false);
        setActiveStep(0);
        setFormData({
          ine: '', nombre: '', telefono1: '', telefono2: '',
          correo: '', plan: null, calleNumero: '',
          referencias: '', detallesCasa: '', notas: ''
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

  const centroMapaContrato = useMemo(() => {
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    return [18.4628, -97.3928];
  }, [formData.lat, formData.lng]);

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
              error={Boolean(erroresPaso.ine)}
              helperText={erroresPaso.ine || `${formData.ine.length}/16 dígitos`}
            />
            <TextField
              label="Nombre Completo *"
              required
              fullWidth
              size="small"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              error={Boolean(erroresPaso.nombre)}
              helperText={erroresPaso.nombre || 'Nombre y apellidos como aparecen en el INE'}
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
              error={Boolean(erroresPaso.telefono1)}
              helperText={erroresPaso.telefono1 || `${formData.telefono1.length}/10 dígitos`}
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
              error={Boolean(erroresPaso.telefono2)}
              helperText={erroresPaso.telefono2 || 'Opcional'}
            />
            <TextField
              label="Correo Electrónico *"
              type="email"
              required
              fullWidth
              size="small"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              error={Boolean(erroresPaso.correo)}
              helperText={erroresPaso.correo || 'ejemplo@dominio.com'}
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
              {planInteresPendiente && todosLosPlanes.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  El prospecto mostró interés en <strong>{planInteresPendiente}</strong>, pero ese
                  paquete ya no está en el catálogo activo. Selecciona el paquete vigente para que
                  el contrato lleve el precio correcto.
                </Alert>
              )}

              <SeleccionPlanes planSeleccionado={formData.plan} onPlanSeleccionado={handleSeleccionarPlan} />
              {errorPlan && (<Alert severity="error" sx={{ mt: 2 }}>{erroresPaso.plan || 'Debes seleccionar un paquete comercial.'}</Alert>)}
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
              {/* Falta capturar el GPS o el pin: el aviso va aquí, no al final */}
              {erroresPaso.direccion && metodoUbicacion !== 'manual' && (
                <Alert severity="error" sx={{ mb: 2 }}>{erroresPaso.direccion}</Alert>
              )}

              {/* El punto se capturó pero Google no devolvió la calle */}
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
                  <strong>No se pudo traducir la ubicación a una dirección.</strong> {errorGeocode}
                  {' '}Las coordenadas sí quedaron guardadas; puedes reintentar o cambiar a
                  "Dirección Manual" y escribirla.
                </Alert>
              )}

              {metodoUbicacion === 'manual' && (
                <TextField
                  label="Dirección (Calle y Número)"
                  required
                  error={errorDireccion}
                  helperText={erroresPaso.direccion || "Se llenará solo si usas GPS o Mapa"}
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
                      center={centroMapaContrato}
                      zoom={formData.lat ? 17 : 14}
                      zoomControl={true}
                      style={{ height: '100%', width: '100%' }}
                      preferCanvas={true}
                    >
                      <TileLayer
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        attribution='&copy; Google Maps'
                      />
                      <AjustarTamanoMapa />

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
                  error={Boolean(erroresPaso.referencias)}
                  helperText={erroresPaso.referencias || 'Opcional'}
                />
                <TextField
                  label="Detalles de Fachada"
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                  value={formData.detallesCasa}
                  onChange={(e) => setFormData({ ...formData, detallesCasa: e.target.value })}
                  error={Boolean(erroresPaso.detallesCasa)}
                  helperText={erroresPaso.detallesCasa || 'Opcional'}
                />
              </Stack>
            </Box>
          </Stack>
        );
      case 2:
        const totales = calcularTotales();
        return (
          <Box sx={{ mt: 2 }}>
            {(erroresPaso.evidencias || erroresPaso.firma) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {erroresPaso.evidencias || erroresPaso.firma}
              </Alert>
            )}

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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
              {/* El comprobante de domicilio suele venir ya digitalizado (el PDF
                  que el cliente descarga de CFE), así que este botón pregunta si
                  se toma foto o se sube el archivo. Va al mismo campo. */}
              <BotonEvidencia
                etiqueta={fotoReciboLuz ? 'Comprobante Cargado' : 'Comprobante de Domicilio (opcional)'}
                cargada={Boolean(fotoReciboLuz)}
                permitirPdf
                icono={<Receipt />}
                color="warning"
                fullWidth
                sx={{ py: 2 }}
                onArchivo={(dataUri) => { setFotoReciboLuz(dataUri); setErrorApi(null); }}
                onError={(mensaje) => setErrorApi(mensaje)}
              />
              <BotonEvidencia
                etiqueta={fotoFachada ? 'Fachada Cargada' : 'Foto Fachada'}
                cargada={Boolean(fotoFachada)}
                icono={<Home />}
                color="info"
                fullWidth
                sx={{ py: 2 }}
                onArchivo={(dataUri) => { setFotoFachada(dataUri); setErrorApi(null); }}
                onError={(mensaje) => setErrorApi(mensaje)}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              En el comprobante de domicilio puedes tomar la foto o subir el PDF digital.
              Si el cliente no lo tiene a la mano, el técnico lo captura el día de la instalación.
            </Typography>

            {(fotoFrenteINE || fotoReversoINE || fotoReciboLuz || fotoFachada) && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Fotos listas para enviar:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {fotoFrenteINE && <Chip label="✓ Frente INE" color="success" size="small" />}
                  {fotoReversoINE && <Chip label="✓ Reverso INE" color="success" size="small" />}
                  {fotoReciboLuz && (
                    <Chip
                      label={`✓ Comprobante (${esPdf(fotoReciboLuz) ? 'PDF' : 'foto'})`}
                      color="warning" size="small"
                    />
                  )}
                  {fotoFachada && <Chip label="✓ Fachada" color="info" size="small" />}
                </Stack>
              </Box>
            )}

            {/* Notas de ventas. El caso que originó el campo es el comprobante:
                si no se capturó, logística lo ve en su agenda y el técnico sabe
                que tiene que pedirlo el día de la instalación. */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Notas para logística y el técnico
            </Typography>

            {!fotoReciboLuz && (
              <Alert
                severity="warning"
                sx={{ mb: 1.5 }}
                action={
                  <Button color="inherit" size="small" onClick={agregarNotaComprobante}>
                    Agregar nota
                  </Button>
                }
              >
                Este contrato va sin comprobante de domicilio. Deja una nota para que el
                técnico se lo pida al cliente el día de la instalación.
              </Alert>
            )}

            <TextField
              label="Notas"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              error={Boolean(erroresPaso.notas)}
              helperText={erroresPaso.notas || 'Opcional. Aparece en la agenda de logística y en la pantalla del técnico.'}
              sx={{ mb: 3 }}
            />

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
            </Stack>
          </Box>
        );
      default:
        return 'Desconocido';
    }
  };

  return (
    <Box sx={{ maxWidth: enModal ? '100%' : 900, margin: enModal ? 0 : 'auto', p: enModal ? 0 : 1 }}>
      {!enModal && (
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Contrato y Firma</Typography>
      )}
      <Paper
        variant={enModal ? 'elevation' : 'outlined'}
        elevation={0}
        sx={{ p: enModal ? 0 : 4, borderRadius: 3 }}
      >
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
                    {loadingContrato ? <CircularProgress size={20} color="inherit" /> : (index === 2 ? 'Revisar y Finalizar' : 'Siguiente')}
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

      {/* Resumen y confirmación antes de guardar el contrato */}
      <Dialog
        open={confirmacionAbierta}
        onClose={() => !loadingContrato && setConfirmacionAbierta(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <HelpOutlined color="primary" />
          ¿Guardar este contrato?
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Revisa los datos con el cliente antes de guardar. Una vez guardado pasa a
            Agenda de Instalaciones.
          </Typography>

          <List dense disablePadding>
            <ListItem disableGutters divider>
              <ListItemText primary="Cliente" secondary={formData.nombre}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText primary="INE" secondary={formData.ine}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText
                primary="Contacto"
                secondary={`${formData.telefono1}${formData.telefono2 ? ` / ${formData.telefono2}` : ''} · ${formData.correo}`}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }}
              />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText
                primary="Domicilio"
                secondary={formData.calleNumero || `Ubicación por ${metodoUbicacion}: ${coordenadas || 'sin capturar'}`}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }}
              />
            </ListItem>
            <ListItem disableGutters divider>
              <ListItemText primary="Plan contratado" secondary={formData.plan?.nombre || '—'}
                secondaryTypographyProps={{ fontWeight: 700, color: '#0f172a' }} />
            </ListItem>
            <ListItem disableGutters divider={Boolean(formData.notas.trim())}>
              <ListItemText primary="Evidencias"
                secondary={fotoReciboLuz
                  ? 'INE frente y reverso, comprobante de domicilio, fachada y firma'
                  : 'INE frente y reverso, fachada y firma — el comprobante de domicilio lo captura el técnico en la instalación'} />
              <CheckCircle sx={{ color: '#16a34a' }} />
            </ListItem>

            {formData.notas.trim() && (
              <ListItem disableGutters>
                <ListItemText
                  primary="Notas para logística"
                  secondary={formData.notas.trim()}
                  secondaryTypographyProps={{
                    fontWeight: 700, color: '#0f172a', whiteSpace: 'pre-line'
                  }}
                />
              </ListItem>
            )}
          </List>

          {/* El total es lo que más importa revisar en voz alta con el cliente */}
          <Box sx={{ mt: 2, p: 2, bgcolor: '#ecfdf5', borderRadius: 2, border: '1px solid #a7f3d0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Primer mes:</Typography>
              <Typography variant="body2">${calcularTotales().primerMes.toFixed(2)}</Typography>
            </Box>
            {activarChip && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Chip SIM:</Typography>
                <Typography variant="body2">$80.00</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46' }}>Total a cobrar:</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', fontSize: '1.15rem' }}>
                ${calcularTotales().total.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmacionAbierta(false)} disabled={loadingContrato} color="inherit">
            Revisar de nuevo
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={loadingContrato}
            startIcon={loadingContrato ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            onClick={guardarContrato}
          >
            {loadingContrato ? 'Guardando...' : 'Sí, guardar contrato'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanCotizacion;