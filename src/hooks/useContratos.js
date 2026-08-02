import { useState, useEffect } from 'react';
import { contratosService } from '../services/contratosService';

export const useContratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContratos = async () => {
    try {
      setLoading(true);
      const data = await contratosService.getAll();
      setContratos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      const data = await contratosService.getPendientes();
      setContratos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchByTecnico = async (tecnicoId) => {
    try {
      setLoading(true);
      const data = await contratosService.getByTecnico(tecnicoId);
      setContratos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createContrato = async (data) => {
    try {
      const nuevoContrato = await contratosService.create(data);
      setContratos([...contratos, nuevoContrato]);
      return nuevoContrato;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateContrato = async (id, data) => {
    try {
      const contratoActualizado = await contratosService.update(id, data);
      setContratos(contratos.map(c => c.id === id ? contratoActualizado : c));
      return contratoActualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const actualizarContrato = updateContrato;

  const asignarCita = async (id, data) => {
    try {
      const contratoActualizado = await contratosService.asignarCita(id, data);
      setContratos(contratos.map(c => c.id === id ? contratoActualizado : c));
      return contratoActualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const completarInstalacion = async (id, data) => {
    try {
      const contratoActualizado = await contratosService.patch(id, {
        estatus: 'Completado',
        ...data
      });
      setContratos(contratos.map(c => c.id === id ? contratoActualizado : c));
      return contratoActualizado;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteContrato = async (id) => {
    try {
      await contratosService.delete(id);
      setContratos(contratos.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };


  const fetchPendientesSilencioso = async () => {
    try {
      const data = await contratosService.getPendientes();
      setContratos(data);
    } catch (err) {
      console.warn('Recarga automática de contratos falló:', err?.message);
    }
  };

  useEffect(() => {
    fetchContratos();
  }, []);

  return {
    contratos,
    loading,
    error,
    createContrato,
    updateContrato,
    actualizarContrato,
    asignarCita,
    completarInstalacion,
    deleteContrato,
    refetch: fetchContratos,
    refetchPendientes: fetchPendientes,
    refetchPendientesSilencioso: fetchPendientesSilencioso,
    refetchByTecnico: fetchByTecnico
  };
};