import api from './api';

const ENDPOINT = '/contratos/';

// Estatus del contrato a lo largo de la revisión de logística.
export const ESTATUS_CONTRATO = {
  PENDIENTE: 'Pendiente Asignar',
  RECHAZADO: 'Rechazado',
  ASIGNADO: 'Asignado',
  COMPLETADO: 'Completado',
  // El cliente se echó para atrás. Es un final, no un paso: de aquí el contrato
  // no vuelve a revisión ni se corrige, solo queda archivado.
  CANCELADO: 'Cancelado'
};

// Un contrato "en instalación" ya pasó la validación de logística: tiene cita
// asignada o la instalación ya se hizo.
export const ESTATUS_EN_INSTALACION = [
  'Asignado', 'Asignada', 'Programada', 'En Proceso',
  'Aceptada', 'En Sitio', 'Completado', 'Completada'
];

// Motivos frecuentes de rechazo. Se ofrecen como casillas para que logística no
// tenga que escribir el mismo texto cada vez y el canvaceador reciba un motivo
// concreto en vez de un "está mal".
export const MOTIVOS_RECHAZO = [
  { clave: 'ine_frente', etiqueta: 'La foto del INE (frente) no se ve o no corresponde' },
  { clave: 'ine_reverso', etiqueta: 'La foto del INE (reverso) no se ve o no corresponde' },
  { clave: 'recibo', etiqueta: 'El recibo de luz no es legible o no es del domicilio' },
  { clave: 'fachada', etiqueta: 'La foto de la fachada no corresponde al domicilio' },
  { clave: 'firma', etiqueta: 'La firma no es válida' },
  { clave: 'datos', etiqueta: 'Los datos del cliente no coinciden con el INE' }
];

// Por qué se cayó la venta. Se guardan como texto igual que los del rechazo,
// para que el registro se entienda sin tener que descifrar una clave.
export const MOTIVOS_CANCELACION = [
  { clave: 'no_quiere', etiqueta: 'El cliente ya no quiere el servicio' },
  { clave: 'otra_compania', etiqueta: 'Se contrató con otra compañía' },
  { clave: 'sin_cobertura', etiqueta: 'No hay cobertura en el domicilio' },
  { clave: 'no_localizable', etiqueta: 'El cliente ya no responde' },
  { clave: 'mudanza', etiqueta: 'El cliente se muda del domicilio' },
  { clave: 'precio', etiqueta: 'No aceptó el costo del servicio' }
];

// Qué foto debe volver a subir el canvaceador según el motivo marcado.
export const FOTO_POR_MOTIVO = {
  ine_frente: 'foto_ine_frente',
  ine_reverso: 'foto_ine_reverso',
  recibo: 'foto_recibo_luz',
  fachada: 'foto_fachada'
};

export const revisionContratosService = {
  /** Logística devuelve el contrato al canvaceador con el motivo. */
  rechazar: async (contratoId, motivo) => {
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, {
      estatus: ESTATUS_CONTRATO.RECHAZADO,
      motivo_rechazo: motivo
    });
    return data;
  },

  /**
   * Se cae la venta: el contrato se archiva.
   *
   * No toca las evidencias ni los datos: el contrato queda tal cual quedó, solo
   * cambia de estatus. Es lo que lo vuelve útil como registro.
   */
  cancelar: async (contratoId, motivo) => {
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, {
      estatus: ESTATUS_CONTRATO.CANCELADO,
      motivo_cancelacion: motivo
    });
    return data;
  },

  /**
   * El canvaceador reenvía el contrato corregido.
   * Solo se mandan las fotos: el resto de los datos ya pasó la validación del
   * formulario y no debe poder alterarse desde aquí.
   */
  reenviarCorregido: async (contratoId, fotos) => {
    const payload = { estatus: ESTATUS_CONTRATO.PENDIENTE };
    ['foto_ine_frente', 'foto_ine_reverso', 'foto_recibo_luz', 'foto_fachada'].forEach(campo => {
      if (fotos[campo]) payload[campo] = fotos[campo];
    });
    const { data } = await api.patch(`${ENDPOINT}${contratoId}/`, payload);
    return data;
  },

  /**
   * @param {{canvaceador_id?: number, tecnico_id?: number}} filtros
   *   Sin filtros devuelve todos los contratos (vista de oficina).
   */
  getAll: async (filtros = {}) => {
    const { data } = await api.get(ENDPOINT, { params: filtros });
    return data;
  }
};
