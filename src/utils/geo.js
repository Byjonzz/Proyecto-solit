export const extraerCoordenadas = (valor) => {
  const vacio = { texto: '', lat: '', lng: '' };
  if (!valor) return vacio;

  if (typeof valor === 'object' && Array.isArray(valor.coordinates)) {
    const [lng, lat] = valor.coordinates;
    if (lat == null || lng == null) return vacio;
    return { texto: `${lat}, ${lng}`, lat: String(lat), lng: String(lng) };
  }

  if (Array.isArray(valor) && valor.length === 2) {
    const [lat, lng] = valor;
    if (lat == null || lng == null) return vacio;
    return { texto: `${lat}, ${lng}`, lat: String(lat), lng: String(lng) };
  }

  if (typeof valor === 'string' && valor.includes('POINT')) {
    const dentro = valor.substring(valor.indexOf('(') + 1, valor.indexOf(')'));
    const partes = dentro.trim().split(/\s+/);
    if (partes.length === 2) {
      const [lng, lat] = partes;
      return { texto: `${lat}, ${lng}`, lat, lng };
    }
  }

  return vacio;
};

export const aPuntoNumerico = (valor) => {
  const { lat, lng } = extraerCoordenadas(valor);
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  return { lat: nLat, lng: nLng };
};

/**
 * Motivo por el que el navegador no puede dar la ubicación, o null si sí puede.
 *
 * El caso que más confunde es el contexto no seguro: si la app se abre por
 * http:// desde una IP de la red local (típico al probar en el celular), Chrome
 * bloquea la geolocalización sin preguntar nada, así que "no funciona el GPS"
 * sin ningún error visible.
 */
export const motivoGpsNoDisponible = () => {
  if (!('geolocation' in navigator)) {
    return 'Este navegador no soporta geolocalización.';
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return `El navegador bloquea la ubicación en sitios no seguros (${window.location.protocol}//${window.location.hostname}). ` +
      'Abre la app por HTTPS o desde localhost para poder compartir tu ubicación.';
  }
  return null;
};

/**
 * Ubicación estimada con la Geolocation API de Google (señales de red / IP).
 *
 * Es el respaldo para cuando el GPS del navegador no puede usarse (contexto
 * http, permiso negado, equipo sin GPS): no requiere permiso del usuario ni
 * contexto seguro, a cambio de menor precisión. El radio real de error viene
 * en `precision` (metros), igual que en obtenerPosicionActual.
 *
 * Ojo: la clave debe permitir la Geolocation API; las claves restringidas por
 * "referentes HTTP" son rechazadas por esta API (el error llega en `error`).
 */
export const obtenerUbicacionGoogle = async () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { punto: null, error: 'Falta VITE_GOOGLE_MAPS_API_KEY en el .env para usar la Geolocation API.' };
  }

  try {
    const respuesta = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ considerIp: true })
      }
    );
    const data = await respuesta.json().catch(() => null);

    if (!respuesta.ok || !data?.location) {
      return { punto: null, error: data?.error?.message || 'La Geolocation API no devolvió ubicación.' };
    }

    return {
      punto: { lat: data.location.lat, lng: data.location.lng, precision: data.accuracy ?? null },
      error: null
    };
  } catch (e) {
    return { punto: null, error: e?.message || 'No se pudo consultar la Geolocation API.' };
  }
};

/**
 * Una sola lectura del GPS, como promesa. Resuelve `{punto, error}` en vez de
 * rechazar, para que quien la use no tenga que envolverla en try/catch.
 */
export const obtenerPosicionActual = ({ timeout = 15000, maximumAge = 30000 } = {}) => {
  const motivo = motivoGpsNoDisponible();
  if (motivo) return Promise.resolve({ punto: null, error: motivo });

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        punto: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy
        },
        error: null
      }),
      (err) => resolve({
        punto: null,
        error: err?.code === 1
          ? 'Negaste el permiso de ubicación. Habilítalo en el navegador para que la oficina pueda verte.'
          : (err?.message || 'No se pudo obtener la ubicación.')
      }),
      { enableHighAccuracy: true, timeout, maximumAge }
    );
  });
};
