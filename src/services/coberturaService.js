import api from './api';

const ENDPOINT = '/cobertura/cajas/';

export const obtenerCobertura = async () => {
  const { data } = await api.get(ENDPOINT, { timeout: 60000 });
  return data;
};

export default { obtenerCobertura };
