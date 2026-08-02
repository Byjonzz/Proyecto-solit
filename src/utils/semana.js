/**
 * Semanas de lunes a domingo, para los cortes de bonos.
 *
 * Se trabaja siempre con fechas locales y sin hora: el corte de la semana lo
 * define el calendario del negocio, no la zona horaria en que Django guardó la
 * marca de tiempo.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Día de la semana con el lunes en 0, que es como se cuenta aquí. */
const diaDesdeLunes = (fecha) => (fecha.getDay() + 6) % 7;

/** Lunes de la semana a la que pertenece la fecha, a las 00:00. */
export const lunesDeLaSemana = (fecha) => {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - diaDesdeLunes(d));
  return d;
};

/** Domingo de esa misma semana, al último milisegundo del día. */
export const domingoDeLaSemana = (lunes) => {
  const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Corre la semana hacia atrás o hacia adelante. */
export const desplazarSemana = (lunes, semanas) =>
  new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + semanas * 7);

/**
 * Clave ISO de la semana, del tipo `2026-W31`.
 *
 * Es lo que se guarda en `periodo_semana`. Se usa la numeración ISO —la semana
 * 1 es la que contiene el 4 de enero— porque a fin de año una misma semana cae
 * partida entre dos años y hay que decidir a cuál cuenta; el criterio ISO es
 * que manda el año del jueves.
 */
export const claveSemanaISO = (lunes) => {
  const jueves = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 3);
  const anio = jueves.getFullYear();
  const lunesDeLaSemana1 = lunesDeLaSemana(new Date(anio, 0, 4));
  const semana = 1 + Math.round((lunes - lunesDeLaSemana1) / (7 * MS_POR_DIA));
  return `${anio}-W${String(semana).padStart(2, '0')}`;
};

/** Rango legible para encabezados: "27 jul – 2 ago 2026". */
export const rangoLegible = (lunes) => {
  const domingo = domingoDeLaSemana(lunes);
  const mes = (d) => d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  const mismoMes = lunes.getMonth() === domingo.getMonth();
  return mismoMes
    ? `${lunes.getDate()} – ${domingo.getDate()} ${mes(domingo)} ${domingo.getFullYear()}`
    : `${lunes.getDate()} ${mes(lunes)} – ${domingo.getDate()} ${mes(domingo)} ${domingo.getFullYear()}`;
};

/**
 * ¿Esta marca de tiempo cae dentro de la semana?
 *
 * @param {string} iso  fecha ISO tal como la devuelve la API
 */
export const dentroDeLaSemana = (iso, lunes) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= lunes.getTime() && t <= domingoDeLaSemana(lunes).getTime();
};
