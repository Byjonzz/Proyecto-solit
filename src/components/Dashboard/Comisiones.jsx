import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, Alert, Stack, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { 
  AttachMoney, MapOutlined, BarChartOutlined,
  WarningAmberOutlined, PersonSearchOutlined, AccountBalanceWalletOutlined,
  InfoOutlined, CalendarMonthOutlined, KeyboardArrowDown, KeyboardArrowUp
} from '@mui/icons-material';
import api from '../../services/api';

const inputReglaStyle = {
  width: 40,
  mx: 1, 
  '& .MuiInput-root': {
    color: '#15803d',
    fontWeight: 800,
    fontSize: '0.9rem',
    '&:before': { borderBottomColor: 'rgba(21, 128, 61, 0.4)' },
    '&:hover:not(.Mui-disabled):before': { borderBottomColor: '#15803d' },
    '&:after': { borderBottomColor: '#16a34a' },
  },
  '& input': {
    textAlign: 'center',
    p: 0,
    pb: 0.5,
    MozAppearance: 'textfield', 
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none', 
      m: 0
    }
  }
};

// Fecha real del equipo. Antes estaba fija en el 19/06/2026, así que el panel
// abría en junio y ocultaba como "futuro" cualquier día posterior: los contratos
// de meses siguientes quedaban invisibles y no había forma de navegar hasta ellos.
const FECHA_HOY_REAL = new Date();

const normalizarFecha = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const PRIMER_DIA_DEL_MES_ACTUAL = new Date(FECHA_HOY_REAL.getFullYear(), FECHA_HOY_REAL.getMonth(), 1);

const obtenerKeyFecha = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const NOMBRES_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const Comisiones = () => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  const [configuracion, setConfiguracion] = useState({
    modalidad: 'solo_metas',
    salarioBase: 1000,
    comisionPlana: 50
  });

  const [reglasMetas, setReglasMetas] = useState([
    { min: 1, max: 3, porcentaje: 30 },
    { min: 4, max: 5, porcentaje: 60 },
    { min: 6, porcentaje: 100 }
  ]);

  const [equipo, setEquipo] = useState([]);
  const [modalInfoPago, setModalInfoPago] = useState(false);
  
  // Arranca en el mes en curso y con el día de hoy seleccionado.
  const [mesFoco, setMesFoco] = useState(PRIMER_DIA_DEL_MES_ACTUAL);
  const [diaSeleccionado, setDiaSeleccionado] = useState(normalizarFecha(FECHA_HOY_REAL));

  useEffect(() => {
    cargarDatosDesdeBD();
  }, []);

  const generarDiasCalendario = (fechaBase) => {
    const año = fechaBase.getFullYear();
    const mes = fechaBase.getMonth();
    
    const primerDiaMes = new Date(año, mes, 1).getDay();
    const totalDiasMesActual = new Date(año, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(año, mes, 0).getDate();

    const celdas = [];

    for (let i = primerDiaMes - 1; i >= 0; i--) {
      const d = totalDiasMesAnterior - i;
      celdas.push({
        day: d,
        date: new Date(año, mes - 1, d),
        isCurrentMonth: false
      });
    }

    for (let d = 1; d <= totalDiasMesActual; d++) {
      celdas.push({
        day: d,
        date: new Date(año, mes, d),
        isCurrentMonth: true
      });
    }

    const restantes = 42 - celdas.length;
    for (let d = 1; d <= restantes; d++) {
      celdas.push({
        day: d,
        date: new Date(año, mes + 1, d),
        isCurrentMonth: false
      });
    }

    return celdas;
  };

  const cambiarMes = (direccion) => {
    const nuevoMes = new Date(mesFoco.getFullYear(), mesFoco.getMonth() + direccion, 1);
    setMesFoco(nuevoMes);
  };

  const cargarDatosDesdeBD = async () => {
    try {
      setLoading(true);
      const canvResponse = await api.get('/usuarios/?rol=Canvaceador');
      const canvaceadores = canvResponse.data;
      
      const contratosResponse = await api.get('/contratos/');
      const todosContratos = contratosResponse.data;

      try {
        const resEsquema = await api.get('/esquemas_pago/');
        if (resEsquema.data && resEsquema.data.length > 0) {
          const ultimoEsquema = resEsquema.data[resEsquema.data.length - 1];
          let modGuardada = ultimoEsquema.modalidad;
          const validMods = ['solo_metas', 'base_mas_comision', 'comision_pura'];
          if (!validMods.includes(modGuardada)) modGuardada = 'solo_metas';

          setConfiguracion({
            modalidad: modGuardada,
            salarioBase: parseFloat(ultimoEsquema.salario_base || 1000),
            comisionPlana: parseFloat(ultimoEsquema.comision_plana_porcentaje || 50)
          });
        }
      } catch (e) {
      }
      
      const equipoTransformado = canvaceadores.map(canv => {
        // `usuario` no existe en el modelo Usuario: el campo es `nombre`. Con la
        // clave equivocada el nombre quedaba solo con el apellido.
        const nombreCompleto = `${canv.nombre || ''} ${canv.apellido || ''}`.trim() || `Agente #${canv.id}`;

        // La FK llega como id numérico, pero normalizamos ambos lados: si alguna
        // respuesta lo devolviera como texto (o como objeto anidado), un `===`
        // estricto descartaría contratos que sí son de este canvaceador.
        const idCanv = Number(canv.id);
        const contratosDelAgente = todosContratos.filter(c => {
          const idContrato = typeof c.canvaceador_id === 'object'
            ? c.canvaceador_id?.id
            : c.canvaceador_id;
          return Number(idContrato) === idCanv;
        });

        const contratosPendientesAgente = contratosDelAgente.filter(c => !c.comision_pagada);

        // Preferimos lo que calcula el backend, pero si viniera vacío usamos el
        // conteo local para no mostrar 0 contratos teniendo los datos a la mano.
        const totalVentas = canv.contratos_pendientes || contratosPendientesAgente.length;
        const volumenDinero = canv.volumen_pendiente ||
          contratosPendientesAgente.reduce((suma, c) => suma + (parseFloat(c.monto_total) || 0), 0);

        const conteoPlanes = {};
        contratosPendientesAgente.forEach(contrato => {
          const nombrePlan = contrato.plan_contratado || 'Desconocido';
          conteoPlanes[nombrePlan] = (conteoPlanes[nombrePlan] || 0) + 1;
        });

        const desgloseTooltip = Object.keys(conteoPlanes).length > 0 
          ? Object.entries(conteoPlanes).map(([plan, cant]) => `${plan}: ${cant}`).join(' | ') 
          : 'Sin contratos para desglosar';

        const contratosPorFecha = {};
        contratosPendientesAgente.forEach(contrato => {
          const fechaStr = contrato.fecha_creacion || contrato.fecha_captura || '';
          if (fechaStr) {
            const ymd = fechaStr.split('T')[0];
            contratosPorFecha[ymd] = (contratosPorFecha[ymd] || 0) + 1;
          }
        });
        
        let estatus = 'Bajo Rendimiento';
        if (totalVentas >= 6) estatus = 'Excelente';
        else if (totalVentas >= 4) estatus = 'Regular';
        
        const diasTrabajados = Object.keys(contratosPorFecha).length;
        const horasApp = diasTrabajados * 8;
        
        return {
          id: canv.id,
          nombre: nombreCompleto,
          zonaAsignada: canv.zona_asignada || `Zona ${canv.id}`,
          numeroEmpleado: canv.numero_empleado || `EMP-${canv.id}`,
          totalVentas,
          volumenDinero,
          // Todos los contratos que ha hecho, se haya pagado la comisión o no.
          totalContratosHistorico: contratosDelAgente.length,
          volumenHistorico: contratosDelAgente.reduce((s, c) => s + (parseFloat(c.monto_total) || 0), 0),
          horasApp,
          contratosPorFecha,
          estatus,
          desgloseTooltip
        };
      });
      
      setEquipo(equipoTransformado);
      
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (prop, value) => {
    setConfiguracion(prev => ({ ...prev, [prop]: value }));
  };

  const handleMetasChange = (index, field, value) => {
    const nuevasReglas = [...reglasMetas];
    nuevasReglas[index][field] = Number(value);
    setReglasMetas(nuevasReglas);
  };

  const handleGuardarEsquema = async () => {
    setGuardando(true);
    const hoy = FECHA_HOY_REAL.toISOString().split('T')[0];
    const fechaFin = new Date(FECHA_HOY_REAL.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fin = fechaFin.toISOString().split('T')[0];    

    try {
      await api.post('/esquemas_pago/', {
        modalidad: configuracion.modalidad,
        salario_base: configuracion.salarioBase,
        comision_plana_porcentaje: configuracion.comisionPlana, 
        fecha_inicio: hoy, 
        fecha_fin: fin     
      });
      alert('Esquema de pago actualizado exitosamente.');
    } catch (error) {
      alert('Hubo un error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const calcularRendimientoAgente = (totalVentas, volumenDinero) => {
    let pagoCalculado = 0;
    let porcentajeAplicado = 0;

    if (configuracion.modalidad === 'solo_metas') {
      let porcentajeEscalonado = 0;
      if (totalVentas >= reglasMetas[2].min) porcentajeEscalonado = reglasMetas[2].porcentaje / 100;
      else if (totalVentas >= reglasMetas[1].min && totalVentas <= reglasMetas[1].max) porcentajeEscalonado = reglasMetas[1].porcentaje / 100;
      else if (totalVentas >= reglasMetas[0].min && totalVentas <= reglasMetas[0].max) porcentajeEscalonado = reglasMetas[0].porcentaje / 100;

      pagoCalculado = volumenDinero * porcentajeEscalonado;
      porcentajeAplicado = porcentajeEscalonado * 100;
    } else if (configuracion.modalidad === 'base_mas_comision') {
      pagoCalculado = configuracion.salarioBase + (volumenDinero * (configuracion.comisionPlana / 100));
      porcentajeAplicado = configuracion.comisionPlana;
    } else if (configuracion.modalidad === 'comision_pura') {
      pagoCalculado = volumenDinero * (configuracion.comisionPlana / 100);
      porcentajeAplicado = configuracion.comisionPlana;
    }

    return { porcentajeAplicado, pagoCalculado };
  };

  const getRendimientoColor = (estatus) => {
    if (estatus === 'Excelente') return 'success';
    if (estatus === 'Regular') return 'warning';
    return 'error';
  };

  const obtenerEtiquetaFecha = (dateObj) => {
    if (!dateObj) return '';
    const diaSemana = NOMBRES_DIAS[dateObj.getDay()];
    const numDia = dateObj.getDate();
    const mes = NOMBRES_MESES[dateObj.getMonth()];
    return `${diaSemana}, ${numDia} de ${mes}`;
  };

  const listaDiasCalendario = generarDiasCalendario(mesFoco);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonSearchOutlined color="primary" fontSize="large" /> Administración Ventas y Comisiones
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supervisión semanal de canvaceadores, cálculo inteligente por paquetes y evaluación de metas.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        
        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletOutlined color="success" /> Parámetros de Pago
              </Typography>

              <Stack spacing={3}>
                <TextField select label="Modalidad de Trabajo" size="small" fullWidth value={configuracion.modalidad} onChange={(e) => handleConfigChange('modalidad', e.target.value)}>
                  <MenuItem value="solo_metas">Pago por Metas (Escalonado)</MenuItem>
                  <MenuItem value="base_mas_comision">Salario Base + Comisión Fija</MenuItem>
                  <MenuItem value="comision_pura">Comisión Pura (Fija %)</MenuItem>
                </TextField>

                {configuracion.modalidad === 'solo_metas' && (
                  <Box sx={{ backgroundColor: '#f0fdf4', p: 2.5, borderRadius: 2, border: '1px solid #bbf7d0' }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534', mb: 2 }}>Reglas Escalonadas Activas:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>• De</Typography>
                      <TextField variant="standard" type="number" sx={inputReglaStyle} value={reglasMetas[0].min} onChange={(e) => handleMetasChange(0, 'min', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>a</Typography>
                      <TextField variant="standard" type="number" sx={inputReglaStyle} value={reglasMetas[0].max} onChange={(e) => handleMetasChange(0, 'max', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>Ventas =</Typography>
                      <TextField variant="standard" type="number" sx={{ ...inputReglaStyle, width: 45 }} value={reglasMetas[0].porcentaje} onChange={(e) => handleMetasChange(0, 'porcentaje', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>• De</Typography>
                      <TextField variant="standard" type="number" sx={inputReglaStyle} value={reglasMetas[1].min} onChange={(e) => handleMetasChange(1, 'min', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>a</Typography>
                      <TextField variant="standard" type="number" sx={inputReglaStyle} value={reglasMetas[1].max} onChange={(e) => handleMetasChange(1, 'max', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>Ventas =</Typography>
                      <TextField variant="standard" type="number" sx={{ ...inputReglaStyle, width: 45 }} value={reglasMetas[1].porcentaje} onChange={(e) => handleMetasChange(1, 'porcentaje', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>•</Typography>
                      <TextField variant="standard" type="number" sx={inputReglaStyle} value={reglasMetas[2].min} onChange={(e) => handleMetasChange(2, 'min', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>o más Ventas =</Typography>
                      <TextField variant="standard" type="number" sx={{ ...inputReglaStyle, width: 45 }} value={reglasMetas[2].porcentaje} onChange={(e) => handleMetasChange(2, 'porcentaje', e.target.value)} />
                      <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 600 }}>%</Typography>
                    </Box>
                  </Box>
                )}

                {configuracion.modalidad === 'base_mas_comision' && (
                  <>
                    <TextField label="Salario Base ($)" type="number" size="small" fullWidth value={configuracion.salarioBase} onChange={(e) => handleConfigChange('salarioBase', Number(e.target.value))} />
                    <TextField label="% de Comisión Fija" type="number" size="small" fullWidth value={configuracion.comisionPlana} onChange={(e) => handleConfigChange('comisionPlana', Number(e.target.value))} />
                  </>
                )}

                {configuracion.modalidad === 'comision_pura' && (
                  <TextField label="% de Comisión Fija Pareja" type="number" size="small" fullWidth value={configuracion.comisionPlana} onChange={(e) => handleConfigChange('comisionPlana', Number(e.target.value))} />
                )}

                <Button variant="contained" color="primary" fullWidth sx={{ fontWeight: 700, mt: 2 }} onClick={handleGuardarEsquema} disabled={guardando}>
                  {guardando ? <CircularProgress size={24} color="inherit" /> : 'SOLICITAR APROBACIÓN DE ESQUEMA'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartOutlined color="primary" /> Productividad y Cálculo de Nómina
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Canvaceador</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Contratos Totales</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Ventas Pendientes</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Volumen ($)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Comisión Aplicada</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Pago Calculado
                          <Tooltip title="Ver reglas de cálculo">
                            <IconButton size="small" onClick={() => setModalInfoPago(true)} sx={{ color: '#64748b', '&:hover': { color: '#3b82f6' } }}>
                              <InfoOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Ubicación</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
                    ) : equipo.length === 0 ? (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No hay canvaceadores registrados</Typography></TableCell></TableRow>
                    ) : equipo.map((agente) => {
                      const stats = calcularRendimientoAgente(agente.totalVentas, agente.volumenDinero);
                      return (
                        <TableRow key={agente.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{agente.nombre}</Typography>
                            <Chip label={agente.estatus} color={getRendimientoColor(agente.estatus)} size="small" sx={{ height: 16, fontSize: '0.65rem', mt: 0.5 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip
                              title={`Todos los contratos cerrados por este canvaceador (histórico). Volumen: $${agente.volumenHistorico.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                              arrow placement="top"
                            >
                              <Chip
                                label={agente.totalContratosHistorico}
                                size="small"
                                color={agente.totalContratosHistorico > 0 ? 'primary' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 800, cursor: 'help', minWidth: 48 }}
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={agente.desgloseTooltip} arrow placement="top">
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b82f6', cursor: 'help' }}>
                                {agente.totalVentas} Contratos
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ color: '#475569' }}>${agente.volumenDinero.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${stats.porcentajeAplicado}% ${configuracion.modalidad === 'solo_metas' ? 'Alcanzado' : 'Fijo'}`} 
                              size="small" 
                              color={stats.porcentajeAplicado >= 100 ? 'success' : stats.porcentajeAplicado >= 50 ? 'primary' : 'warning'}
                              variant={configuracion.modalidad === 'comision_pura' ? 'outlined' : 'filled'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                              ${stats.pagoCalculado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={`Ver zona: ${agente.zonaAsignada} (${agente.horasApp}h en campo)`}>
                              <IconButton color="primary" size="small"><MapOutlined /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthOutlined color="primary" /> Logística: Panel Operativo de Rutas
              </Typography>
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={5} lg={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ 
                    width: '100%', 
                    maxWidth: 340, 
                    bgcolor: '#e0e0e0', 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    {/* Barra Superior */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px', bgcolor: '#dbdbdb' }}>
                      <Typography sx={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', textTransform: 'lowercase' }}>
                        {obtenerEtiquetaFecha(diaSeleccionado)}
                      </Typography>
                      <Box sx={{ bgcolor: '#f3f3f3', borderRadius: '4px', width: 28, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cccccc' }}>
                        <KeyboardArrowDown sx={{ fontSize: 16, color: '#333333' }} />
                      </Box>
                    </Box>

                    <Box sx={{ p: '16px' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, px: '4px' }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize' }}>
                          {NOMBRES_MESES[mesFoco.getMonth()]} de {mesFoco.getFullYear()}
                        </Typography>
                        <Stack direction="row" spacing={2.5}>
                          <KeyboardArrowUp 
                            onClick={() => cambiarMes(-1)} 
                            sx={{ fontSize: 16, color: '#555555', cursor: 'pointer', '&:hover': { color: '#0067c0' } }} 
                          />
                          <KeyboardArrowDown 
                            onClick={() => cambiarMes(1)} 
                            sx={{ fontSize: 16, color: '#555555', cursor: 'pointer', '&:hover': { color: '#0067c0' } }} 
                          />
                        </Stack>
                      </Box>

                      <Grid container spacing={0} sx={{ mb: 1, textAlign: 'center' }}>
                        {['do.', 'lu.', 'ma.', 'mi.', 'ju.', 'vi.', 'sá.'].map((d) => (
                          <Grid item xs={12/7} key={d}>
                            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#000000', pb: '8px' }}>
                              {d}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>

                      <Grid container spacing={0} sx={{ textAlign: 'center', rowGap: '4px' }}>
                        {listaDiasCalendario.map((item, index) => {
                          const fechaKey = obtenerKeyFecha(item.date);
                          const esMismoDia = obtenerKeyFecha(diaSeleccionado) === fechaKey;
                          
                          const esFuturo = normalizarFecha(item.date) > normalizarFecha(FECHA_HOY_REAL);

                          const tieneContratos = equipo.some(
                            agente => (agente.contratosPorFecha[fechaKey] || 0) > 0
                          );

                          return (
                            <Grid item xs={12/7} key={index} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Box 
                                onClick={() => !esFuturo && setDiaSeleccionado(item.date)}
                                sx={{ 
                                  width: 34, 
                                  height: 34, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  borderRadius: '50%',
                                  fontSize: '13px',
                                  fontWeight: esMismoDia ? 600 : 500,
                                  position: 'relative',
                                  
                                  visibility: esFuturo ? 'hidden' : 'visible',
                                  pointerEvents: esFuturo ? 'none' : 'auto',
                                  cursor: 'pointer',
                                  
                                  backgroundColor: esMismoDia ? '#0067c0' : 'transparent',
                                  color: esMismoDia ? '#ffffff' : (item.isCurrentMonth ? '#000000' : '#999999'),
                                  '&:hover': {
                                    backgroundColor: esMismoDia ? '#0067c0' : 'rgba(0, 0, 0, 0.05)'
                                  }
                                }}
                              >
                                {item.day}

                                {tieneContratos && (
                                  <Box 
                                    sx={{
                                      position: 'absolute',
                                      bottom: '3px',
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '50%',
                                      backgroundColor: esMismoDia ? '#ffffff' : '#0067c0'
                                    }}
                                  />
                                )}
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={7} lg={8}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', mb: 2, textTransform: 'capitalize' }}>
                      Ventas logradas el {obtenerEtiquetaFecha(diaSeleccionado)}
                    </Typography>

                    {(() => {
                      const fechaSeleccionadaKey = obtenerKeyFecha(diaSeleccionado);
                      const agentesDelDia = equipo.filter(
                        agente => (agente.contratosPorFecha[fechaSeleccionadaKey] || 0) > 0
                      );

                      if (agentesDelDia.length === 0) {
                        return (
                          <Alert severity="info" sx={{ borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', '& .MuiAlert-icon': { color: '#94a3b8' } }}>
                            No se registraron contratos cerrados en esta fecha por ningún canvaceador.
                          </Alert>
                        );
                      }

                      const agentesOrdenados = [...agentesDelDia].sort(
                        (a, b) => b.contratosPorFecha[fechaSeleccionadaKey] - a.contratosPorFecha[fechaSeleccionadaKey]
                      );

                      return (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Canvaceador</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Ventas Individuales</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Ruta / Zona Asignada</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {agentesOrdenados.map((agente) => {
                                const ventasDeHoy = agente.contratosPorFecha[fechaSeleccionadaKey] || 0;
                                return (
                                  <TableRow key={agente.id} hover>
                                    <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                                      {agente.nombre}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip 
                                        label={`${ventasDeHoy} ${ventasDeHoy === 1 ? 'Contrato' : 'Contratos'}`} 
                                        color="primary" 
                                        size="small" 
                                        sx={{ fontWeight: 700, px: 1 }} 
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                        {agente.zonaAsignada}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    })()}
                  </Box>
                </Grid>
              </Grid>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={modalInfoPago} onClose={() => setModalInfoPago(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney color="success" /> Guía de Cálculo de Nómina
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            El sistema calcula las nóminas automáticamente leyendo el "Volumen ($)" de la base de datos de cada Canvaceador.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Comisiones;