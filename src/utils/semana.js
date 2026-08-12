
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const diaDesdeLunes = (fecha) => (fecha.getDay() + 6) % 7;

export const lunesDeLaSemana = (fecha) => {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - diaDesdeLunes(d));
  return d;
};

export const domingoDeLaSemana = (lunes) => {
  const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const desplazarSemana = (lunes, semanas) =>
  new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + semanas * 7);

export const claveSemanaISO = (lunes) => {
  const jueves = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 3);
  const anio = jueves.getFullYear();
  const lunesDeLaSemana1 = lunesDeLaSemana(new Date(anio, 0, 4));
  const semana = 1 + Math.round((lunes - lunesDeLaSemana1) / (7 * MS_POR_DIA));
  return `${anio}-W${String(semana).padStart(2, '0')}`;
};

export const rangoLegible = (lunes) => {
  const domingo = domingoDeLaSemana(lunes);
  const mes = (d) => d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  const mismoMes = lunes.getMonth() === domingo.getMonth();
  return mismoMes
    ? `${lunes.getDate()} – ${domingo.getDate()} ${mes(domingo)} ${domingo.getFullYear()}`
    : `${lunes.getDate()} ${mes(lunes)} – ${domingo.getDate()} ${mes(domingo)} ${domingo.getFullYear()}`;
};

export const dentroDeLaSemana = (iso, lunes) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= lunes.getTime() && t <= domingoDeLaSemana(lunes).getTime();
};
