import api from './api';

const ENDPOINT = '/categorias_catalogo/';

export const AMBITOS = {
  INTERNET: 'internet',
  CHIP: 'chip'
};

// Iconos que puede elegir quien administre. La clave se guarda en la base y
// cada pantalla la traduce a su propio set, así el backend no sabe de MUI.
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

/**
 * Avisa a las pantallas abiertas que el catálogo cambió.
 *
 * Es el mismo evento que ya escuchaba usePlanes, así que al renombrar una
 * categoría desde administración, el formulario de contrato y el de prospectos
 * se actualizan sin que nadie recargue la página.
 */
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
