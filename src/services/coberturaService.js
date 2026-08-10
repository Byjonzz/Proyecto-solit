import api from './api';

const ENDPOINT = '/cobertura/cajas/';

/**
 * Cajas de distribución en vivo (espejo de ispcore.cv) más el polígono de
 * cobertura ya armado en el servidor.
 *
 * El timeout es más largo que los 15 s de `api`: casi siempre responde con la
 * caché del backend, pero cuando le toca refrescar baja cinco páginas del
 * origen con pausa entre ellas y esa vez sí tarda unos segundos.
 */
export const obtenerCobertura = async () => {
  const { data } = await api.get(ENDPOINT, { timeout: 60000 });
  return data;
};

export default { obtenerCobertura };
