import api from './api';

const INSTALACIONES = '/instalaciones/';
const ALERTAS = '/alertas_instalacion/';

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
