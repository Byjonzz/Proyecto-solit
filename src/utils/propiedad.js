
const ROLES_VISION_TOTAL = ['admin', 'admin_ventas', 'logistica', 'supervisor'];

export const normalizarRol = (usuario) =>
  (usuario?.rol || '').toLowerCase().trim();

export const idRegistrador = (usuario) => {
  const id = Number(usuario?.perfil_id ?? usuario?.id);
  return isNaN(id) ? null : id;
};

export const tieneVisionTotal = (usuario) =>
  ROLES_VISION_TOTAL.includes(normalizarRol(usuario));

const idDeCampo = (valor) => {
  if (valor == null) return null;
  const bruto = typeof valor === 'object' ? valor.id : valor;
  const n = Number(bruto);
  return isNaN(n) ? null : n;
};

export const esMiRegistro = (registro, usuario) => {
  if (!registro) return false;
  if (tieneVisionTotal(usuario)) return true;

  const mio = idRegistrador(usuario);
  if (mio == null) return false;

  const canvaceador = idDeCampo(registro.canvaceador_id);
  if (canvaceador != null) return canvaceador === mio;

  return idDeCampo(registro.tecnico_id) === mio;
};

export const soloMisRegistros = (lista, usuario) => {
  if (!Array.isArray(lista)) return [];
  if (tieneVisionTotal(usuario)) return lista;
  return lista.filter(r => esMiRegistro(r, usuario));
};

export const paramsDeRegistrador = (usuario) => {
  if (tieneVisionTotal(usuario)) return {};

  const mio = idRegistrador(usuario);
  if (mio == null) return {};

  const rol = normalizarRol(usuario);
  if (rol === 'tecnico') return { tecnico_id: mio };
  return { canvaceador_id: mio };
};
