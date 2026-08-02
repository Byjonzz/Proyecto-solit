import api from './api';

const ENDPOINT = '/prospectos/';

export const prospectosService = {
  
  /**
   * @param {{canvaceador_id?: number, tecnico_id?: number}} filtros
   *   Acota la consulta al registrador. Sin filtros devuelve todos.
   */
  getAll: async (filtros = {}) => {
    try {
      const response = await api.get(ENDPOINT, { params: filtros });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  
  getById: async (id) => {
    try {
      const response = await api.get(`${ENDPOINT}${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  
  create: async (data) => {
    try {
      const response = await api.post(ENDPOINT, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  
  update: async (id, data) => {
    try {
      const response = await api.put(`${ENDPOINT}${id}/`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateParcial: async (id, data) => {
    try {
      const response = await api.patch(`${ENDPOINT}${id}/`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  
  delete: async (id) => {
    try {
      const response = await api.delete(`${ENDPOINT}${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  
  getByEstado: async (estado) => {
    try {
      const response = await api.get(`${ENDPOINT}?estado=${estado}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};