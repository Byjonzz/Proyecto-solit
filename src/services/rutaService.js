const OSRM_BASE = import.meta.env?.VITE_OSRM_URL || 'https://router.project-osrm.org';

const VELOCIDAD_FALLBACK_KMH = 25;

const RADIO_TIERRA_M = 6371000;

export const distanciaEnMetros = (lat1, lng1, lat2, lng2) => {
  const aRad = (g) => (g * Math.PI) / 180;
  const dLat = aRad(lat2 - lat1);
  const dLng = aRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(a)));
};

/**
 * Rumbo en grados (0 = norte, 90 = este) del punto 1 al punto 2.
 *
 * El navegador solo entrega `coords.heading` cuando el aparato va en
 * movimiento y con GPS fino; el resto del tiempo llega en null, así que hay
 * que deducirlo comparando dos lecturas seguidas.
 */
export const rumboEnGrados = (lat1, lng1, lat2, lng2) => {
  const aRad = (g) => (g * Math.PI) / 180;
  const dLng = aRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(aRad(lat2));
  const x = Math.cos(aRad(lat1)) * Math.sin(aRad(lat2)) -
    Math.sin(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const rutaEnLineaRecta = (origen, destino) => {
  const metros = distanciaEnMetros(origen.lat, origen.lng, destino.lat, destino.lng);
  return {
    coordenadas: [[origen.lat, origen.lng], [destino.lat, destino.lng]],
    distanciaMetros: metros,
    duracionMinutos: Math.max(1, Math.round((metros / 1000) / VELOCIDAD_FALLBACK_KMH * 60)),
    aproximada: true,
    pasos: []
  };
};

/**
 * @param {{lat:number,lng:number}} origen
 * @param {{lat:number,lng:number}} destino
 * @param {{conPasos?:boolean}} opciones  conPasos trae las maniobras giro a giro
 * @returns {Promise<{coordenadas:Array<[number,number]>, distanciaMetros:number, duracionMinutos:number, aproximada:boolean, pasos:Array}>}
 */
export const obtenerRuta = async (origen, destino, { conPasos = false } = {}) => {
  if (!origen || !destino) return null;

  const coords = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson${conPasos ? '&steps=true' : ''}`;

  try {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 8000);

    const respuesta = await fetch(url, { signal: controlador.signal });
    clearTimeout(timeout);

    if (!respuesta.ok) throw new Error(`OSRM respondió ${respuesta.status}`);

    const datos = await respuesta.json();
    const ruta = datos?.routes?.[0];
    if (!ruta?.geometry?.coordinates?.length) throw new Error('Ruta vacía');

    return {
      coordenadas: ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanciaMetros: Math.round(ruta.distance),
      duracionMinutos: Math.max(1, Math.round(ruta.duration / 60)),
      aproximada: false,
      pasos: (ruta.legs || []).flatMap(tramo => tramo.steps || [])
    };
  } catch (error) {
    console.warn('No se pudo calcular la ruta por calle, se usa línea recta:', error?.message);
    return rutaEnLineaRecta(origen, destino);
  }
};

export const formatearDistancia = (metros) => {
  if (metros == null) return '—';
  if (metros < 1000) return `${metros} m`;
  return `${(metros / 1000).toFixed(1)} km`;
};

export const formatearDuracion = (segundos) => {
  if (segundos == null || isNaN(segundos)) return '—';
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return h > 0
    ? `${h}h ${dosDigitos(m)}m ${dosDigitos(seg)}s`
    : `${dosDigitos(m)}m ${dosDigitos(seg)}s`;
};
