import { useState, useEffect } from 'react';
import { prospectosService } from '../services/prospectosService';
import { paramsDeRegistrador } from '../utils/propiedad';

/**
 * @param {object} usuarioActual  Si se pasa, la consulta se acota a los
 *   prospectos que capturó ese usuario. Sin él devuelve todos (vista de oficina).
 */
export const useProspectos = (usuarioActual = null) => {
  const [prospectos, setProspectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Se serializa para poder usarlo como dependencia estable del efecto: el
  // objeto `usuarioActual` cambia de identidad en cada render del padre.
  const filtros = usuarioActual ? paramsDeRegistrador(usuarioActual) : {};
  const claveFiltros = JSON.stringify(filtros);

  const fetchProspectos = async () => {
    try {
      setLoading(true);
      const data = await prospectosService.getAll(JSON.parse(claveFiltros));
      setProspectos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspectos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFiltros]);

  const createProspecto = async (data) => {
    try {
      const nuevoProspecto = await prospectosService.create(data);
      setProspectos([...prospectos, nuevoProspecto]);
      return nuevoProspecto;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateProspecto = async (id, data) => {
    try {
      const prospectoActualizado = await prospectosService.update(id, data);
      setProspectos(prospectos.map(p => p.id === id ? prospectoActualizado : p));
      return prospectoActualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateEstadoProspecto = async (id, nuevoEstado) => {
    try {
      const actualizado = await prospectosService.updateParcial(id, { estado: nuevoEstado });
      setProspectos(prev => prev.map(p => p.id === id ? actualizado : p));
      return actualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteProspecto = async (id) => {
    try {
      await prospectosService.delete(id);
      setProspectos(prospectos.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    prospectos,
    loading,
    error,
    createProspecto,
    updateProspecto,
    updateEstadoProspecto,
    deleteProspecto,
    refetch: fetchProspectos
  };
};