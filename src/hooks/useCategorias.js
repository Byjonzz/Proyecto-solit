import { useState, useEffect, useCallback } from 'react';
import { categoriasCatalogoService, AMBITOS } from '../services/categoriasCatalogoService';

const MS_REFRESCO = 30000;

export const useCategorias = (ambito = AMBITOS.INTERNET) => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await categoriasCatalogoService.listar(ambito);
      setCategorias(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, [ambito]);

  useEffect(() => {
    fetchCategorias();
    const intervalo = setInterval(fetchCategorias, MS_REFRESCO);
    window.addEventListener('planesUpdated', fetchCategorias);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('planesUpdated', fetchCategorias);
    };
  }, [fetchCategorias]);

  return { categorias, loading, error, refetch: fetchCategorias };
};
