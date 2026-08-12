import api from './api';

const INSTALACIONES = '/instalaciones/';
const ALERTAS = '/alertas_instalacion/';
const EVIDENCIAS = '/evidencias_instalacion/';

export const ESTADOS = {
  PROGRAMADA: 'Programada',
  ACEPTADA: 'Aceptada',
  EN_SITIO: 'En Sitio',
  COMPLETADA: 'Completada'
};

export const TIPOS_ALERTA = {
  INACTIVIDAD: 'inactividad',
  DEMORA: 'demora',
  // El técnico marcó llegada estando lejos del domicilio, saltándose el bloqueo
  // del botón. Debe coincidir con AlertaInstalacion.TIPOS del backend.
  LLEGADA_LEJOS: 'llegada_lejos'
};

export const ESTADOS_ASIGNADOS = [
  'Asignado', 'Asignada', 'Programada', 'En Proceso',
  ESTADOS.ACEPTADA, ESTADOS.EN_SITIO
];

/**
 * Traduce el formulario de cierre a la ficha técnica que espera el servidor.
 *
 * Vive aquí y no en cada pantalla porque hay dos rutas de cierre —el técnico en
 * campo y logística capturándolo a mano— y tienen que guardar exactamente lo
 * mismo, o los reportes saldrían distintos según quién cerró.
 */
export const fichaTecnicaDesdeFormulario = (form) => ({
  verificar_equipos: Boolean(form.verificar_equipos),
  tendido_cable: Boolean(form.tendido_cable),
  config_ont: Boolean(form.config_ont),
  serial_ont: (form.serial_ont || '').trim(),
  serial_router: (form.serial_router || '').trim(),
  metraje_fibra: form.metraje_fibra,
  potencia_dbm: (form.potencia_dbm || '').trim(),
  // El servidor exige tipo no vacío; el formulario arranca en Residencial.
  tipo_instalacion: form.tipo_instalacion || 'Residencial',
  conectores_utilizados: Number(form.conectores_utilizados) || 2,
  notas_instalacion: (form.notas_instalacion || '').trim()
});

export const instalacionesSeguimientoService = {
  aceptar: async (instalacionId, { etaMinutos, distanciaMetros, lat, lng } = {}) => {
    const payload = { estado: ESTADOS.ACEPTADA };
    if (etaMinutos != null) payload.eta_minutos = etaMinutos;
    if (distanciaMetros != null) payload.distancia_metros = distanciaMetros;
    if (lat != null && lng != null) {
      payload.lat_tecnico = lat;
      payload.lng_tecnico = lng;
      payload.ubicacion_actualizada = new Date().toISOString();
    }
    const { data } = await api.patch(`${INSTALACIONES}${instalacionId}/`, payload);
    return data;
  },

  reportarUbicacion: async (instalacionId, lat, lng) => {
    const { data } = await api.patch(`${INSTALACIONES}${instalacionId}/`, {
      lat_tecnico: lat,
      lng_tecnico: lng,
      ubicacion_actualizada: new Date().toISOString()
    });
    return data;
  },

  marcarLlegada: async (instalacionId, { lat, lng } = {}) => {
    const payload = { estado: ESTADOS.EN_SITIO };
    if (lat != null && lng != null) {
      payload.lat_tecnico = lat;
      payload.lng_tecnico = lng;
      payload.ubicacion_actualizada = new Date().toISOString();
    }
    const { data } = await api.patch(`${INSTALACIONES}${instalacionId}/`, payload);
    return data;
  },

  /**
   * Guarda la ficha técnica del cierre (serial del ONT, potencia, metraje...).
   *
   * Se llama antes de marcar completada la instalación a propósito: si esto
   * falla, la instalación sigue abierta y se puede reintentar, en vez de quedar
   * cerrada y sin ficha.
   *
   * La relación con la instalación es uno a uno, así que un segundo cierre
   * actualiza la ficha existente en vez de intentar crear otra.
   */
  guardarFichaTecnica: async (instalacionId, datos) => {
    const payload = { instalacion_id: instalacionId, ...datos };

    const { data: fichas } = await api.get(EVIDENCIAS);
    const existente = (Array.isArray(fichas) ? fichas : []).find(
      f => String(f.instalacion_id) === String(instalacionId)
    );

    if (existente) {
      const { data } = await api.patch(`${EVIDENCIAS}${existente.id}/`, payload);
      return data;
    }
    const { data } = await api.post(EVIDENCIAS, payload);
    return data;
  },

  completar: async (instalacionId, { observaciones } = {}) => {
    const payload = { estado: ESTADOS.COMPLETADA };
    if (observaciones != null) payload.observaciones = observaciones;
    const { data } = await api.patch(`${INSTALACIONES}${instalacionId}/`, payload);
    return data;
  },

  crearAlerta: async ({ instalacionId, tipo, mensaje, lat, lng }) => {
    const { data } = await api.post(ALERTAS, {
      instalacion: instalacionId,
      tipo,
      mensaje,
      lat: lat ?? null,
      lng: lng ?? null
    });
    return data;
  },

  responderAlerta: async (alertaId, respuesta) => {
    const { data } = await api.patch(`${ALERTAS}${alertaId}/`, {
      respondida: true,
      respuesta_tecnico: respuesta
    });
    return data;
  },

  getAlertas: async ({ instalacionId, soloPendientes } = {}) => {
    const params = {};
    if (instalacionId) params.instalacion = instalacionId;
    if (soloPendientes) params.pendientes = 1;
    const { data } = await api.get(ALERTAS, { params });
    return data;
  }
};
