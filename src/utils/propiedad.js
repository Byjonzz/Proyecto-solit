/**
 * Quién puede ver qué registro.
 *
 * Un canvaceador solo debe ver los prospectos y contratos que él capturó, y lo
 * mismo un técnico. Los roles de oficina (logística, administración) ven todo.
 *
 * El criterio vivía duplicado en cada pantalla, con variantes: una comparaba con
 * `perfil_id`, otra con `perfil_id || id`, unas con `===` estricto y otras no.
 * Si el id con el que se guarda no coincide con el id con el que se filtra, el
 * canvaceador ve la lista vacía o ve la de todos. Aquí queda un solo criterio.
 */

// Roles que ven todos los registros, sin importar quién los capturó.
const ROLES_VISION_TOTAL = ['admin', 'admin_ventas', 'logistica', 'supervisor'];

export const normalizarRol = (usuario) =>
  (usuario?.rol || '').toLowerCase().trim();

/**
 * Id con el que el usuario queda registrado en prospectos y contratos.
 *
 * Es `perfil_id` cuando existe un perfil aparte y, si no, el id de Usuario. Se
 * usa el mismo orden de preferencia que al guardar (ver PlanCotizacion y
 * NuevoProspect), porque si difieren el filtro no encuentra nada.
 */
export const idRegistrador = (usuario) => {
  const id = Number(usuario?.perfil_id ?? usuario?.id);
  return isNaN(id) ? null : id;
};

export const tieneVisionTotal = (usuario) =>
  ROLES_VISION_TOTAL.includes(normalizarRol(usuario));

/** Extrae un id de FK que puede venir como número, texto u objeto anidado. */
const idDeCampo = (valor) => {
  if (valor == null) return null;
  const bruto = typeof valor === 'object' ? valor.id : valor;
  const n = Number(bruto);
  return isNaN(n) ? null : n;
};

/**
 * ¿Este registro (prospecto o contrato) lo capturó el usuario?
 *
 * Se trata de autoría, no de asignación. Los dos campos no significan lo mismo:
 * `canvaceador_id` es quien lo levantó, mientras que `tecnico_id` unas veces es
 * el autor —un técnico puede hacer un contrato directo, y entonces va sin
 * canvaceador— y otras es solo el técnico al que logística le asignó la
 * instalación.
 *
 * Por eso manda el canvaceador cuando lo hay. Aceptando cualquiera de los dos,
 * el técnico asignado veía en "Mis Contratos" los contratos del canvaceador
 * como si los hubiera hecho él.
 */
export const esMiRegistro = (registro, usuario) => {
  if (!registro) return false;
  if (tieneVisionTotal(usuario)) return true;

  const mio = idRegistrador(usuario);
  if (mio == null) return false;

  const canvaceador = idDeCampo(registro.canvaceador_id);
  if (canvaceador != null) return canvaceador === mio;

  return idDeCampo(registro.tecnico_id) === mio;
};

/** Filtra una lista dejando solo lo que el usuario puede ver. */
export const soloMisRegistros = (lista, usuario) => {
  if (!Array.isArray(lista)) return [];
  if (tieneVisionTotal(usuario)) return lista;
  return lista.filter(r => esMiRegistro(r, usuario));
};

/**
 * Parámetros de consulta para que el servidor ya devuelva solo lo del usuario.
 *
 * Evita descargar la lista completa (los contratos traen las fotos en base64 y
 * la respuesta llegaba a medio megabyte). Los roles de oficina no llevan filtro.
 */
export const paramsDeRegistrador = (usuario) => {
  if (tieneVisionTotal(usuario)) return {};

  const mio = idRegistrador(usuario);
  if (mio == null) return {};

  const rol = normalizarRol(usuario);
  if (rol === 'tecnico') return { tecnico_id: mio };
  return { canvaceador_id: mio };
};
