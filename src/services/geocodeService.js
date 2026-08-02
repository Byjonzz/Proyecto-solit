import api from './api';

/**
 * Traducción de coordenadas a dirección (geocodificación inversa).
 *
 * El endpoint del backend consulta Google Maps, que puede fallar de forma
 * transitoria: si el canvaceador mueve el pin varias veces seguidas se disparan
 * muchas peticiones en pocos segundos y Google llega a responder con error de
 * cuota. Cuando eso pasaba, el formulario caía en su `catch` y escribía las
 * coordenadas como si fueran la dirección, sin avisar de nada.
 *
 * Aquí se concentran el reintento y el mensaje de error para que ambos
 * formularios se comporten igual.
 */

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @returns {Promise<{direccion: string|null, error: string|null}>}
 */
export const obtenerDireccion = async (lat, lng, { reintentos = 2 } = {}) => {
  let ultimoError = null;

  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const { data } = await api.get('/reverse-geocode/', { params: { lat, lng } });

      if (data?.direccion) return { direccion: data.direccion, error: null };
      ultimoError = 'El servicio no encontró una dirección para ese punto.';
    } catch (err) {
      const status = err.response?.status;
      ultimoError = status === 500
        ? 'El servicio de mapas no respondió.'
        : (err.message || 'No se pudo consultar la dirección.');
    }

    // Espera creciente entre intentos: si Google limitó por ráfaga, insistir de
    // inmediato solo agrava el problema.
    if (intento < reintentos) await esperar(700 * (intento + 1));
  }

  return { direccion: null, error: ultimoError };
};

/**
 * Envuelve `obtenerDireccion` con un retardo, para que arrastrar el pin en el
 * mapa no genere una petición por cada movimiento.
 *
 * Devuelve una función con `.cancelar()` para limpiarla al desmontar.
 */
export const crearGeocodificadorConRetardo = (alResolver, retardoMs = 600) => {
  let timer = null;
  let peticion = 0;

  const ejecutar = (lat, lng) => {
    clearTimeout(timer);
    const mia = ++peticion;

    timer = setTimeout(async () => {
      const resultado = await obtenerDireccion(lat, lng);
      // Descarta respuestas de puntos que el usuario ya cambió.
      if (mia === peticion) alResolver(resultado, lat, lng);
    }, retardoMs);
  };

  ejecutar.cancelar = () => clearTimeout(timer);
  return ejecutar;
};
