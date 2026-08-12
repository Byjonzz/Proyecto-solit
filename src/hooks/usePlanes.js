import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useCategorias } from './useCategorias';
import { AMBITOS } from '../services/categoriasCatalogoService';
import { tonosDeCategoria } from '../utils/colores';

const MS_REFRESCO = 30000;

const normalizar = (valor) => (valor || '').toLowerCase().trim();

export const usePlanes = () => {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const { categorias: catalogo, loading: cargandoCategorias } = useCategorias(AMBITOS.INTERNET);

  const fetchPlanes = useCallback(async () => {
    try {
      const response = await api.get('/planes/');

      if (!Array.isArray(response.data)) {
        setPlanes([]);
        return;
      }

      setPlanes(response.data.filter(p => p.activo === true));
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanes();
    const interval = setInterval(fetchPlanes, MS_REFRESCO);
    return () => clearInterval(interval);
  }, [fetchPlanes]);

  useEffect(() => {
    window.addEventListener('storage', fetchPlanes);
    window.addEventListener('planesUpdated', fetchPlanes);

    return () => {
      window.removeEventListener('storage', fetchPlanes);
      window.removeEventListener('planesUpdated', fetchPlanes);
    };
  }, [fetchPlanes]);

  const catalogoPorNombre = useMemo(() => {
    const mapa = new Map();
    catalogo.forEach(c => mapa.set(normalizar(c.nombre), c));
    return mapa;
  }, [catalogo]);

  const transformarPlan = useCallback((plan) => {
    const categoria = catalogoPorNombre.get(normalizar(plan.categoria));

    return {
      id: plan.id,
      nombre: plan.nombre || 'Sin nombre',
      categoria: plan.categoria || '',
      precio: parseFloat(plan.precio) || 0,
      descarga: parseInt(plan.descarga) || parseInt(plan.velocidad) || 0,
      subida: parseInt(plan.subida) || parseInt(plan.velocidad) || 0,
      velocidad: parseInt(plan.velocidad) || 0,
      simetrica: plan.simetrica || false,
      canales: plan.canales || '',
      ift: plan.ift || '',
      destacado: plan.destacado || false,
      ...tonosDeCategoria(categoria?.color)
    };
  }, [catalogoPorNombre]);

  const categorias = useMemo(() => catalogo
    .filter(c => c.activo)
    .map(c => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      icono: c.icono || '',
      vista: c.vista || 'tarjetas',
      esTabla: (c.vista || 'tarjetas') === 'tabla',
      ...tonosDeCategoria(c.color),
      planes: planes
        .filter(p => normalizar(p.categoria) === normalizar(c.nombre))
        .map(transformarPlan)
    }))
    .filter(c => c.planes.length > 0),
    [catalogo, planes, transformarPlan]);

  const todosLosPlanes = useMemo(
    () => planes.map(transformarPlan),
    [planes, transformarPlan]
  );

  return {
    planes,
    categorias,
    todosLosPlanes,
    loading: loading || cargandoCategorias,
    error,
    refetch: fetchPlanes,
    lastUpdate
  };
};
