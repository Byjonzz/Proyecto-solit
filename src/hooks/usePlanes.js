import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useCategorias } from './useCategorias';
import { AMBITOS } from '../services/categoriasCatalogoService';
import { tonosDeCategoria } from '../utils/colores';

const MS_REFRESCO = 30000;

/** Los nombres se comparan sin mayúsculas ni espacios de sobra. */
const normalizar = (valor) => (valor || '').toLowerCase().trim();

export const usePlanes = () => {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Las pestañas y sus colores salen del catálogo, no de una lista escrita a
  // mano: renombrar una categoría en administración se refleja aquí solo.
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

  // Índice por nombre normalizado, para colgarle a cada plan el color y la
  // forma de dibujarse de su categoría sin recorrer el catálogo por plan.
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

  /**
   * Las pestañas listas para dibujar: cada una con sus planes ya transformados.
   *
   * Solo salen las categorías activas y con planes. Una categoría recién creada
   * y todavía vacía existe en administración, pero no le aparece al vendedor
   * como una pestaña sin nada dentro.
   */
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

  // Todos los planes activos, incluso los de una categoría que ya no esté en el
  // catálogo: se usan para resolver el plan de un contrato por nombre, y ahí no
  // debe importar si su pestaña sigue existiendo.
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
