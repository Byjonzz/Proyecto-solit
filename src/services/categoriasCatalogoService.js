import api from './api';

const ENDPOINT = '/categorias_catalogo/';

export const AMBITOS = {
  INTERNET: 'internet',
  CHIP: 'chip'
};

export const ICONOS_CATEGORIA = [
  { clave: 'fibra', etiqueta: 'Fibra' },
  { clave: 'wifi', etiqueta: 'WiFi' },
  { clave: 'tv', etiqueta: 'Televisión' },
  { clave: 'antena', etiqueta: 'Antena' },
  { clave: 'trofeo', etiqueta: 'Destacado' },
  { clave: 'chip', etiqueta: 'Chip' }
];

export const VISTAS_CATEGORIA = [
  { clave: 'tarjetas', etiqueta: 'Tarjetas' },
  { clave: 'tabla', etiqueta: 'Tabla' }
];

export const avisarCatalogoActualizado = () => {
  window.dispatchEvent(new Event('planesUpdated'));
};

export const categoriasCatalogoService = {
  listar: async (ambito) => {
    const { data } = await api.get(ENDPOINT, { params: ambito ? { ambito } : {} });
    return Array.isArray(data) ? data : [];
  },

  crear: async (datos) => {
    const { data } = await api.post(ENDPOINT, datos);
    avisarCatalogoActualizado();
    return data;
  },

  actualizar: async (id, datos) => {
    const { data } = await api.patch(`${ENDPOINT}${id}/`, datos);
    avisarCatalogoActualizado();
    return data;
  },

  eliminar: async (id) => {
    await api.delete(`${ENDPOINT}${id}/`);
    avisarCatalogoActualizado();
  }
};
