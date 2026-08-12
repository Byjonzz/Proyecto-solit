import { useState, useEffect, useRef, useCallback } from 'react';
import { instalacionesSeguimientoService } from '../services/instalacionesSeguimientoService';
import { distanciaEnMetros, rumboEnGrados } from '../services/rutaService';


const MOVIMIENTO_MINIMO_M = 60;

const MINUTOS_SIN_MOVIMIENTO = 8;

const MINUTOS_TOLERANCIA_ETA = 10;

const SEGUNDOS_ENTRE_REPORTES = 2;

const MS_REVISION = 15000;

const MS_POR_MINUTO = 60000;

const METROS_PARA_RUMBO = 12;

const VELOCIDAD_MINIMA_RUMBO = 0.6;

export const useMonitoreoTraslado = ({ instalacion, activo }) => {
  const [posicion, setPosicion] = useState(null);      
  const [alertaActiva, setAlertaActiva] = useState(null); 
  const [errorGps, setErrorGps] = useState(null);

  const watchIdRef = useRef(null);
  const posicionRef = useRef(null);

  const refMovimiento = useRef({ lat: null, lng: null, enMs: null });
  const ultimoReporteRef = useRef(0);

  const rumboRef = useRef(0);
  const refRumbo = useRef(null);

  const alertasEmitidasRef = useRef({ inactividad: false, demora: false });

  const instalacionId = instalacion?.instalacion_id ?? instalacion?.id ?? null;

  const registrarAlerta = useCallback(async (tipo, mensaje) => {
    const pos = posicionRef.current;
    setAlertaActiva({ tipo, mensaje, id: null });

    if (!instalacionId) return;
    try {
      const creada = await instalacionesSeguimientoService.crearAlerta({
        instalacionId, tipo, mensaje, lat: pos?.lat, lng: pos?.lng
      });
      setAlertaActiva(prev => (prev && prev.tipo === tipo ? { ...prev, id: creada.id } : prev));
    } catch (err) {
      console.warn('No se pudo registrar la alerta en el servidor:', err?.message);
    }
  }, [instalacionId]);

  useEffect(() => {
    if (!activo) return;
    if (!('geolocation' in navigator)) {
      setErrorGps('Este dispositivo no permite geolocalización.');
      return;
    }

    refMovimiento.current = { lat: null, lng: null, enMs: Date.now() };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;

        const anterior = refRumbo.current;
        if (heading != null && !Number.isNaN(heading) && (speed == null || speed > VELOCIDAD_MINIMA_RUMBO)) {
          rumboRef.current = heading;
        } else if (anterior && distanciaEnMetros(anterior.lat, anterior.lng, latitude, longitude) >= METROS_PARA_RUMBO) {
          rumboRef.current = rumboEnGrados(anterior.lat, anterior.lng, latitude, longitude);
        }
        if (!anterior || distanciaEnMetros(anterior.lat, anterior.lng, latitude, longitude) >= METROS_PARA_RUMBO) {
          refRumbo.current = { lat: latitude, lng: longitude };
        }

        const nueva = {
          lat: latitude,
          lng: longitude,
          precision: accuracy,
          rumbo: rumboRef.current,
          velocidad: speed ?? null
        };
        setPosicion(nueva);
        posicionRef.current = nueva;
        setErrorGps(null);

        const ref = refMovimiento.current;
        if (ref.lat == null) {
          refMovimiento.current = { lat: latitude, lng: longitude, enMs: Date.now() };
        } else {
          const avance = distanciaEnMetros(ref.lat, ref.lng, latitude, longitude);
          if (avance >= MOVIMIENTO_MINIMO_M) {
            refMovimiento.current = { lat: latitude, lng: longitude, enMs: Date.now() };
            alertasEmitidasRef.current.inactividad = false;
          }
        }

        const ahora = Date.now();
        if (instalacionId && ahora - ultimoReporteRef.current > SEGUNDOS_ENTRE_REPORTES * 1000) {
          ultimoReporteRef.current = ahora;
          instalacionesSeguimientoService
            .reportarUbicacion(instalacionId, latitude, longitude)
            .catch(err => console.warn('No se pudo reportar la ubicación:', err?.message));
        }
      },
      (error) => setErrorGps(error?.message || 'No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activo, instalacionId]);

  useEffect(() => {
    if (!activo) return;

    const revisar = () => {
      if (alertaActiva) return;

      const ahora = Date.now();

      const ref = refMovimiento.current;
      if (ref.enMs && !alertasEmitidasRef.current.inactividad) {
        const minutosQuieto = (ahora - ref.enMs) / MS_POR_MINUTO;
        if (minutosQuieto >= MINUTOS_SIN_MOVIMIENTO) {
          alertasEmitidasRef.current.inactividad = true;
          registrarAlerta(
            'inactividad',
            `¿Vas a seguir con la instalación? Llevas ${Math.floor(minutosQuieto)} minutos sin moverte.`
          );
          return;
        }
      }

      const aceptadaEn = instalacion?.fecha_aceptacion ? new Date(instalacion.fecha_aceptacion).getTime() : null;
      const eta = instalacion?.eta_minutos;
      if (aceptadaEn && eta && !alertasEmitidasRef.current.demora) {
        const minutosEnCamino = (ahora - aceptadaEn) / MS_POR_MINUTO;
        if (minutosEnCamino > eta + MINUTOS_TOLERANCIA_ETA) {
          alertasEmitidasRef.current.demora = true;
          registrarAlerta(
            'demora',
            `Ya te demoraste más de lo planeado en llegar al destino. Estimado: ${eta} min, llevas ${Math.floor(minutosEnCamino)} min.`
          );
        }
      }
    };

    const timer = setInterval(revisar, MS_REVISION);
    return () => clearInterval(timer);
  }, [activo, alertaActiva, instalacion?.fecha_aceptacion, instalacion?.eta_minutos, registrarAlerta]);

  const responderAlerta = useCallback(async (respuesta) => {
    const alerta = alertaActiva;
    setAlertaActiva(null);

    refMovimiento.current = { ...refMovimiento.current, enMs: Date.now() };

    if (alerta?.id) {
      try {
        await instalacionesSeguimientoService.responderAlerta(alerta.id, respuesta);
      } catch (err) {
        console.warn('No se pudo guardar la respuesta a la alerta:', err?.message);
      }
    }
  }, [alertaActiva]);

  return { posicion, alertaActiva, responderAlerta, errorGps };
};
