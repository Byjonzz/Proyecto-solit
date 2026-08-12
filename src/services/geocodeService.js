import api from './api';


const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    if (intento < reintentos) await esperar(700 * (intento + 1));
  }

  return { direccion: null, error: ultimoError };
};

export const crearGeocodificadorConRetardo = (alResolver, retardoMs = 600) => {
  let timer = null;
  let peticion = 0;

  const ejecutar = (lat, lng) => {
    clearTimeout(timer);
    const mia = ++peticion;

    timer = setTimeout(async () => {
      const resultado = await obtenerDireccion(lat, lng);
      if (mia === peticion) alResolver(resultado, lat, lng);
    }, retardoMs);
  };

  ejecutar.cancelar = () => clearTimeout(timer);
  return ejecutar;
};
