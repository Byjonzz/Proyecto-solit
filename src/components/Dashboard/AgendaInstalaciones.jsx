import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Chip, TextField, MenuItem, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Grid,
  Card, Divider, CircularProgress, Badge, Tooltip
} from '@mui/material';
import {
  CalendarMonth, Close, EventAvailableOutlined, AssignmentOutlined,
  PieChartOutlined, BarChartOutlined, Pending, AssignmentTurnedIn,
  CheckCircle, Edit, Visibility, CreditCard, Receipt, Home, Schedule,
  CommentOutlined,ZoomIn, RotateRight, Navigation, NotificationsActive,
  Timer, Flag, ThumbUp, Cancel, ReportProblem, PictureAsPdf, OpenInNew, Block
} from '@mui/icons-material';
import { useContratos } from '../../hooks/useContratos';
import api from '../../services/api';
import MapaRutaInstalacion from './MapaRutaInstalacion';
import { aPuntoNumerico } from '../../utils/geo';
import { formatearDuracion } from '../../services/rutaService';
import { ESTADOS } from '../../services/instalacionesSeguimientoService';
import {
  revisionContratosService, MOTIVOS_RECHAZO, MOTIVOS_CANCELACION
} from '../../services/revisionContratosService';
import { esPdf } from '../../utils/evidencias';


const MS_REFRESCO_SEGUIMIENTO = 2000;

const AgendaInstalaciones = () => {
  const {
    contratos,
    loading,
    error,
    asignarCita,
    refetchPendientes,
    refetchPendientesSilencioso
  } = useContratos();

  const [tecnicosBD, setTecnicosBD] = useState([]);
  const [loadingTecnicos, setLoadingTecnicos] = useState(false);
  const [instalacionesBD, setInstalacionesBD] = useState([]);
  const [ultimaRecarga, setUltimaRecarga] = useState(null);

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(''); 
  const [tecnico, setTecnico] = useState('');
  const [mensajeExito, setMensajeExito] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState(null);
  
  const [dialogoEditarOpen, setDialogoEditarOpen] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  
  const [dialogoEditarTecnicoOpen, setDialogoEditarTecnicoOpen] = useState(false);
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');

  const [dialogoReprogramarOpen, setDialogoReprogramarOpen] = useState(false);
  const [guardandoReprogramacion, setGuardandoReprogramacion] = useState(false);

  const [dialogoNotasOpen, setDialogoNotasOpen] = useState(false);
  const [notaInstalacion, setNotaInstalacion] = useState('');
  const [guardandoNotas, setGuardandoNotas] = useState(false);

  const [datosEditar, setDatosEditar] = useState({
    nombre_completo: '',
    telefono1: '',
    correo: '',
    calle_numero: '',
    plan_contratado: '',
    nota: ''
  });

  const [visorImagen, setVisorImagen] = useState({ open: false, url: '', rotacion: 0, titulo: '' });

  const handleAbrirVisor = (url, titulo) => {
    setVisorImagen({ open: true, url, rotacion: 0, titulo });
  };

  const handleCerrarVisor = () => {
    setVisorImagen({ open: false, url: '', rotacion: 0, titulo: '' });
  };

  const handleRotarImagen = () => {
    setVisorImagen(prev => ({ ...prev, rotacion: prev.rotacion + 90 }));
  };

  const renderImagenClickeable = (url, titulo) => {
    if (!url) return <Typography variant="body2" color="text.secondary">Sin foto</Typography>;

    if (esPdf(url)) {
      return (
        <Box sx={{
          p: 2, borderRadius: 2, border: '1px solid #cbd5e1', bgcolor: '#fef2f2',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1
        }}>
          <PictureAsPdf sx={{ fontSize: 44, color: '#dc2626' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b' }}>
            Comprobante en PDF
          </Typography>
          <Button size="small" startIcon={<OpenInNew />} onClick={() => handleAbrirVisor(url, titulo)}
            sx={{ textTransform: 'none' }}>
            Abrir para revisar
          </Button>
        </Box>
      );
    }

    return (
      <Box
        onClick={() => handleAbrirVisor(url, titulo)}
        sx={{ 
          position: 'relative', cursor: 'pointer', display: 'inline-block', width: '100%',
          '&:hover .zoom-icon': { opacity: 1 },
          '&:hover img': { opacity: 0.6 }
        }}
      >
        <img 
          src={url} 
          alt={titulo} 
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #cbd5e1', objectFit: 'contain', transition: '0.3s' }} 
        />
        <ZoomIn className="zoom-icon" sx={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#1d4ed8', fontSize: 48, opacity: 0, transition: '0.3s', bgcolor: 'rgba(255,255,255,0.8)', borderRadius: '50%', p: 1, boxShadow: 3
        }} />
      </Box>
    );
  };

  const [filtroEstatus, setFiltroEstatus] = useState('pendientes');

  const [ordenRechazo, setOrdenRechazo] = useState(null);
  const [motivosMarcados, setMotivosMarcados] = useState([]);
  const [motivoLibre, setMotivoLibre] = useState('');
  const [rechazando, setRechazando] = useState(false);

  const handleAbrirRechazo = (orden) => {
    setOrdenRechazo(orden);
    setMotivosMarcados([]);
    setMotivoLibre('');
    setErrorAsignacion(null);
  };

  const toggleMotivo = (clave) => {
    setMotivosMarcados(prev =>
      prev.includes(clave) ? prev.filter(m => m !== clave) : [...prev, clave]
    );
  };

  const handleConfirmarRechazo = async () => {
    if (!ordenRechazo) return;

  
    const textos = MOTIVOS_RECHAZO
      .filter(m => motivosMarcados.includes(m.clave))
      .map(m => m.etiqueta);
    if (motivoLibre.trim()) textos.push(motivoLibre.trim());

    // Vale con marcar una casilla o con escribir el motivo: lo que no vale es
    // devolver el contrato sin decir qué corregir.
    if (textos.length === 0) {
      setErrorAsignacion('Marca un motivo o escribe por qué lo regresas: es lo único que verá el canvaceador.');
      return;
    }

    setRechazando(true);
    setErrorAsignacion(null);
    try {
      await revisionContratosService.rechazar(ordenRechazo.contrato_id, textos.join(' · '));
      setOrdenRechazo(null);
      setMensajeExito(true);
      await Promise.all([refetchPendientesSilencioso(), cargarInstalacionesReales()]);
    } catch (err) {
      setErrorAsignacion('No se pudo rechazar el contrato: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRechazando(false);
    }
  };

  const [ordenCancelacion, setOrdenCancelacion] = useState(null);
  const [motivosCancelacion, setMotivosCancelacion] = useState([]);
  const [motivoCancelacionLibre, setMotivoCancelacionLibre] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const handleAbrirCancelacion = (orden) => {
    setOrdenCancelacion(orden);
    setMotivosCancelacion([]);
    setMotivoCancelacionLibre('');
    setErrorAsignacion(null);
  };

  const toggleMotivoCancelacion = (clave) => {
    setMotivosCancelacion(prev =>
      prev.includes(clave) ? prev.filter(m => m !== clave) : [...prev, clave]
    );
  };

  const handleConfirmarCancelacion = async () => {
    if (!ordenCancelacion) return;

    const textos = MOTIVOS_CANCELACION
      .filter(m => motivosCancelacion.includes(m.clave))
      .map(m => m.etiqueta);
    if (motivoCancelacionLibre.trim()) textos.push(motivoCancelacionLibre.trim());

    // Vale con marcar una casilla o con escribirlo. Lo que no vale es cancelar
    // sin motivo: dentro de tres meses nadie sabría por qué se cayó esta venta.
    if (textos.length === 0) {
      setErrorAsignacion('Marca un motivo o escribe por qué se cayó: es lo único que queda del contrato como registro.');
      return;
    }

    setCancelando(true);
    setErrorAsignacion(null);
    try {
      await revisionContratosService.cancelar(ordenCancelacion.contrato_id, textos.join(' · '));
      setOrdenCancelacion(null);
      setMensajeExito(true);
      await Promise.all([refetchPendientesSilencioso(), cargarInstalacionesReales()]);
    } catch (err) {
      setErrorAsignacion('No se pudo cancelar el contrato: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCancelando(false);
    }
  };

  const [seguimientoOrden, setSeguimientoOrden] = useState(null);
  const [buscandoPosicion, setBuscandoPosicion] = useState(false);
  const handleAbrirSeguimiento = async (orden) => {
    setSeguimientoOrden(orden);
    setBuscandoPosicion(true);
    try {
      await cargarInstalacionesReales();
    } finally {
      setBuscandoPosicion(false);
    }
  };

  
  const recargaEnVueloRef = useRef(false);

  useEffect(() => {
    if (!seguimientoOrden) return;

    const timer = setInterval(async () => {
      if (recargaEnVueloRef.current || document.hidden) return;
      recargaEnVueloRef.current = true;
      try {
        await cargarInstalacionesReales();
      } finally {
        recargaEnVueloRef.current = false;
      }
    }, MS_REFRESCO_SEGUIMIENTO);

    return () => clearInterval(timer);
  }, [seguimientoOrden]);

  const etiquetaEstadoTecnico = (estatus) => {
    if (estatus === ESTADOS.ACEPTADA) return 'Aceptada · en camino';
    if (estatus === ESTADOS.EN_SITIO) return 'En sitio · instalando';
    return 'Sin aceptar';
  };

  const colorEstadoTecnico = (estatus) => {
    if (estatus === ESTADOS.ACEPTADA) return 'primary';
    if (estatus === ESTADOS.EN_SITIO) return 'secondary';
    return 'default';
  };
  const minutosDesde = (iso) => {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  };

  const formatFecha = (fecha) => {
    if (!fecha) return null;
    const fechaSegura = fecha.includes('T') ? fecha : `${fecha}T12:00:00`;
    return new Date(fechaSegura).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      hour12: true,
      // La operación es en México: fija la zona para que la hora no dependa
      // del reloj de la computadora desde donde se consulte.
      timeZone: 'America/Mexico_City'
    });
  };

  useEffect(() => {
    refetchPendientes();
    cargarTecnicosReales();
    cargarInstalacionesReales();
  }, []);

 
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      await Promise.all([
        refetchPendientesSilencioso(),
        cargarInstalacionesReales()
      ]);
      setUltimaRecarga(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const cargarInstalacionesReales = async () => {
    try {
      const res = await api.get('/instalaciones/');
      setInstalacionesBD(res.data);
    } catch (err) {
      console.error("Error al cargar la tabla de instalaciones:", err);
    }
  };

  const cargarTecnicosReales = async () => {
    setLoadingTecnicos(true);
    try {
      const res = await api.get('/usuarios/?rol=Tecnico');
      setTecnicosBD(res.data);
    } catch (error) {
      try {
        const res2 = await api.get('/usuarios/');
        const tecnicosFiltrados = res2.data.filter(u => u.rol && u.rol.toLowerCase() === 'tecnico');
        setTecnicosBD(tecnicosFiltrados);
      } catch (err2) {
        console.error("Error al cargar técnicos:", err2);
      }
    } finally {
      setLoadingTecnicos(false);
    }
  };

  const ordenes = contratos.map(contrato => {
    const instalacionDB = instalacionesBD.find(inst => inst.contrato_id === contrato.id);

    return {
      id: contrato.id || `C-${contrato.id}`,
      cliente: contrato.nombre_completo,
      plan: contrato.plan_contratado,
      direccion: contrato.calle_numero,
      estatus: instalacionDB?.estado || contrato.estatus,
      contrato_id: contrato.id,
      instalacion_id: instalacionDB?.id || contrato.instalacion?.id || null, 
      fecha_programada: instalacionDB?.fecha_programada || contrato.fecha_programada || contrato.fecha_asignacion || '', 
      hora_asignada: instalacionDB?.hora_asignada || contrato.hora_asignada || contrato.instalacion?.hora_asignada || '', 
      fecha_completada: instalacionDB?.fecha_completada || null,
      
      fecha_creacion_contrato: contrato.fecha_creacion || contrato.created_at || contrato.fecha_registro || null,
      creado_por_nombre: contrato.creado_por_nombre || null,
      
      telefono: contrato.telefono1,
      correo: contrato.correo,
      nota: instalacionDB?.nota || contrato.nota_logistica || '',
      notas_contrato: contrato.notas || '',
      tecnico_id: instalacionDB?.tecnico_id || contrato.tecnico_id,
      foto_ine_frente: contrato.foto_ine_frente || null,
      foto_ine_reverso: contrato.foto_ine_reverso || null,
      foto_recibo_luz: contrato.foto_recibo_luz || null,
      foto_fachada: contrato.foto_fachada || null,

      fecha_aceptacion: instalacionDB?.fecha_aceptacion || null,
      fecha_llegada: instalacionDB?.fecha_llegada || null,
      eta_minutos: instalacionDB?.eta_minutos || null,
      duracion_traslado_seg: instalacionDB?.duracion_traslado_seg ?? null,
      duracion_instalacion_seg: instalacionDB?.duracion_instalacion_seg ?? null,
      ubicacion_actualizada: instalacionDB?.ubicacion_actualizada || null,
      posicion_tecnico: (instalacionDB?.lat_tecnico != null && instalacionDB?.lng_tecnico != null)
        ? { lat: instalacionDB.lat_tecnico, lng: instalacionDB.lng_tecnico }
        : null,
      alertas: instalacionDB?.alertas || [],
      alertas_pendientes: instalacionDB?.alertas_pendientes || 0,

      destino: aPuntoNumerico(contrato.coordenadas_gps)
    };
  });

  const esAsignada = (estatus) => [
    'Asignado', 'Programada', 'En Proceso', ESTADOS.ACEPTADA, ESTADOS.EN_SITIO
  ].includes(estatus);

  const ordenesFiltradas = ordenes.filter(orden => {
    switch (filtroEstatus) {
      case 'pendientes':
        return orden.estatus === 'Pendiente Asignar' || orden.estatus === 'Pendiente';
      case 'asignadas':
        return esAsignada(orden.estatus);
      case 'completadas':
        return orden.estatus === 'Completado' || orden.estatus === 'Completada';
      default:
        return true;
    }
  });

  // Columnas visibles según el filtro; la usan los colSpan de la tabla.
  const totalColumnas = filtroEstatus === 'completadas' ? 9 : filtroEstatus === 'asignadas' ? 8 : 7;

  const ordenSeguimiento = seguimientoOrden
    ? (ordenes.find(o => o.instalacion_id === seguimientoOrden.instalacion_id) || seguimientoOrden)
    : null;

  const totalPendientes = ordenes.filter(o => o.estatus === 'Pendiente Asignar' || o.estatus === 'Pendiente').length;
  const totalAsignadas = ordenes.filter(o => esAsignada(o.estatus)).length;
  const totalCompletadas = ordenes.filter(o => o.estatus === 'Completado' || o.estatus === 'Completada').length;
  const totalGeneral = totalPendientes + totalAsignadas + totalCompletadas;

  const datosPastelDinamico = [
    { label: 'Completadas', value: totalCompletadas, color: '#10b981' },
    { label: 'Asignadas', value: totalAsignadas, color: '#3b82f6' },
    { label: 'Pendientes', value: totalPendientes, color: '#f59e0b' }
  ].filter(d => d.value > 0); 

  let currentPct = 0;
  const conicGradient = datosPastelDinamico.length > 0 
    ? datosPastelDinamico.map(d => {
        const pct = (d.value / totalGeneral) * 100;
        const start = currentPct;
        const end = currentPct + pct;
        currentPct = end;
        return `${d.color} ${start}% ${end}%`;
      }).join(', ')
    : '#e2e8f0 0% 100%'; 

  const conteoDias = { 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0 };
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  ordenes.forEach(orden => {
    if (orden.fecha_programada) {
      const partes = orden.fecha_programada.split('T')[0].split('-');
      if (partes.length === 3) {
        const objFecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const diaNombre = nombresDias[objFecha.getDay()];
        conteoDias[diaNombre]++;
      }
    }
  });

  const ordenDiasMostrar = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const valorMaximoBarras = Math.max(...ordenDiasMostrar.map(d => conteoDias[d]), 1); 

  const datosBarrasDinamicos = ordenDiasMostrar.map(dia => ({
    dia,
    cantidad: conteoDias[dia],
    altura: `${(conteoDias[dia] / valorMaximoBarras) * 100}%`
  }));

  const handleAbrirModal = (orden) => {
    setOrdenSeleccionada(orden);
    setFecha(orden.fecha_programada || ''); 
    setHora(orden.hora_asignada || ''); 
    setTecnico(orden.tecnico_id || '');    
    setNotaInstalacion(orden.nota || ''); 
    setMensajeExito(false);
    setErrorAsignacion(null);
  };

  const handleCerrarModal = () => setOrdenSeleccionada(null);

  const handleAbrirEditar = (orden) => {
    setOrdenSeleccionada(orden);
    setDatosEditar({
      nombre_completo: orden.cliente || '',
      telefono1: orden.telefono || '',
      correo: orden.correo || '',
      calle_numero: orden.direccion || '',
      plan_contratado: orden.plan || '',
      nota: orden.nota || ''
    });
    setErrorAsignacion(null);
    setDialogoEditarOpen(true);
  };

  const handleCerrarEditar = () => {
    setDialogoEditarOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleAbrirEditarTecnico = (orden) => {
    setOrdenSeleccionada(orden);
    setTecnicoAsignado(orden.tecnico_id || '');
    setErrorAsignacion(null);
    setDialogoEditarTecnicoOpen(true);
  };

  const handleCerrarEditarTecnico = () => {
    setDialogoEditarTecnicoOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleAbrirReprogramar = (orden) => {
    setOrdenSeleccionada(orden);
    setFecha(orden.fecha_programada || '');
    setHora(orden.hora_asignada || '');
    setErrorAsignacion(null);
    setDialogoReprogramarOpen(true);
  };

  const handleCerrarReprogramar = () => {
    setDialogoReprogramarOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleAbrirNotas = (orden) => {
    setOrdenSeleccionada(orden);
    setNotaInstalacion(orden.nota || '');
    setErrorAsignacion(null);
    setDialogoNotasOpen(true);
  };

  const handleCerrarNotas = () => {
    setDialogoNotasOpen(false);
    setOrdenSeleccionada(null);
    setErrorAsignacion(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDatosEditar(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarEdicion = async () => {
    if (!datosEditar.nombre_completo.trim()) {
      setErrorAsignacion("El nombre completo es obligatorio");
      return;
    }
    
    setGuardandoEdicion(true);
    try {
      const datosContrato = {
        nombre_completo: datosEditar.nombre_completo,
        telefono1: datosEditar.telefono1,
        correo: datosEditar.correo,
        calle_numero: datosEditar.calle_numero,
        plan_contratado: datosEditar.plan_contratado,
        // El contrato guarda la nota siempre; la instalación es solo una copia
        // para el técnico y puede no existir todavía.
        nota_logistica: datosEditar.nota
      };

      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, datosContrato);

      if (ordenSeleccionada.instalacion_id) {
         await api.patch(`/instalaciones/${ordenSeleccionada.instalacion_id}/`, { 
           nota: datosEditar.nota 
         });
      }

      setMensajeExito(true);
      handleCerrarEditar();
      refetchPendientes();
      cargarInstalacionesReales();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      console.error("Error al guardar:", err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Django rechazó los datos: ${errorMsg}`);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleGuardarNotas = async (e) => {
    e.preventDefault();
    setErrorAsignacion(null);
    setGuardandoNotas(true);

    try {
      // La nota va siempre al contrato: si todavía no hay instalación (contrato
      // pendiente de agendar), es el único lugar donde puede vivir.
      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, {
        nota_logistica: notaInstalacion
      });

      if (ordenSeleccionada.instalacion_id) {
        await api.patch(`/instalaciones/${ordenSeleccionada.instalacion_id}/`, {
          nota: notaInstalacion
        });
      }

      setMensajeExito(true);
      handleCerrarNotas();
      refetchPendientes();
      cargarInstalacionesReales();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Error de Backend: ${errorMsg}`);
    } finally {
      setGuardandoNotas(false);
    }
  };

  const handleGuardarCambioTecnico = async () => {
    try {
      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, { 
        tecnico_id: tecnicoAsignado || null 
      });

      if (ordenSeleccionada.instalacion_id) {
        await api.patch(`/instalaciones/${ordenSeleccionada.instalacion_id}/`, { 
          tecnico_id: tecnicoAsignado || null 
        });
      }

      setMensajeExito(true);
      handleCerrarEditarTecnico();
      refetchPendientes();
      cargarInstalacionesReales();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Backend rechazó el técnico: ${errorMsg}`);
    }
  };

  const handleGuardarReprogramacion = async (e) => {
    e.preventDefault();
    setErrorAsignacion(null);

    if (!fecha || !hora) {
      setErrorAsignacion("Es obligatorio ingresar la nueva fecha y hora.");
      return;
    }

    setGuardandoReprogramacion(true);
    try {
      if (ordenSeleccionada.instalacion_id) {
        await api.patch(`/instalaciones/${ordenSeleccionada.instalacion_id}/`, {
          fecha_programada: fecha,
          hora_asignada: hora
        });
      } else {
        await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, {
          fecha_programada: fecha
        });
      }

      setMensajeExito(true);
      handleCerrarReprogramar();
      refetchPendientes();
      cargarInstalacionesReales();
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Error de Backend: ${errorMsg}`);
    } finally {
      setGuardandoReprogramacion(false);
    }
  };

  const handleGuardarAsignacion = async (e) => {
    e.preventDefault();
    setErrorAsignacion(null);
    
    if (!hora) {
      setErrorAsignacion("Es obligatorio asignar una hora para la instalación.");
      return;
    }

    try {
      if (ordenSeleccionada.instalacion_id) {
        await api.patch(`/instalaciones/${ordenSeleccionada.instalacion_id}/`, {
          tecnico_id: tecnico,
          fecha_programada: fecha,
          hora_asignada: hora,
          nota: notaInstalacion, 
          estado: 'Programada'
        });
      } else {
        const numeroOrdenGen = `ORD-${ordenSeleccionada.contrato_id}-${Math.floor(Date.now() / 1000)}`;
        await api.post('/instalaciones/', {
          contrato_id: ordenSeleccionada.contrato_id,
          tecnico_id: tecnico,
          numero_orden: numeroOrdenGen,
          fecha_programada: fecha,
          hora_asignada: hora,
          estado: 'Programada',
          nota: notaInstalacion 
        });
      }

      await api.patch(`/contratos/${ordenSeleccionada.contrato_id}/`, {
        estatus: 'Asignado',
        tecnico_id: tecnico,
        // Va en el mismo PATCH que ya se hacía: mantiene la copia del contrato
        // al día para que no se separe de la de la instalación.
        nota_logistica: notaInstalacion
      });

      setMensajeExito(true);
      handleCerrarModal();
      refetchPendientes();
      cargarInstalacionesReales(); 
      setTimeout(() => setMensajeExito(false), 3000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setErrorAsignacion(`Error de Backend: ${errorMsg}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando contratos pendientes...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Error al cargar contratos: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentOutlined color="primary" /> Mesa de Control y Asignación de Logística
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Asigna citas y gestiona las agendas de instalación técnica en campo.
        </Typography>
      </Box>

      {mensajeExito && (
        <Alert severity="success" onClose={() => setMensajeExito(false)} sx={{ borderRadius: 2 }}>
          ✅ Operación completada con éxito. El tablero se ha actualizado.
        </Alert>
      )}

      {errorAsignacion && (
        <Alert severity="error" onClose={() => setErrorAsignacion(null)} sx={{ borderRadius: 2 }}>
          {errorAsignacion}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>
            Filtrar por Estatus:
          </Typography>
          <Tooltip title="El tablero se actualiza solo cada 15 segundos">
            <Chip
              size="small"
              variant="outlined"
              icon={<RotateRight sx={{ fontSize: 16 }} />}
              label={
                ultimaRecarga
                  ? `Actualizado ${ultimaRecarga.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Actualización automática cada 15 s'
              }
              sx={{ color: '#64748b', borderColor: '#cbd5e1' }}
            />
          </Tooltip>
        </Box>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant={filtroEstatus === 'pendientes' ? 'contained' : 'outlined'}
            startIcon={<Pending />}
            onClick={() => setFiltroEstatus('pendientes')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'pendientes' ? '#f59e0b' : 'transparent',
              color: filtroEstatus === 'pendientes' ? 'white' : '#f59e0b',
              borderColor: '#f59e0b', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'pendientes' ? '#d97706' : 'rgba(245, 158, 11, 0.08)', borderColor: '#d97706' }
            }}
          >
            Pendientes ({totalPendientes})
          </Button>
          
          <Button
            variant={filtroEstatus === 'asignadas' ? 'contained' : 'outlined'}
            startIcon={<AssignmentTurnedIn />}
            onClick={() => setFiltroEstatus('asignadas')}
            sx={{ 
              minWidth: 160,
              bgcolor: filtroEstatus === 'asignadas' ? '#3b82f6' : 'transparent',
              color: filtroEstatus === 'asignadas' ? 'white' : '#3b82f6',
              borderColor: '#3b82f6', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'asignadas' ? '#2563eb' : 'rgba(59, 130, 246, 0.08)', borderColor: '#2563eb' }
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
              borderColor: '#10b981', borderWidth: 2, fontWeight: 700,
              '&:hover': { bgcolor: filtroEstatus === 'completadas' ? '#059669' : 'rgba(16, 185, 129, 0.08)', borderColor: '#059669' }
            }}
          >
            Completadas ({totalCompletadas})
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Folio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Plan Contratado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Dirección de Servicio</TableCell>
              
              <TableCell sx={{ fontWeight: 600 }}>
                {filtroEstatus === 'pendientes' ? 'Fecha de Venta' : 'Fecha/Hora Asignada'}
              </TableCell>
              
              {filtroEstatus === 'completadas' && (
                <TableCell sx={{ fontWeight: 600 }}>Finalizada</TableCell>
              )}

              {filtroEstatus === 'asignadas' && (
                <TableCell sx={{ fontWeight: 600 }}>Estado del Técnico</TableCell>
              )}

              {filtroEstatus === 'completadas' && (
                <TableCell sx={{ fontWeight: 600 }}>Tiempos</TableCell>
              )}

              <TableCell sx={{ fontWeight: 600 }}>Estatus</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumnas} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay contratos {filtroEstatus} para mostrar
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              ordenesFiltradas.map((orden) => (
                <React.Fragment key={orden.id}>
                {/* Con nota de ventas abajo, esta fila pierde su borde inferior
                    para que las dos se lean como un solo renglón. */}
                <TableRow
                  hover
                  sx={orden.notas_contrato ? { '& > td': { borderBottom: 'none' } } : undefined}
                >
                  <TableCell sx={{ fontWeight: 700, color: '#1d4ed8' }}>{orden.id}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{orden.cliente}</TableCell>
                  <TableCell>{orden.plan}</TableCell>
                  <TableCell>{orden.direccion}</TableCell>
                  
                  <TableCell>
                    {filtroEstatus === 'pendientes' ? (
                      <>
                        {orden.fecha_creacion_contrato ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                            {formatFechaHora(orden.fecha_creacion_contrato)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Sin fecha de venta</Typography>
                        )}
                        {orden.creado_por_nombre && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                            Capturó: {orden.creado_por_nombre}
                          </Typography>
                        )}
                      </>
                    ) : (
                      orden.fecha_programada ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d4ed8' }}>
                          {formatFecha(orden.fecha_programada)}
                          {orden.hora_asignada && (
                            <>
                              <br/>
                              <span style={{color: '#64748b', fontWeight: 400}}>
                                {orden.hora_asignada}
                              </span>
                            </>
                          )}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Sin programar</Typography>
                      )
                    )}
                  </TableCell>

                  {filtroEstatus === 'completadas' && (
                    <TableCell>
                      {orden.fecha_completada ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                          {formatFechaHora(orden.fecha_completada)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No registrada</Typography>
                      )}
                    </TableCell>
                  )}

                  {filtroEstatus === 'asignadas' && (
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Chip
                          label={etiquetaEstadoTecnico(orden.estatus)}
                          size="small"
                          color={colorEstadoTecnico(orden.estatus)}
                          sx={{ fontWeight: 600, width: 'fit-content' }}
                        />
                        {orden.estatus === ESTADOS.ACEPTADA && orden.fecha_aceptacion && (
                          <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 600 }}>
                            <Timer sx={{ fontSize: 13, verticalAlign: -2, mr: 0.3 }} />
                            {minutosDesde(orden.fecha_aceptacion)} min en camino
                            {orden.eta_minutos && ` / ~${orden.eta_minutos} est.`}
                          </Typography>
                        )}
                        {orden.estatus === ESTADOS.EN_SITIO && orden.fecha_llegada && (
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>
                            <Flag sx={{ fontSize: 13, verticalAlign: -2, mr: 0.3 }} />
                            {minutosDesde(orden.fecha_llegada)} min instalando
                          </Typography>
                        )}
                        {orden.alertas_pendientes > 0 && (
                          <Chip
                            size="small"
                            color="error"
                            icon={<NotificationsActive />}
                            label={`${orden.alertas_pendientes} alerta${orden.alertas_pendientes > 1 ? 's' : ''}`}
                            sx={{ fontWeight: 700, width: 'fit-content' }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  )}

                  {filtroEstatus === 'completadas' && (
                    <TableCell>
                      {orden.duracion_instalacion_seg != null ? (
                        <Stack spacing={0.3}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            Instalación: {formatearDuracion(orden.duracion_instalacion_seg)}
                          </Typography>
                          {orden.duracion_traslado_seg != null && (
                            <Typography variant="caption" color="text.secondary">
                              Traslado: {formatearDuracion(orden.duracion_traslado_seg)}
                            </Typography>
                          )}
                        </Stack>
                      ) : (
                        <Tooltip title={
                          !orden.instalacion_id
                            ? 'Este contrato no tiene registro de instalación, así que no se midió nada.'
                            : 'El cronómetro arranca cuando el técnico marca "Ya llegué". Sin esa marca no hay tiempo de instalación que calcular.'
                        }>
                          <Typography variant="caption" sx={{ color: '#b45309', fontStyle: 'italic' }}>
                            {!orden.instalacion_id
                              ? 'Sin registro de instalación'
                              : 'El técnico no marcó llegada'}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  )}

                  <TableCell>
                    <Chip
                      label={orden.estatus}
                      color={orden.estatus === 'Asignado' ? 'success' :
                             orden.estatus === 'Completado' || orden.estatus === 'Completada' ? 'success' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {filtroEstatus === 'pendientes' && (
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          variant="outlined" size="small" startIcon={<Visibility />}
                          onClick={() => handleAbrirEditar(orden)}
                          sx={{ 
                            textTransform: 'none', borderRadius: 1.5, color: '#3b82f6', borderColor: '#3b82f6',
                            '&:hover': { borderColor: '#2563eb', backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                          }}
                        >
                          Ver/Editar
                        </Button>
                        <Button
                          variant="outlined" size="small" startIcon={<Cancel />}
                          onClick={() => handleAbrirRechazo(orden)}
                          sx={{
                            textTransform: 'none', borderRadius: 1.5, color: '#ef4444', borderColor: '#ef4444',
                            '&:hover': { borderColor: '#dc2626', backgroundColor: 'rgba(239, 68, 68, 0.04)' }
                          }}
                        >
                          Rechazar
                        </Button>

                        {/* Gris y no rojo a propósito: cancelar no es un error
                            del canvaceador como el rechazo, es una venta que se
                            cayó. Y no vuelve: de aquí el contrato solo queda
                            archivado. */}
                        <Tooltip title="La venta se cayó: archiva el contrato como registro">
                          <Button
                            variant="outlined" size="small" startIcon={<Block />}
                            onClick={() => handleAbrirCancelacion(orden)}
                            sx={{
                              textTransform: 'none', borderRadius: 1.5, color: '#64748b', borderColor: '#94a3b8',
                              '&:hover': { borderColor: '#475569', backgroundColor: 'rgba(100, 116, 139, 0.04)' }
                            }}
                          >
                            Cancelar
                          </Button>
                        </Tooltip>

                        <Button
                          variant="contained" size="small" onClick={() => handleAbrirModal(orden)}
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Asignar Cita
                        </Button>
                      </Stack>
                    )}
                    
                    {filtroEstatus === 'asignadas' && (
                      <Stack direction="row" spacing={1} justifyContent="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Tooltip title={orden.destino ? 'Ver por dónde va el técnico' : 'El contrato no tiene coordenadas'}>
                          <span>
                            <Badge badgeContent={orden.alertas_pendientes || 0} color="error">
                              <Button
                                variant="outlined" size="small" startIcon={<Navigation />}
                                onClick={() => handleAbrirSeguimiento(orden)}
                                disabled={!orden.destino}
                                sx={{
                                  textTransform: 'none', borderRadius: 1.5, color: '#3b82f6', borderColor: '#3b82f6',
                                  '&:hover': { borderColor: '#2563eb', backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                                }}
                              >
                                Mapa
                              </Button>
                            </Badge>
                          </span>
                        </Tooltip>

                        <Button
                          variant="outlined" size="small" startIcon={<Schedule />} onClick={() => handleAbrirReprogramar(orden)}
                          sx={{ 
                            textTransform: 'none', borderRadius: 1.5, color: '#8b5cf6', borderColor: '#8b5cf6',
                            '&:hover': { borderColor: '#7c3aed', backgroundColor: 'rgba(139, 92, 246, 0.04)' }
                          }}
                        >
                          Reprogramar
                        </Button>

                        <Button
                          variant="outlined" size="small" startIcon={<Edit />} onClick={() => handleAbrirEditarTecnico(orden)}
                          sx={{ 
                            textTransform: 'none', borderRadius: 1.5, color: '#f59e0b', borderColor: '#f59e0b',
                            '&:hover': { borderColor: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.04)' }
                          }}
                        >
                          Técnico
                        </Button>

                        <Button
                          variant="outlined" size="small" startIcon={<CommentOutlined />} onClick={() => handleAbrirNotas(orden)}
                          sx={{ 
                            textTransform: 'none', borderRadius: 1.5, color: '#10b981', borderColor: '#10b981',
                            '&:hover': { borderColor: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.04)' }
                          }}
                        >
                          Notas
                        </Button>

                      </Stack>
                    )}

                    {filtroEstatus === 'completadas' && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Finalizada
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>

                {orden.notas_contrato && (
                  <TableRow>
                    <TableCell colSpan={totalColumnas} sx={{ pt: 0 }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 1,
                        p: 1.5, borderRadius: 1.5,
                        bgcolor: '#fffbeb', border: '1px solid #fde68a'
                      }}>
                        <CommentOutlined sx={{ color: '#b45309', fontSize: 20, mt: 0.2 }} />
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', display: 'block' }}>
                            Nota de ventas
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#78350f', whiteSpace: 'pre-line' }}>
                            {orden.notas_contrato}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ width: '100%' }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartOutlined color="primary" fontSize="small" /> Estatus Global
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ 
                  width: 120, height: 120, borderRadius: '50%', 
                  background: `conic-gradient(${conicGradient})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Box sx={{ width: 80, height: 80, backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{totalGeneral} Total</Typography>
                  </Box>
                </Box>
                <Stack spacing={1}>
                  {datosPastelDinamico.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '2px', backgroundColor: item.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.label} ({item.value})</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 3, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartOutlined color="secondary" fontSize="small" /> Volumen de Instalaciones Programadas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
                {datosBarrasDinamicos.map((barra, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '13%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#3b82f6' }}>{barra.cantidad}</Typography>
                    <Box sx={{ width: '100%', maxWidth: 30, height: barra.altura, backgroundColor: '#3b82f6', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease-in-out' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', mt: 0.5 }}>{barra.dia}</Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Dialog 
        open={Boolean(ordenSeleccionada) && !dialogoEditarOpen && !dialogoEditarTecnicoOpen && !dialogoReprogramarOpen && !dialogoNotasOpen} 
        onClose={handleCerrarModal} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
              Agendar Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarModal} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <form onSubmit={handleGuardarAsignacion}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Cliente: <strong>{ordenSeleccionada?.cliente}</strong><br/>
              Dirección: {ordenSeleccionada?.direccion}
            </Typography>

            <TextField
              type="date"
              label="Fecha Programada"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            
            <TextField
              type="time"
              label="Hora de Instalación"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
            
            <TextField
              select
              label="Asignar Técnico Responsable"
              fullWidth
              required
              disabled={loadingTecnicos}
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              helperText={loadingTecnicos ? 'Buscando técnicos...' : ''}
            >
              {tecnicosBD.length > 0 ? (
                tecnicosBD.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nombre} {t.apellido} - {t.usuario || t.nombreCompleto || `Técnico #${t.id}`}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>No hay técnicos registrados</MenuItem>
              )}
            </TextField>

            <TextField
              multiline
              rows={3}
              label="Notas para el Técnico (Opcional)"
              fullWidth
              placeholder="Ej: Llamar 30 min antes, cuidado con el perro..."
              value={notaInstalacion}
              onChange={(e) => setNotaInstalacion(e.target.value)}
            />

          </DialogContent>
          
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button onClick={handleCerrarModal} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<CalendarMonth />}>
              Confirmar Agenda
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={dialogoNotasOpen} onClose={handleCerrarNotas} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CommentOutlined sx={{ color: '#10b981' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Notas para el Técnico - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarNotas} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <form onSubmit={handleGuardarNotas}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Escribe indicaciones especiales de logística para el técnico.
            </Typography>

            <TextField
              multiline
              rows={4}
              label="Observaciones de Instalación"
              fullWidth
              placeholder="Ej: El cliente solicita que le llamen 30 min antes de llegar..."
              value={notaInstalacion}
              onChange={(e) => setNotaInstalacion(e.target.value)}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button onClick={handleCerrarNotas} color="inherit" disabled={guardandoNotas}>Cancelar</Button>
            <Button 
              type="submit" variant="contained" 
              startIcon={guardandoNotas ? <CircularProgress size={20} color="inherit" /> : <CommentOutlined />}
              disabled={guardandoNotas}
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
            >
              {guardandoNotas ? 'Guardando...' : 'Guardar Nota'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={dialogoReprogramarOpen} onClose={handleCerrarReprogramar} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ color: '#8b5cf6' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Reprogramar Cita - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarReprogramar} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <form onSubmit={handleGuardarReprogramacion}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Cliente: <strong>{ordenSeleccionada?.cliente}</strong><br/>
              Técnico Asignado: <strong>{tecnicosBD.find(t => t.id === ordenSeleccionada?.tecnico_id)?.nombre || 'Sin asignar'}</strong>
            </Typography>

            <TextField
              type="date"
              label="Nueva Fecha"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            
            <TextField
              type="time"
              label="Nueva Hora"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 2, px: 3 }}>
            <Button onClick={handleCerrarReprogramar} color="inherit" disabled={guardandoReprogramacion}>Cancelar</Button>
            <Button 
              type="submit" variant="contained" 
              startIcon={guardandoReprogramacion ? <CircularProgress size={20} color="inherit" /> : <Schedule />}
              disabled={guardandoReprogramacion}
              sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
            >
              {guardandoReprogramacion ? 'Guardando...' : 'Guardar Reprogramación'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={dialogoEditarTecnicoOpen} onClose={handleCerrarEditarTecnico} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="warning" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
              Cambiar Técnico - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarEditarTecnico} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Cliente: <strong>{ordenSeleccionada?.cliente}</strong><br/>
            Dirección: {ordenSeleccionada?.direccion}
          </Typography>

          <TextField
            select
            label="Seleccionar Nuevo Técnico"
            fullWidth
            required
            disabled={loadingTecnicos}
            value={tecnicoAsignado}
            onChange={(e) => setTecnicoAsignado(e.target.value)}
          >
            {tecnicosBD.length > 0 ? (
              tecnicosBD.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.nombre} {t.apellido} - {t.usuario || t.nombreCompleto || `Técnico #${t.id}`}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>No hay técnicos registrados</MenuItem>
            )}
          </TextField>

        </DialogContent>
        
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={handleCerrarEditarTecnico} color="inherit">Cancelar</Button>
          <Button 
            onClick={handleGuardarCambioTecnico} variant="contained" startIcon={<Edit />}
            sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            Guardar Cambio
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={dialogoEditarOpen} onClose={handleCerrarEditar} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Ver/Editar Datos de Venta - Folio: {ordenSeleccionada?.id}
            </Typography>
          </Box>
          <IconButton onClick={handleCerrarEditar} size="small"><Close /></IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3, maxHeight: 700, overflow: 'auto' }}>
          {/* Lo que avisó ventas al capturar. Aquí no se edita: es el recado de
              quien vendió, no un campo de logística. */}
          {ordenSeleccionada?.notas_contrato && (
            <Alert severity="warning" icon={<CommentOutlined />} sx={{ borderRadius: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                Nota de ventas
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {ordenSeleccionada.notas_contrato}
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Nombre Completo *" name="nombre_completo" value={datosEditar.nombre_completo}
                onChange={handleInputChange} required error={!datosEditar.nombre_completo.trim()}
                helperText={!datosEditar.nombre_completo.trim() ? "Este campo es obligatorio" : ""}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Teléfono *" name="telefono1" value={datosEditar.telefono1}
                inputProps={{ maxLength: 10 }}
                onChange={(e) => {
                  const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setDatosEditar(prev => ({ ...prev, telefono1: soloNumeros }));
                }}
                error={datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10}
                helperText={datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10 ? "Debe tener 10 dígitos" : ""}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Correo Electrónico" name="correo" type="email" value={datosEditar.correo} onChange={handleInputChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Plan Contratado" name="plan_contratado" value={datosEditar.plan_contratado} onChange={handleInputChange} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
             Evidencias Fotográficas del Contrato
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CreditCard color="primary" /> Frente INE
                </Typography>
                {renderImagenClickeable(ordenSeleccionada?.foto_ine_frente, 'Frente INE')}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CreditCard color="primary" /> Reverso INE
                </Typography>
                {renderImagenClickeable(ordenSeleccionada?.foto_ine_reverso, 'Reverso INE')}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Receipt color="warning" /> Recibo de Luz
                </Typography>
                {ordenSeleccionada?.foto_recibo_luz
                  ? renderImagenClickeable(ordenSeleccionada?.foto_recibo_luz, 'Recibo de Luz')
                  : (
                    <Typography variant="body2" color="text.secondary">
                      Sin comprobante — el técnico lo captura en la instalación
                    </Typography>
                  )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ border: '2px solid #e2e8f0', borderRadius: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Home color="info" /> Fachada
                </Typography>
                {renderImagenClickeable(ordenSeleccionada?.foto_fachada, 'Fachada')}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, px: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={handleCerrarEditar} color="inherit" disabled={guardandoEdicion}>Cancelar</Button>
          <Button 
            onClick={handleGuardarEdicion} variant="contained" 
            startIcon={guardandoEdicion ? <CircularProgress size={20} color="inherit" /> : <Edit />}
            disabled={guardandoEdicion || !datosEditar.nombre_completo.trim() || (datosEditar.telefono1.length > 0 && datosEditar.telefono1.length !== 10)}
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, '&.Mui-disabled': { bgcolor: '#93c5fd' } }}
          >
            {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog 
        open={visorImagen.open} onClose={handleCerrarVisor} maxWidth="lg" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: '#0f172a' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {visorImagen.titulo} - Folio: {ordenSeleccionada?.id}
          </Typography>
          <Box>
            <Button 
              startIcon={<RotateRight />} 
              onClick={handleRotarImagen} 
              sx={{ color: 'white', mr: 2, textTransform: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2 }}
            >
              Rotar
            </Button>
            <IconButton onClick={handleCerrarVisor} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover':{ bgcolor: 'rgba(255,255,255,0.2)' } }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3, minHeight: '60vh', overflow: 'hidden', borderColor: 'rgba(255,255,255,0.1)' }}>
          {esPdf(visorImagen.url) ? (
            <iframe
              src={visorImagen.url}
              title={visorImagen.titulo}
              style={{ width: '100%', height: '75vh', border: 'none', backgroundColor: '#fff' }}
            />
          ) : (
            <img
              src={visorImagen.url}
              alt={visorImagen.titulo}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                transform: `rotate(${visorImagen.rotacion}deg)`,
                transition: 'transform 0.3s ease'
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(ordenRechazo)}
        onClose={() => !rechazando && setOrdenRechazo(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportProblem color="error" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#b91c1c' }}>
              Rechazar Folio: {ordenRechazo?.id}
            </Typography>
          </Box>
          <IconButton onClick={() => setOrdenRechazo(null)} size="small" disabled={rechazando}><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El contrato de <strong>{ordenRechazo?.cliente}</strong> regresará al canvaceador
            para que corrija las evidencias. Marca qué está mal:
          </Typography>

          <Stack spacing={0.5}>
            {MOTIVOS_RECHAZO.map(({ clave, etiqueta }) => (
              <Paper
                key={clave}
                variant="outlined"
                onClick={() => toggleMotivo(clave)}
                sx={{
                  p: 1.2, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                  borderColor: motivosMarcados.includes(clave) ? '#ef4444' : '#e2e8f0',
                  borderWidth: motivosMarcados.includes(clave) ? 2 : 1,
                  bgcolor: motivosMarcados.includes(clave) ? 'rgba(239,68,68,0.04)' : 'transparent'
                }}
              >
                <Chip
                  size="small"
                  label={motivosMarcados.includes(clave) ? '✓' : ''}
                  color={motivosMarcados.includes(clave) ? 'error' : 'default'}
                  sx={{ width: 28, fontWeight: 800 }}
                />
                <Typography variant="body2" sx={{ fontWeight: motivosMarcados.includes(clave) ? 700 : 400 }}>
                  {etiqueta}
                </Typography>
              </Paper>
            ))}
          </Stack>

          {/* Sin casillas marcadas este campo es el único motivo que le llega al
              canvaceador, así que ahí deja de ser opcional. */}
          <TextField
            label={motivosMarcados.length === 0 ? 'Motivo del rechazo *' : 'Detalle adicional (opcional)'}
            placeholder="Ej. El recibo es de otro domicilio"
            fullWidth multiline rows={2} size="small" sx={{ mt: 2 }}
            value={motivoLibre}
            onChange={(e) => { setMotivoLibre(e.target.value); setErrorAsignacion(null); }}
            required={motivosMarcados.length === 0}
            helperText={motivosMarcados.length === 0
              ? 'Si ninguna opción de arriba aplica, escribe aquí por qué lo regresas.'
              : 'Opcional: agrega detalle al motivo marcado.'}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            El canvaceador verá este motivo en su apartado de <strong>Mis Contratos → Rechazados</strong>
            y solo podrá reemplazar las fotos.
          </Alert>

          {/* El error de la página se dibuja detrás del diálogo, así que aquí
              hace falta su propia copia o el usuario no ve por qué falló. */}
          {errorAsignacion && <Alert severity="error" sx={{ mt: 2 }}>{errorAsignacion}</Alert>}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOrdenRechazo(null)} disabled={rechazando} color="inherit">Cancelar</Button>
          <Button
            variant="contained" color="error" startIcon={rechazando ? <CircularProgress size={16} color="inherit" /> : <Cancel />}
            onClick={handleConfirmarRechazo}
            disabled={rechazando || (motivosMarcados.length === 0 && !motivoLibre.trim())}
          >
            {rechazando ? 'Rechazando...' : 'Rechazar y devolver'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(ordenCancelacion)}
        onClose={() => !cancelando && setOrdenCancelacion(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Block sx={{ color: '#475569' }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#334155' }}>
              Cancelar Folio: {ordenCancelacion?.id}
            </Typography>
          </Box>
          <IconButton onClick={() => setOrdenCancelacion(null)} size="small" disabled={cancelando}><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El contrato de <strong>{ordenCancelacion?.cliente}</strong> se archiva y sale de
            esta agenda. ¿Por qué se cayó la venta?
          </Typography>

          <Stack spacing={0.5}>
            {MOTIVOS_CANCELACION.map(({ clave, etiqueta }) => (
              <Paper
                key={clave}
                variant="outlined"
                onClick={() => toggleMotivoCancelacion(clave)}
                sx={{
                  p: 1.2, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                  borderColor: motivosCancelacion.includes(clave) ? '#64748b' : '#e2e8f0',
                  borderWidth: motivosCancelacion.includes(clave) ? 2 : 1,
                  bgcolor: motivosCancelacion.includes(clave) ? 'rgba(100,116,139,0.06)' : 'transparent'
                }}
              >
                <Chip
                  size="small"
                  label={motivosCancelacion.includes(clave) ? '✓' : ''}
                  sx={{
                    width: 28, fontWeight: 800,
                    bgcolor: motivosCancelacion.includes(clave) ? '#64748b' : undefined,
                    color: motivosCancelacion.includes(clave) ? 'white' : undefined
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: motivosCancelacion.includes(clave) ? 700 : 400 }}>
                  {etiqueta}
                </Typography>
              </Paper>
            ))}
          </Stack>

          {/* Sin casillas marcadas este texto es el único registro que queda de
              por qué se cayó la venta, así que ahí deja de ser opcional. */}
          <TextField
            label={motivosCancelacion.length === 0 ? 'Motivo de la cancelación *' : 'Detalle adicional (opcional)'}
            placeholder="Ej. Dijo que lo vuelve a solicitar el próximo mes"
            fullWidth multiline rows={2} size="small" sx={{ mt: 2 }}
            value={motivoCancelacionLibre}
            onChange={(e) => { setMotivoCancelacionLibre(e.target.value); setErrorAsignacion(null); }}
            required={motivosCancelacion.length === 0}
            helperText={motivosCancelacion.length === 0
              ? 'Si ninguna opción de arriba aplica, escribe aquí por qué se cayó la venta.'
              : 'Opcional: agrega detalle al motivo marcado.'}
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            Esto no se puede deshacer desde el sistema. El contrato quedará en
            <strong> Mis Contratos → Cancelados</strong> del canvaceador, como registro de
            solo lectura: no podrá editarlo ni reenviarlo.
          </Alert>

          {/* El error de la página queda detrás del diálogo; aquí va su copia. */}
          {errorAsignacion && <Alert severity="error" sx={{ mt: 2 }}>{errorAsignacion}</Alert>}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOrdenCancelacion(null)} disabled={cancelando} color="inherit">
            Mejor no
          </Button>
          <Button
            variant="contained"
            startIcon={cancelando ? <CircularProgress size={16} color="inherit" /> : <Block />}
            onClick={handleConfirmarCancelacion}
            disabled={cancelando || (motivosCancelacion.length === 0 && !motivoCancelacionLibre.trim())}
            sx={{ bgcolor: '#475569', '&:hover': { bgcolor: '#334155' } }}
          >
            {cancelando ? 'Cancelando...' : 'Cancelar contrato'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(ordenSeguimiento)}
        onClose={() => setSeguimientoOrden(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Navigation color="primary" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: '#1d4ed8' }}>
              Seguimiento Folio: {ordenSeguimiento?.id}
            </Typography>
          </Box>
          <IconButton onClick={() => setSeguimientoOrden(null)} size="small"><Close /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {ordenSeguimiento && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={etiquetaEstadoTecnico(ordenSeguimiento.estatus)}
                  color={colorEstadoTecnico(ordenSeguimiento.estatus)}
                  sx={{ fontWeight: 700 }}
                />
                {ordenSeguimiento.estatus === ESTADOS.ACEPTADA && ordenSeguimiento.fecha_aceptacion && (
                  <Chip
                    icon={<Timer />}
                    label={`${minutosDesde(ordenSeguimiento.fecha_aceptacion)} min en camino${ordenSeguimiento.eta_minutos ? ` · est. ${ordenSeguimiento.eta_minutos} min` : ''}`}
                  />
                )}
                {ordenSeguimiento.estatus === ESTADOS.EN_SITIO && ordenSeguimiento.fecha_llegada && (
                  <Chip
                    icon={<Flag />}
                    color="secondary"
                    label={`${minutosDesde(ordenSeguimiento.fecha_llegada)} min instalando`}
                  />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary">
                Cliente: <strong>{ordenSeguimiento.cliente}</strong><br/>
                Dirección: {ordenSeguimiento.direccion}
              </Typography>

              {ordenSeguimiento.estatus !== ESTADOS.ACEPTADA && ordenSeguimiento.estatus !== ESTADOS.EN_SITIO && (
                <Alert severity="info">
                  El técnico todavía no acepta esta orden, así que aún no reporta ubicación.
                </Alert>
              )}

              <MapaRutaInstalacion
                origen={ordenSeguimiento.posicion_tecnico}
                destino={ordenSeguimiento.destino}
                etiquetaDestino={ordenSeguimiento.direccion}
                actualizadoEn={ordenSeguimiento.ubicacion_actualizada}
                buscandoOrigen={buscandoPosicion}
                resumenGuardado={{
                  distanciaMetros: ordenSeguimiento.distancia_metros,
                  etaMinutos: ordenSeguimiento.eta_minutos
                }}
                mensajeSinOrigen={
                  // Aceptó pero no reporta: casi siempre es permiso de ubicación
                  // negado o la app cerrada. Decirlo evita que la oficina crea
                  // que el sistema falla.
                  (ordenSeguimiento.estatus === ESTADOS.ACEPTADA || ordenSeguimiento.estatus === ESTADOS.EN_SITIO)
                    ? 'El técnico aceptó la orden pero no está compartiendo su ubicación. Suele ser porque negó el permiso de GPS o cerró la app. Pídele que abra la instalación y toque "Compartir ahora".'
                    : null
                }
                alturaMapa={320}
              />

              {/* Historial de alertas de monitoreo */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsActive fontSize="small" color="warning" />
                  Alertas de monitoreo ({ordenSeguimiento.alertas?.length || 0})
                </Typography>

                {(!ordenSeguimiento.alertas || ordenSeguimiento.alertas.length === 0) ? (
                  <Typography variant="body2" color="text.secondary">
                    Sin alertas. El técnico va dentro de lo planeado.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {ordenSeguimiento.alertas.map((alerta) => (
                      <Alert
                        key={alerta.id}
                        severity={alerta.respondida ? 'success' : 'warning'}
                        icon={alerta.respondida ? <ThumbUp fontSize="inherit" /> : <NotificationsActive fontSize="inherit" />}
                        sx={{ fontSize: '0.85rem' }}
                      >
                        <strong>{alerta.tipo === 'demora' ? 'Demora' : 'Sin movimiento'}</strong>
                        {' · '}{formatFechaHora(alerta.fecha_creacion)}
                        <br />{alerta.mensaje}
                        {alerta.respondida && alerta.respuesta_tecnico && (
                          <><br /><em>Respondió: {alerta.respuesta_tecnico}</em></>
                        )}
                        {!alerta.respondida && (
                          <><br /><em>El técnico aún no responde este aviso.</em></>
                        )}
                      </Alert>
                    ))}
                  </Stack>
                )}
              </Box>

              <Typography variant="caption" color="text.secondary">
                El técnico reporta su posición cada 30 segundos mientras va en camino.
                Este panel la consulta cada 10 segundos.
              </Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={cargarInstalacionesReales} startIcon={<RotateRight />} sx={{ textTransform: 'none' }}>
            Actualizar ahora
          </Button>
          <Button onClick={() => setSeguimientoOrden(null)} color="inherit">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgendaInstalaciones;