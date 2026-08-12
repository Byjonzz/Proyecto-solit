import api from './api';

const ENDPOINT = '/contratos/';

export const ESTATUS_CONTRATO = {
  PENDIENTE: 'Pendiente Asignar',
  RECHAZADO: 'Rechazado',
  ASIGNADO: 'Asignado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado'
};

export const ESTATUS_EN_INSTALACION = [
  'Asignado', 'Asignada', 'Programada', 'En Proceso',
  'Aceptada', 'En Sitio', 'Completado', 'Completada'
];

export const MOTIVOS_RECHAZO = [
  { clave: 'ine_frente', etiqueta: 'La foto del INE (frente) no se ve o no corresponde' },
  { clave: 'ine_reverso', etiqueta: 'La foto del INE (reverso) no se ve o no corresponde' },
  { clave: 'recibo', etiqueta: 'El recibo de luz no es legible o no es del domicilio' },
  { clave: 'fachada', etiqueta: 'La foto de la fachada no corresponde al domicilio' },
  { clave: 'firma', etiqueta: 'La firma no es válida' },
  { clave: 'datos', etiqueta: 'Los datos del cliente no coinciden con el INE' }
];

export const MOTIVOS_CANCELACION = [
  { clave: 'no_quiere', etiqueta: 'El cliente ya no quiere el servicio' },
  { clave: 'otra_compania', etiqueta: 'Se contrató con otra compañía' },
  { clave: 'sin_cobertura', etiqueta: 'No hay cobertura en el domicilio' },
  { clave: 'no_localizable', etiqueta: 'El cliente ya no responde' },
  { clave: 'mudanza', etiqueta: 'El cliente se muda del domicilio' },
  { clave: 'precio', etiqueta: 'No aceptó el costo del servicio' }
];

export const FOTO_POR_MOTIVO = {
  ine_frente: 'foto_ine_frente',
  ine_reverso: 'foto_ine_reverso',
  recibo: 'foto_recibo_luz',
  fachada: 'foto_fachada'
};

export const revisionContratosService = {
  rechazar: async (contratoId, motivo) => {
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, {
      estatus: ESTATUS_CONTRATO.RECHAZADO,
      motivo_rechazo: motivo
    });
    return data;
  },

  cancelar: async (contratoId, motivo) => {
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, {
      estatus: ESTATUS_CONTRATO.CANCELADO,
      motivo_cancelacion: motivo
    });
    return data;
  },

  reenviarCorregido: async (contratoId, fotos) => {
    const payload = { estatus: ESTATUS_CONTRATO.PENDIENTE };
    ['foto_ine_frente', 'foto_ine_reverso', 'foto_recibo_luz', 'foto_fachada'].forEach(campo => {
      if (fotos[campo]) payload[campo] = fotos[campo];
    });
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, payload);
    return data;
  },

  getAll: async (filtros = {}) => {
    const { data } = await api.get(ENDPOINT, { params: filtros });
    return data;
  }
};
