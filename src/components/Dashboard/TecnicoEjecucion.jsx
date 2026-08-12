import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle,
  Build,
  LocationOn,
  Phone,
  Person,
  Schedule,
  Assignment,
  Email,
  Visibility,
  AssignmentTurnedIn,
  ReportProblem,
  ThumbUp,
  Navigation,
  Timer,
  Flag,
  NotificationsActive,
  Map as MapIcon
} from '@mui/icons-material';
import api from '../../services/api';
import BotonEvidencia from '../Forms/BotonEvidencia';
import MapaRutaInstalacion from './MapaRutaInstalacion';
import BannerNavegacion from './BannerNavegacion';
import { aPuntoNumerico, obtenerPosicionActual, motivoGpsNoDisponible } from '../../utils/geo';
import { formatearDuracion, formatearDistancia, obtenerRuta } from '../../services/rutaService';
import {
  instalacionesSeguimientoService, ESTADOS, TIPOS_ALERTA, fichaTecnicaDesdeFormulario
} from '../../services/instalacionesSeguimientoService';
import { useMonitoreoTraslado } from '../../hooks/useMonitoreoTraslado';
import { useNavegacion } from '../../hooks/useNavegacion';


const Cronometro = ({ desde, etiqueta, color = '#0369a1' }) => {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (!desde) return;
    const inicio = new Date(desde).getTime();
    const calcular = () => setSegundos(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    calcular();
    const timer = setInterval(calcular, 1000);
    return () => clearInterval(timer);
  }, [desde]);

  if (!desde) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Timer sx={{ fontSize: 18, color }} />
      <Typography variant="body2" sx={{ fontWeight: 700, color }}>
        {etiqueta}: {formatearDuracion(segundos)}
      </Typography>
    </Box>
  );
};

/**
 * Salida de emergencia para marcar la llegada con el GPS impreciso.
 *
 * Apagada a propósito mientras se prueba el bloqueo por distancia: así el
 * botón solo se habilita llegando de verdad al domicilio. Ponerla en true
 * vuelve a mostrar el botón "Ya estoy aquí", que deja pasar dejando registrada
 * la distancia a la que se marcó.
 */
const PERMITIR_LLEGADA_LEJOS = false;

const TecnicoEjecucion = ({ usuarioActual }) => {
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  const [formData, setFormData] = useState({
    verificar_equipos: false,
    tendido_cable: false,
    config_ont: false,
    serial_ont: '',
    serial_router: '',
    metraje_fibra: '',
    potencia_dbm: '',
    tipo_instalacion: 'Residencial',
    conectores_utilizados: 2,
    notas_instalacion: '',
    foto_comprobante: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);

  const [filtroEstatus, setFiltroEstatus] = useState('asignadas');

  const [rutaOpen, setRutaOpen] = useState(false);
  const [enCurso, setEnCurso] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);

  const enTelefono = useMediaQuery('(max-width:700px)');

  const { posicion, alertaActiva, responderAlerta, errorGps } = useMonitoreoTraslado({
    instalacion: enCurso,
    activo: Boolean(enCurso) && enCurso?.estado === ESTADOS.ACEPTADA
  });

  // Se evalúa una vez: no cambia durante la sesión.
  const motivoGps = useMemo(() => motivoGpsNoDisponible(), []);

  // Navegación giro a giro. Solo mientras va en camino y con el mapa abierto:
  // al llegar al domicilio ya no hay nada que indicar y seguir hablando estorba.
  const yendoAlDomicilio = rutaOpen && enCurso?.estado === ESTADOS.ACEPTADA;
  const navegacion = useNavegacion({
    origen: posicion,
    destino: enCurso?.destino,
    activo: yendoAlDomicilio,
    voz: vozActiva
  });

  /**
   * La llegada solo se puede marcar estando en el domicilio.
   *
   * Cuando no hay con qué comprobarlo —GPS bloqueado, o un contrato sin
   * coordenadas— no se bloquea: dejar a un técnico sin poder abrir su orden por
   * un permiso del navegador es peor que confiar en él.
   */
  const sinFormaDeValidar = Boolean(motivoGps) || !posicion || !enCurso?.destino;
  const puedeMarcarLlegada = sinFormaDeValidar || navegacion.llego;

  const formatFecha = (fecha) => {
    if (!fecha) return null;
    const fechaSegura = fecha.includes('T') ? fecha : `${fecha}T12:00:00`;
    return new Date(fechaSegura).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFechaCorta = (fecha) => {
    if (!fecha) return null;
    const fechaSegura = fecha.includes('T') ? fecha : `${fecha}T12:00:00`;
    return new Date(fechaSegura).toLocaleDateString('es-MX');
  };

  const formatFechaHora = (fechaString) => {
    if (!fechaString) return null;
    const fechaObj = new Date(fechaString);
    return fechaObj.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    if (usuarioActual) {
      fetchInstalaciones();
    }
  }, [usuarioActual]);

  const fetchInstalaciones = async () => {
    try {
      setLoading(true);
      setError('');
      
      const rol = usuarioActual?.rol?.toLowerCase().trim();
      const esAdmin = rol === 'admin' || rol === 'administrador' || rol === 'supervisor';
      
      setVistaAdmin(esAdmin);
      
      try {
        const tecnicosResponse = await api.get('/usuarios/?rol=Tecnico');
        setTecnicos(tecnicosResponse.data);
      } catch (err) {
        try {
          const res2 = await api.get('/usuarios/');
          const tecnicosFiltrados = res2.data.filter(u => u.rol && u.rol.toLowerCase() === 'tecnico');
          setTecnicos(tecnicosFiltrados);
        } catch (err2) {
          console.error("Error al cargar técnicos:", err2);
        }
      }
      
      const [contratosRes, instalacionesRes] = await Promise.all([
        api.get('/contratos/'),
        api.get('/instalaciones/')
      ]);
      
      const todosLosContratos = contratosRes.data;
      const todasLasInstalaciones = instalacionesRes.data;
      
      let contratosFiltrados = [];
      const todosLosEstatus = [
        'Pendiente Asignar', 'Pendiente',
        'Asignado', 'Programada', 'Asignada', 'En Proceso',
        'Completado', 'Completada'
      ];
      
      if (esAdmin) {
        contratosFiltrados = todosLosContratos.filter(contrato => {
          const tieneTecnico = contrato.tecnico_id && contrato.tecnico_id !== null;
          const estatusValido = todosLosEstatus.includes(contrato.estatus);
          return tieneTecnico && estatusValido;
        });
      } else {
        contratosFiltrados = todosLosContratos.filter(contrato => {
          const esMio = contrato.tecnico_id == usuarioActual?.perfil_id || contrato.tecnico_id == usuarioActual?.id;
          const estatusValido = todosLosEstatus.includes(contrato.estatus);
          return esMio && estatusValido;
        });
      }
      
      const instalacionesFormateadas = contratosFiltrados.map(contrato => {
        const instalacionBD = todasLasInstalaciones.find(inst => inst.contrato_id === contrato.id);
        
        let tecnicoNombre = 'Sin asignar';
        if (contrato.tecnico_id) {
          const tecnico = tecnicos.find(t => t.id === contrato.tecnico_id);
          if (tecnico) {
            tecnicoNombre = tecnico.nombre + ' ' + tecnico.apellido || tecnico.nombre || tecnico.usuario || `Técnico #${tecnico.id}`;
          } else {
            tecnicoNombre = `Técnico ID: ${contrato.tecnico_id}`;
          }
        }
        
        const fechaEncontrada = instalacionBD?.fecha_programada || contrato.fecha_asignacion || null;
        const horaEncontrada = instalacionBD?.hora_asignada || null;
        
        return {
          id: contrato.id,
          instalacion_id: instalacionBD?.id || null, 
          contrato_id: contrato.id,
          contrato: contrato,
          tecnico_id: contrato.tecnico_id,
          tecnico_nombre: tecnicoNombre,
          estado: instalacionBD?.estado || contrato.estatus,
          fecha_programada: fechaEncontrada,  
          hora_asignada: horaEncontrada, 
          fecha_completada: instalacionBD?.fecha_completada || null,
          
          nota_atencion_clientes: instalacionBD?.nota || contrato.nota_logistica || '',
          observaciones_tecnico: instalacionBD?.observaciones || '',

          fecha_aceptacion: instalacionBD?.fecha_aceptacion || null,
          fecha_llegada: instalacionBD?.fecha_llegada || null,
          eta_minutos: instalacionBD?.eta_minutos || null,
          distancia_metros: instalacionBD?.distancia_metros || null,
          duracion_traslado_seg: instalacionBD?.duracion_traslado_seg ?? null,
          duracion_instalacion_seg: instalacionBD?.duracion_instalacion_seg ?? null,
          alertas: instalacionBD?.alertas || [],

          destino: aPuntoNumerico(contrato.coordenadas_gps)
        };
      });
      
      setInstalaciones(instalacionesFormateadas);
      
    } catch (error) {
      setError('Error al cargar las instalaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const esAsignada = (estado) => [
    'Asignado', 'Programada', 'Asignada', 'En Proceso',
    'Pendiente Asignar', 'Pendiente',
    ESTADOS.ACEPTADA, ESTADOS.EN_SITIO
  ].includes(estado);

  const esCompletada = (estado) => estado === 'Completado' || estado === 'Completada';

  const getInstalacionesFiltradas = () => {
    switch (filtroEstatus) {
      case 'asignadas':
        return instalaciones.filter(inst => esAsignada(inst.estado));
      case 'completadas':
        return instalaciones.filter(inst => esCompletada(inst.estado));
      default:
        return instalaciones;
    }
  };

  const totalAsignadas = instalaciones.filter(i => esAsignada(i.estado)).length;
  const totalCompletadas = instalaciones.filter(i => esCompletada(i.estado)).length;

  const instalacionesFiltradas = getInstalacionesFiltradas();

  const handleEjecutar = (instalacion) => {
    if (instalacion.estado === 'Completado' || instalacion.estado === 'Completada') {
      setError('Esta instalación ya está completada');
      return;
    }
    
    if (!vistaAdmin && instalacion.tecnico_id != usuarioActual?.perfil_id && instalacion.tecnico_id != usuarioActual?.id) {
      setError('No tienes permisos para ejecutar esta instalación');
      return;
    }
    
    setInstalacionSeleccionada(instalacion);
    setFormData({
      verificar_equipos: false,
      tendido_cable: false,
      config_ont: false,
      serial_ont: '',
      serial_router: '',
      metraje_fibra: '',
      potencia_dbm: '',
      tipo_instalacion: 'Residencial',
      conectores_utilizados: 2,
      notas_instalacion: instalacion.observaciones_tecnico || '',
      foto_comprobante: null
    });
    setDialogOpen(true);
  };

  const handleAceptar = async (instalacion) => {
    setError('');
    setSuccess('');

    if (!instalacion.instalacion_id) {
      setError('Esta orden aún no tiene registro de instalación en el sistema. Pide a la oficina que la reprograme.');
      return;
    }

    setProcesando(true);
    try {
      // Pedimos el GPS y calculamos la ruta ANTES de guardar la aceptación.
      //
      // Antes se leían de `posicion` y de la ruta que reportaba el mapa, pero
      // ninguno de los dos existe todavía en este momento: el monitoreo solo
      // arranca cuando la instalación ya está en estado 'Aceptada', y la ruta la
      // calcula el mapa, que se monta después. Resultado: se guardaba sin ubicación
      // y sin ETA, así que la oficina no veía al técnico ni la ruta, y la alerta
      // de demora nunca podía dispararse por falta de ETA.
      const { punto, error: errorUbicacion } = await obtenerPosicionActual();

      let datosRuta = null;
      if (punto && instalacion.destino) {
        datosRuta = await obtenerRuta(punto, instalacion.destino);
      }

      const actualizada = await instalacionesSeguimientoService.aceptar(instalacion.instalacion_id, {
        etaMinutos: datosRuta?.duracionMinutos,
        distanciaMetros: datosRuta?.distanciaMetros,
        lat: punto?.lat,
        lng: punto?.lng
      });

      setEnCurso({
        ...instalacion,
        estado: actualizada.estado,
        fecha_aceptacion: actualizada.fecha_aceptacion,
        eta_minutos: actualizada.eta_minutos,
        distancia_metros: actualizada.distancia_metros
      });
      setRutaOpen(true);

      if (!punto) {
        // Se acepta igual: no vamos a bloquear el trabajo por un permiso, pero
        // hay que decirle claro que la oficina no lo verá.
        setError(`Instalación aceptada, pero sin tu ubicación no se puede trazar la ruta ni la oficina podrá verte. ${errorUbicacion || ''}`);
      } else if (!instalacion.destino) {
        setError('Instalación aceptada. El contrato no tiene coordenadas registradas, así que no se puede trazar la ruta al domicilio.');
      } else {
        setSuccess(
          datosRuta
            ? `Instalación aceptada. Ruta de ${formatearDistancia(datosRuta.distanciaMetros)}, unos ${datosRuta.duracionMinutos} min.`
            : 'Instalación aceptada. Sigue la ruta hacia el domicilio.'
        );
      }

      fetchInstalaciones();
    } catch (err) {
      setError('No se pudo aceptar la instalación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Reintento manual del permiso de ubicación.
   *
   * Si el técnico negó el permiso o lo abrió sin GPS, esto le permite compartir
   * su posición sin tener que volver a aceptar la orden. También recalcula el
   * ETA si quedó vacío, para que la alerta de demora vuelva a funcionar.
   */
  const handleCompartirUbicacion = async () => {
    if (!enCurso?.instalacion_id) return;
    setProcesando(true);
    setError('');
    try {
      const { punto, error: errorUbicacion } = await obtenerPosicionActual();
      if (!punto) {
        setError(errorUbicacion || 'No se pudo obtener tu ubicación.');
        return;
      }

      await instalacionesSeguimientoService.reportarUbicacion(enCurso.instalacion_id, punto.lat, punto.lng);

      if (!enCurso.eta_minutos && enCurso.destino) {
        const datosRuta = await obtenerRuta(punto, enCurso.destino);
        if (datosRuta) {
          const actualizada = await instalacionesSeguimientoService.aceptar(enCurso.instalacion_id, {
            etaMinutos: datosRuta.duracionMinutos,
            distanciaMetros: datosRuta.distanciaMetros,
            lat: punto.lat,
            lng: punto.lng
          });
          setEnCurso(prev => ({
            ...prev,
            eta_minutos: actualizada.eta_minutos,
            distancia_metros: actualizada.distancia_metros
          }));
        }
      }

      setSuccess('Ubicación compartida. La oficina ya puede verte.');
      fetchInstalaciones();
    } catch (err) {
      setError('No se pudo compartir la ubicación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Confirma la llegada al domicilio y arranca el cronómetro de instalación.
   *
   * Recibe la instalación como parámetro porque también se llama desde el diálogo
   * de ejecución: ahí `enCurso` puede no estar puesto todavía (setState es
   * asíncrono) y leerlo del estado daría `undefined`.
   */
  const handleMarcarLlegada = async (instalacion = null) => {
    const objetivo = instalacion || enCurso;
    if (!objetivo?.instalacion_id) return;

    setProcesando(true);
    setError('');
    try {
      // Si el monitoreo no está activo (p. ej. se marca desde el diálogo de
      // ejecución) pedimos una lectura del GPS para dejar constancia de dónde
      // se registró la llegada.
      let punto = posicion;
      if (!punto) {
        const lectura = await obtenerPosicionActual();
        punto = lectura.punto;
      }

      const actualizada = await instalacionesSeguimientoService.marcarLlegada(objetivo.instalacion_id, {
        lat: punto?.lat,
        lng: punto?.lng
      });

      const cambios = {
        estado: actualizada.estado,
        fecha_llegada: actualizada.fecha_llegada,
        duracion_traslado_seg: actualizada.duracion_traslado_seg
      };

      setEnCurso(prev => (prev ? { ...prev, ...cambios } : { ...objetivo, ...cambios }));

      // El diálogo de ejecución muestra sus propios datos: hay que refrescarlo o
      // seguiría avisando que no se marcó la llegada.
      setInstalacionSeleccionada(prev =>
        prev && prev.instalacion_id === objetivo.instalacion_id ? { ...prev, ...cambios } : prev
      );

      if (!actualizada.fecha_llegada) {
        // El backend no devolvió la marca: casi siempre es que el servidor corre
        // una versión sin los campos de seguimiento.
        setError('Se guardó el estado, pero el servidor no registró la hora de llegada. Avisa a sistemas: el backend necesita reiniciarse para tomar los campos de seguimiento.');
      } else {
        setSuccess('Llegada registrada. El tiempo de instalación ya está corriendo.');
      }

      fetchInstalaciones();
    } catch (err) {
      setError('No se pudo registrar la llegada: ' + (err.response?.data?.detail || err.message));
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Marca la llegada aunque el GPS lo ubique lejos del domicilio.
   *
   * Existe porque un GPS impreciso —un patio techado, una zona sin señal— no
   * puede dejar varado al técnico con la orden sin abrir. Queda registrada la
   * distancia a la que se marcó para que la oficina lo revise.
   */
  const handleLlegadaLejos = async () => {
    if (!enCurso?.instalacion_id) return;

    try {
      await instalacionesSeguimientoService.crearAlerta({
        instalacionId: enCurso.instalacion_id,
        tipo: TIPOS_ALERTA.LLEGADA_LEJOS,
        mensaje: `Marcó su llegada a ${formatearDistancia(navegacion.distanciaDestinoM)} del domicilio registrado.`,
        lat: posicion?.lat,
        lng: posicion?.lng
      });
    } catch (err) {
      // La constancia es deseable, pero no a costa de frenar la instalación.
      console.warn('No se pudo registrar la excepción de llegada:', err?.message);
    }

    await handleMarcarLlegada();
  };

  const handleVerRuta = (instalacion) => {
    setEnCurso(instalacion);
    setRutaOpen(true);
  };

  const handleCompletar = async () => {
    try {
      setError('');
      setSuccess('');

      if (!formData.serial_ont || !formData.potencia_dbm || !formData.metraje_fibra) {
        setError('Los campos obligatorios deben estar completos');
        return;
      }

      // Ventas puede levantar el contrato sin comprobante de domicilio, con el
      // compromiso de que el técnico lo capture aquí antes de cerrar.
      const contratoSinComprobante = !instalacionSeleccionada.contrato?.foto_recibo_luz;
      if (contratoSinComprobante && !formData.foto_comprobante) {
        setError('Falta el comprobante de domicilio: ventas no lo capturó, tómale foto antes de completar');
        return;
      }

      // La ficha va primero: si falla, la instalación sigue abierta y se puede
      // reintentar, en vez de quedar cerrada y sin los datos del equipo.
      if (instalacionSeleccionada.instalacion_id) {
        await instalacionesSeguimientoService.guardarFichaTecnica(
          instalacionSeleccionada.instalacion_id,
          fichaTecnicaDesdeFormulario(formData)
        );
      }

      const cambiosContrato = { estatus: 'Completado' };
      if (formData.foto_comprobante) {
        cambiosContrato.foto_recibo_luz = formData.foto_comprobante;
      }
      await api.patch(`/contratos/${instalacionSeleccionada.contrato_id}/`, cambiosContrato);

      let duracion = null;
      if (instalacionSeleccionada.instalacion_id) {
        const actualizada = await instalacionesSeguimientoService.completar(
          instalacionSeleccionada.instalacion_id,
          { observaciones: formData.notas_instalacion }
        );
        duracion = actualizada.duracion_instalacion_seg;
      }

      setSuccess(
        duracion != null
          ? `Instalación completada. Tiempo en sitio: ${formatearDuracion(duracion)}.`
          : 'Instalación completada correctamente'
      );

      if (enCurso?.instalacion_id === instalacionSeleccionada.instalacion_id) {
        setEnCurso(null);
        setRutaOpen(false);
      }

      setTimeout(() => {
        setDialogOpen(false);
        fetchInstalaciones();
      }, 2000);
    } catch (error) {
      setError('Error al completar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'Programada': 'info',
      'Asignado': 'info',
      'Asignada': 'info',
      'En Proceso': 'warning',
      [ESTADOS.ACEPTADA]: 'primary',
      [ESTADOS.EN_SITIO]: 'secondary',
      'Completada': 'success',
      'Completado': 'success',
      'Pendiente Asignar': 'warning',
      'Pendiente': 'warning'
    };
    return colores[estado] || 'default';
  };

  const getEstadoTecnico = (estado) => {
    if (estado === ESTADOS.ACEPTADA) return 'Aceptada · en camino';
    if (estado === ESTADOS.EN_SITIO) return 'En sitio · instalando';
    return estado;
  };
  useEffect(() => {
    if (vistaAdmin || enCurso) return;
    const activa = instalaciones.find(
      i => i.estado === ESTADOS.ACEPTADA || i.estado === ESTADOS.EN_SITIO
    );
    if (activa) setEnCurso(activa);
  }, [instalaciones, vistaAdmin]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando instalaciones...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {vistaAdmin ? 'Control de Instalaciones (Admin)' : 'Mis Instalaciones Asignadas'} ({instalacionesFiltradas.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {vistaAdmin ? (
          <span>Vista de <strong>Administrador</strong> - Supervisión de todos los técnicos en campo</span>
        ) : (
          <span>Técnico: <strong>{usuarioActual?.nombre}</strong> | ID Empleado: <strong>{usuarioActual?.id}</strong></span>
        )}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ mb: 3, p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#475569' }}>
          Filtrar por Estado:
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant={filtroEstatus === 'asignadas' ? 'contained' : 'outlined'}
            startIcon={<AssignmentTurnedIn />}
            onClick={() => setFiltroEstatus('asignadas')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'asignadas' ? '#3b82f6' : 'transparent',
              color: filtroEstatus === 'asignadas' ? 'white' : '#3b82f6',
              borderColor: '#3b82f6',
              borderWidth: 2,
              fontWeight: 700,
              '&:hover': {
                bgcolor: filtroEstatus === 'asignadas' ? '#2563eb' : 'rgba(59, 130, 246, 0.08)',
                borderColor: '#2563eb',
              }
            }}
          >
            Asignadas ({totalAsignadas})
          </Button>
          
          <Button
            variant={filtroEstatus === 'completadas' ? 'contained' : 'outlined'}
            startIcon={<CheckCircle />}
            onClick={() => setFiltroEstatus('completadas')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'completadas' ? '#10b981' : 'transparent',
              color: filtroEstatus === 'completadas' ? 'white' : '#10b981',
              borderColor: '#10b981',
              borderWidth: 2,
              fontWeight: 700,
              '&:hover': {
                bgcolor: filtroEstatus === 'completadas' ? '#059669' : 'rgba(16, 185, 129, 0.08)',
                borderColor: '#059669',
              }
            }}
          >
            Completadas ({totalCompletadas})
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchInstalaciones}
          startIcon={<CheckCircle />}
        >
          Recargar
        </Button>
      </Stack>

      {vistaAdmin ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Folio</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Técnico Asignado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Dirección</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Programada</TableCell>
                
                {filtroEstatus === 'completadas' && (
                  <TableCell sx={{ fontWeight: 700 }}>Finalizada</TableCell>
                )}
                
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {instalacionesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={filtroEstatus === 'completadas' ? 8 : 7} align="center">
                    <Typography sx={{ py: 3, color: 'text.secondary' }}>
                      No hay instalaciones {filtroEstatus} para mostrar
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                instalacionesFiltradas.map((inst) => (
                  <TableRow key={inst.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>#{inst.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {inst.contrato?.nombre_completo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inst.contrato?.telefono1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={inst.tecnico_nombre} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{inst.contrato?.calle_numero}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inst.contrato?.plan_contratado}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {inst.fecha_programada ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d4ed8' }}>
                          {formatFecha(inst.fecha_programada)}
                          {inst.hora_asignada && (
                            <>
                              <br/>
                              <span style={{color: '#64748b', fontWeight: 400}}>
                                {inst.hora_asignada}
                              </span>
                            </>
                          )}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin programar</Typography>
                      )}
                    </TableCell>

                    {filtroEstatus === 'completadas' && (
                      <TableCell>
                        {inst.fecha_completada ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                            {formatFechaHora(inst.fecha_completada)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">No registrada</Typography>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      <Chip 
                        label={inst.estado} 
                        color={getEstadoColor(inst.estado)} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => handleEjecutar(inst)}
                        disabled={inst.estado === 'Completado' || inst.estado === 'Completada'}
                        sx={{ textTransform: 'none', mr: 1 }}
                      >
                        {inst.estado === 'Completado' || inst.estado === 'Completada' ? 'Finalizado' : 'Ver'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {instalacionesFiltradas.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', width: '100%' }}>
              <Build sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No tienes instalaciones {filtroEstatus}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {filtroEstatus === 'asignadas' && 'Las instalaciones asignadas aparecerán aquí'}
                {filtroEstatus === 'completadas' && 'Las instalaciones completadas aparecerán aquí'}
              </Typography>
            </Paper>
          ) : (
            instalacionesFiltradas.map((inst) => (
              <Card key={inst.id} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' }, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Folio #{inst.id}
                    </Typography>
                    <Chip
                      label={getEstadoTecnico(inst.estado)}
                      color={getEstadoColor(inst.estado)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    {inst.contrato?.nombre_completo}
                  </Typography>

                  {inst.estado === ESTADOS.ACEPTADA && inst.fecha_aceptacion && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                      <Cronometro desde={inst.fecha_aceptacion} etiqueta="En camino" color="#1d4ed8" />
                      {inst.eta_minutos && (
                        <Typography variant="caption" sx={{ color: '#1e40af' }}>
                          Estimado de llegada: {inst.eta_minutos} min
                        </Typography>
                      )}
                    </Box>
                  )}

                  {inst.estado === ESTADOS.EN_SITIO && inst.fecha_llegada && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                      <Cronometro desde={inst.fecha_llegada} etiqueta="Tiempo de instalación" color="#15803d" />
                      {inst.duracion_traslado_seg != null && (
                        <Typography variant="caption" sx={{ color: '#166534' }}>
                          Traslado: {formatearDuracion(inst.duracion_traslado_seg)}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {esCompletada(inst.estado) && inst.duracion_instalacion_seg != null && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Duró {formatearDuracion(inst.duracion_instalacion_seg)} en sitio
                      </Typography>
                      {inst.duracion_traslado_seg != null && (
                        <Typography variant="caption" color="text.secondary">
                          Traslado: {formatearDuracion(inst.duracion_traslado_seg)}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.nombre_completo}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.telefono1}</Typography>
                    </Box>
                    {inst.contrato?.correo && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2">{inst.contrato.correo}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{inst.contrato?.calle_numero}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d4ed8' }}>
                        {inst.fecha_programada 
                          ? formatFecha(inst.fecha_programada)
                          : 'Fecha por definir'}
                        {inst.hora_asignada && ` - ${inst.hora_asignada}`}
                      </Typography>
                    </Box>

                    {filtroEstatus === 'completadas' && inst.fecha_completada && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle fontSize="small" color="success" />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                          Completada el: {formatFechaHora(inst.fecha_completada)}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assignment fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Plan:</strong> {inst.contrato?.plan_contratado}
                      </Typography>
                    </Box>
                  </Stack>

                  {inst.nota_atencion_clientes && (
                    <Alert icon={<ReportProblem fontSize="inherit" />} severity="warning" sx={{ mt: 2, fontSize: '0.85rem' }}>
                      <strong>Nota de ATC:</strong> {inst.nota_atencion_clientes}
                    </Alert>
                  )}
                  
                  {inst.observaciones_tecnico && filtroEstatus === 'completadas' && (
                    <Alert severity="info" sx={{ mt: 1, fontSize: '0.85rem' }}>
                      <strong>Mi reporte:</strong> {inst.observaciones_tecnico}
                    </Alert>
                  )}
                </CardContent>

                <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {!esCompletada(inst.estado) && inst.estado !== ESTADOS.ACEPTADA && inst.estado !== ESTADOS.EN_SITIO && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="primary"
                      startIcon={<ThumbUp />}
                      onClick={() => handleAceptar(inst)}
                      disabled={procesando}
                      sx={{ py: 1.5 }}
                    >
                      {procesando ? 'Aceptando...' : 'Aceptar y Ver Ruta'}
                    </Button>
                  )}

                  {inst.estado === ESTADOS.ACEPTADA && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="primary"
                      startIcon={<Navigation />}
                      onClick={() => handleVerRuta(inst)}
                      sx={{ py: 1.5 }}
                    >
                      Ver Ruta / Ya Llegué
                    </Button>
                  )}

                  <Button
                    variant={inst.estado === ESTADOS.EN_SITIO ? 'contained' : 'outlined'}
                    fullWidth
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleEjecutar(inst)}
                    sx={{ py: 1.5 }}
                    disabled={esCompletada(inst.estado)}
                  >
                    {esCompletada(inst.estado) ? 'Finalizado' : 'Ejecutar Instalación'}
                  </Button>
                </Box>
              </Card>
            ))
          )}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Build color="primary" />
            {vistaAdmin ? 'Ver Instalación' : 'Ejecutar Instalación'} - Folio #{instalacionSeleccionada?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          {instalacionSeleccionada && (
            <Box sx={{ pt: 2 }}>
              
              {instalacionSeleccionada.nota_atencion_clientes && (
                <Alert icon={<ReportProblem fontSize="inherit" />} severity="warning" sx={{ mb: 3 }}>
                  <strong>Instrucciones de Oficina:</strong> {instalacionSeleccionada.nota_atencion_clientes}
                </Alert>
              )}

              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Cliente:</strong> {instalacionSeleccionada.contrato?.nombre_completo}<br/>
                <strong>Técnico:</strong> {instalacionSeleccionada.tecnico_nombre}<br/>
                <strong>Fecha Programada:</strong> {instalacionSeleccionada.fecha_programada 
                  ? formatFecha(instalacionSeleccionada.fecha_programada)
                  : 'Sin programar'}<br/>
                <strong>Estado:</strong> {instalacionSeleccionada.estado}
              </Alert>

              {/* El cronómetro de instalación arranca con la marca de llegada. Si el
                  técnico cierra la orden sin marcarla, no queda tiempo registrado y
                  la oficina ve "sin medición" sin poder recuperarlo después. */}
              {!vistaAdmin && !esCompletada(instalacionSeleccionada.estado) && !instalacionSeleccionada.fecha_llegada && (
                <Alert
                  severity="warning"
                  icon={<Flag fontSize="inherit" />}
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      disabled={procesando}
                      onClick={async () => {
                        setEnCurso(instalacionSeleccionada);
                        await handleMarcarLlegada(instalacionSeleccionada);
                      }}
                    >
                      {procesando ? 'Registrando...' : 'Marcar llegada'}
                    </Button>
                  }
                >
                  No has marcado tu llegada. Si completas así, <strong>no se registrará
                  cuánto tardó la instalación</strong>.
                </Alert>
              )}

              {instalacionSeleccionada.fecha_llegada && !esCompletada(instalacionSeleccionada.estado) && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Cronometro desde={instalacionSeleccionada.fecha_llegada} etiqueta="Tiempo de instalación" color="#15803d" />
                </Box>
              )}

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Detalles de la Instalación
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Cliente"
                    value={instalacionSeleccionada.contrato?.nombre_completo}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    fullWidth
                    label="Teléfono"
                    value={instalacionSeleccionada.contrato?.telefono1}
                    InputProps={{ readOnly: true }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Dirección"
                  value={instalacionSeleccionada.contrato?.calle_numero}
                  InputProps={{ readOnly: true }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Plan"
                    value={instalacionSeleccionada.contrato?.plan_contratado}
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    fullWidth
                    label="Fecha/Hora"
                    value={`${instalacionSeleccionada.fecha_programada 
                      ? formatFechaCorta(instalacionSeleccionada.fecha_programada)
                      : 'N/A'} ${instalacionSeleccionada.hora_asignada || ''}`}
                    InputProps={{ readOnly: true }}
                  />
                </Box>

                {/* Aviso que dejó ventas al capturar el contrato: casi siempre
                    es qué hay que pedirle al cliente durante la visita. Va antes
                    del checklist para que se lea al abrir, no al cerrar. */}
                {instalacionSeleccionada.contrato?.notas && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                      Nota de ventas
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {instalacionSeleccionada.contrato.notas}
                    </Typography>
                  </Alert>
                )}

                {!vistaAdmin && instalacionSeleccionada.estado !== 'Completado' && instalacionSeleccionada.estado !== 'Completada' && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Checklist de Instalación
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.verificar_equipos}
                          onChange={(e) => setFormData({ ...formData, verificar_equipos: e.target.checked })}
                        />
                      }
                      label="Verificar equipos"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.tendido_cable}
                          onChange={(e) => setFormData({ ...formData, tendido_cable: e.target.checked })}
                        />
                      }
                      label="Tendido de cable correcto"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.config_ont}
                          onChange={(e) => setFormData({ ...formData, config_ont: e.target.checked })}
                        />
                      }
                      label="Configuración de ONT completada"
                    />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Serial ONT *"
                        value={formData.serial_ont}
                        onChange={(e) => setFormData({ ...formData, serial_ont: e.target.value })}
                        required
                      />
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Metraje de Fibra (metros) *"
                        type="number"
                        value={formData.metraje_fibra}
                        onChange={(e) => setFormData({ ...formData, metraje_fibra: e.target.value })}
                        required
                      />
                      <TextField
                        sx={{ flex: '1 1 250px' }}
                        label="Potencia (dBm) *"
                        value={formData.potencia_dbm}
                        onChange={(e) => setFormData({ ...formData, potencia_dbm: e.target.value })}
                        required
                      />
                    </Box>

                    {/* Ventas puede levantar el contrato sin comprobante de
                        domicilio; en ese caso el técnico lo captura aquí y es
                        obligatorio para poder completar. */}
                    {!instalacionSeleccionada.contrato?.foto_recibo_luz && (
                      <Box sx={{ p: 1.5, bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Comprobante de domicilio *
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Ventas no lo capturó: pídeselo al cliente y tómale foto (o sube el PDF).
                        </Typography>
                        <BotonEvidencia
                          etiqueta={formData.foto_comprobante ? 'Comprobante Cargado' : 'Subir Comprobante'}
                          cargada={Boolean(formData.foto_comprobante)}
                          permitirPdf
                          color="warning"
                          fullWidth
                          onArchivo={(dataUri) => { setFormData(prev => ({ ...prev, foto_comprobante: dataUri })); setError(''); }}
                          onError={(mensaje) => setError(mensaje)}
                        />
                      </Box>
                    )}

                    <TextField
                      multiline
                      rows={3}
                      fullWidth
                      label="Mis Observaciones (Reporte Técnico)"
                      placeholder="Ej: Se utilizaron 5 metros extra de cable..."
                      value={formData.notas_instalacion}
                      onChange={(e) => setFormData({ ...formData, notas_instalacion: e.target.value })}
                    />
                  </>
                )}
                
                {(instalacionSeleccionada.estado === 'Completado' || instalacionSeleccionada.estado === 'Completada') && (
                  <>
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Esta instalación ya fue completada.
                      {instalacionSeleccionada.fecha_completada && (
                         <span> (Registrada: {formatFechaHora(instalacionSeleccionada.fecha_completada)})</span>
                      )}
                    </Alert>
                    
                    {instalacionSeleccionada.observaciones_tecnico && (
                      <TextField
                        multiline
                        rows={3}
                        fullWidth
                        label="Reporte Técnico Guardado"
                        value={instalacionSeleccionada.observaciones_tecnico}
                        InputProps={{ readOnly: true }}
                        sx={{ mt: 2 }}
                      />
                    )}
                  </>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
          {!vistaAdmin && instalacionSeleccionada?.estado !== 'Completado' && instalacionSeleccionada?.estado !== 'Completada' && (
            <Button onClick={handleCompletar} variant="contained" color="success" startIcon={<CheckCircle />}>
              Completar Instalación
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={rutaOpen}
        onClose={() => setRutaOpen(false)}
        maxWidth="md"
        fullWidth
        // En el celular la navegación se usa a pantalla completa: el mapa a
        // media pantalla no alcanza para ver el camino que viene.
        fullScreen={enTelefono && yendoAlDomicilio}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Navigation color="primary" />
            Ruta al domicilio — Folio #{enCurso?.id}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {enCurso && (
            <Stack spacing={2}>
              {/* Primero la instrucción del giro: es lo único que alcanza a
                  mirar el técnico mientras maneja. */}
              {yendoAlDomicilio && posicion && (
                <BannerNavegacion
                  maniobra={navegacion.maniobra}
                  distanciaM={navegacion.distanciaManiobraM}
                  restanteM={navegacion.restanteM}
                  minutosRestantes={navegacion.minutosRestantes}
                  calculando={navegacion.calculando}
                  fueraDeRuta={navegacion.fueraDeRuta}
                  llego={navegacion.llego}
                  vozActiva={vozActiva}
                  onToggleVoz={() => setVozActiva((activa) => !activa)}
                />
              )}

              <MapaRutaInstalacion
                origen={posicion}
                destino={enCurso.destino}
                etiquetaDestino={enCurso.contrato?.calle_numero || 'Domicilio del cliente'}
                alturaMapa={yendoAlDomicilio && posicion ? (enTelefono ? 400 : 380) : 340}
                modoNavegacion={yendoAlDomicilio}
                rutaPrecalculada={yendoAlDomicilio ? navegacion.ruta : null}
              />

              {/* Contexto no seguro: Chrome bloquea el GPS sin avisar nada, así que
                  hay que decirlo explícitamente o parece que "el GPS no funciona". */}
              {motivoGps && (
                <Alert severity="error">
                  <strong>Tu ubicación está bloqueada.</strong> {motivoGps}
                </Alert>
              )}

              {!motivoGps && errorGps && (
                <Alert severity="warning">
                  No se puede leer tu GPS ({errorGps}). Activa la ubicación para que la
                  oficina vea por dónde vas y para poder trazar la ruta.
                </Alert>
              )}

              {!motivoGps && !posicion && (
                <Alert
                  severity="warning"
                  action={
                    <Button color="inherit" size="small" onClick={handleCompartirUbicacion} disabled={procesando}>
                      {procesando ? 'Buscando...' : 'Compartir ahora'}
                    </Button>
                  }
                >
                  Todavía no se comparte tu ubicación, así que no se puede trazar la ruta.
                </Alert>
              )}

              <Alert severity="info">
                <strong>{enCurso.contrato?.nombre_completo}</strong><br />
                {enCurso.contrato?.calle_numero}
                {enCurso.contrato?.telefono1 && <> · Tel. {enCurso.contrato.telefono1}</>}
              </Alert>

              {enCurso.estado === ESTADOS.ACEPTADA && enCurso.fecha_aceptacion && (
                <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                  <Cronometro desde={enCurso.fecha_aceptacion} etiqueta="En camino" color="#1d4ed8" />
                </Box>
              )}

              {enCurso.estado === ESTADOS.EN_SITIO && enCurso.fecha_llegada && (
                <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Cronometro desde={enCurso.fecha_llegada} etiqueta="Tiempo de instalación" color="#15803d" />
                  <Typography variant="caption" sx={{ color: '#166534' }}>
                    El tiempo sigue corriendo aunque cierres la app.
                  </Typography>
                </Box>
              )}

              {/* Por qué está bloqueado el botón de llegada. El texto se queda
                  aunque no haya salida de emergencia: sin él, el técnico solo
                  vería un botón muerto y sin explicación. */}
              {enCurso.estado === ESTADOS.ACEPTADA && !puedeMarcarLlegada && (
                <Alert
                  severity="info"
                  icon={<Flag fontSize="inherit" />}
                  action={PERMITIR_LLEGADA_LEJOS ? (
                    <Button color="inherit" size="small" onClick={handleLlegadaLejos} disabled={procesando}>
                      Ya estoy aquí
                    </Button>
                  ) : null}
                >
                  Estás a <strong>{formatearDistancia(navegacion.distanciaDestinoM)}</strong> del
                  domicilio. Podrás empezar el trabajo cuando llegues (menos de{' '}
                  {formatearDistancia(navegacion.radioLlegadaM)}).
                  {PERMITIR_LLEGADA_LEJOS && ' Si tu GPS no es preciso, avisa con el botón y quedará registrado.'}
                </Alert>
              )}

              {enCurso.estado === ESTADOS.ACEPTADA && (
                <Alert severity="warning" icon={<NotificationsActive />}>
                  Mientras vas en camino, tu ubicación se comparte con la oficina y el
                  sistema te avisará si te detienes o te pasas del tiempo estimado.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRutaOpen(false)}>Cerrar</Button>
          {enCurso?.estado === ESTADOS.ACEPTADA && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Flag />}
              // Envuelto a propósito: pasar la función directa mandaría el evento
              // del clic como primer argumento y se tomaría por la instalación.
              onClick={() => handleMarcarLlegada()}
              disabled={procesando || !puedeMarcarLlegada}
            >
              {procesando ? 'Registrando...' : 'Ya llegué, empezar trabajo'}
            </Button>
          )}
          {enCurso?.estado === ESTADOS.EN_SITIO && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => { setRutaOpen(false); handleEjecutar(enCurso); }}
            >
              Completar Instalación
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(alertaActiva)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#b45309' }}>
          <NotificationsActive color="warning" />
          {alertaActiva?.tipo === 'demora' ? 'Vas retrasado' : '¿Sigues en camino?'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>{alertaActiva?.mensaje}</Alert>
          <Typography variant="body2" color="text.secondary">
            La oficina ya tiene registro de este aviso. Responde para que sepan tu situación.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => responderAlerta('Con problema en el camino')} color="inherit">
            Tengo un problema
          </Button>
          <Button
            variant="contained"
            startIcon={<ThumbUp />}
            onClick={() => responderAlerta('Sigo en camino')}
          >
            Sí, sigo en camino
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default TecnicoEjecucion;