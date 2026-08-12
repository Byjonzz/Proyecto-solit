import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { obtenerRuta, distanciaEnMetros } from '../services/rutaService';
import {
  prepararNavegacion,
  estadoNavegacion,
  distanciaHablada,
  RADIO_LLEGADA_M
} from '../services/navegacionService';

const UMBRALES_AVISO = [400, 150, 40];

const DESVIOS_PARA_RECALCULAR = 3;

const MS_ENTRE_RECALCULOS = 15000;

const MS_MINIMO_ENTRE_REPETICIONES = 10000;

export const useNavegacion = ({ origen, destino, activo, voz = true }) => {
  const [ruta, setRuta] = useState(null);
  const [estado, setEstado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [recalculos, setRecalculos] = useState(0);

  const navRef = useRef(null);
  const indiceRef = useRef(0);
  const origenRef = useRef(null);
  const desviosRef = useRef(0);
  const ultimoRecalculoRef = useRef(0);
  const avisoRef = useRef({ clave: null, pendientes: [] });
  const dichosRef = useRef(new Map());
  const maniobraMaxRef = useRef(-Infinity);
  const llegadaAvisadaRef = useRef(false);
  const vozRef = useRef(voz);

  origenRef.current = origen || origenRef.current;
  vozRef.current = voz;

  const hablar = useCallback((texto) => {
    if (!vozRef.current || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    const ahora = Date.now();
    const previo = dichosRef.current.get(texto);
    if (previo != null && ahora - previo < MS_MINIMO_ENTRE_REPETICIONES) return;
    dichosRef.current.set(texto, ahora);

    if (dichosRef.current.size > 40) {
      dichosRef.current.forEach((enMs, frase) => {
        if (ahora - enMs > MS_MINIMO_ENTRE_REPETICIONES) dichosRef.current.delete(frase);
      });
    }

    try {
      const mensaje = new SpeechSynthesisUtterance(texto);
      mensaje.lang = 'es-MX';
      mensaje.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(mensaje);
    } catch {
    }
  }, []);

  const claveDestino = destino ? `${destino.lat.toFixed(5)},${destino.lng.toFixed(5)}` : null;
  const hayOrigen = Boolean(origen);

  useEffect(() => {
    if (!activo || !destino || !hayOrigen) return;

    let vigente = true;
    setCalculando(true);

    obtenerRuta(origenRef.current, destino, { conPasos: true })
      .then((resultado) => {
        if (!vigente || !resultado) return;
        setRuta(resultado);
        navRef.current = prepararNavegacion(resultado);
        indiceRef.current = 0;
        avisoRef.current = { clave: null, pendientes: [] };
        maniobraMaxRef.current = -Infinity;
      })
      .finally(() => { if (vigente) setCalculando(false); });

    return () => { vigente = false; };
  }, [activo, hayOrigen, claveDestino, recalculos]);

  useEffect(() => {
    if (!activo || !origen || !navRef.current) return;

    const nuevo = estadoNavegacion(navRef.current, origen, indiceRef.current);
    if (!nuevo) return;

    indiceRef.current = nuevo.indice;
    setEstado(nuevo);

    if (nuevo.fueraDeRuta) {
      desviosRef.current += 1;
      const listo = desviosRef.current >= DESVIOS_PARA_RECALCULAR &&
        Date.now() - ultimoRecalculoRef.current > MS_ENTRE_RECALCULOS;
      if (listo) {
        ultimoRecalculoRef.current = Date.now();
        desviosRef.current = 0;
        hablar('Te saliste de la ruta, recalculando');
        setRecalculos((n) => n + 1);
      }
      return;
    }
    desviosRef.current = 0;

    const { maniobra, distanciaManiobraM } = nuevo;
    if (!maniobra || distanciaManiobraM == null) return;

    if (maniobra.avanceM < maniobraMaxRef.current - 5) return;
    maniobraMaxRef.current = Math.max(maniobraMaxRef.current, maniobra.avanceM);

    const clave = `${Math.round(maniobra.avanceM)}|${maniobra.texto}`;
    if (clave !== avisoRef.current.clave) {
      avisoRef.current = { clave, pendientes: [...UMBRALES_AVISO] };
    }

    const pendientes = avisoRef.current.pendientes;
    if (!pendientes.some((umbral) => distanciaManiobraM <= umbral)) return;

    const esPrimerAviso = pendientes.length === UMBRALES_AVISO.length;

    avisoRef.current.pendientes = pendientes.filter((umbral) => distanciaManiobraM > umbral);

    if (esPrimerAviso && distanciaManiobraM <= UMBRALES_AVISO[1]) {
      avisoRef.current.pendientes = [];
    }

    hablar(`${distanciaHablada(distanciaManiobraM)}, ${maniobra.texto}`);
  }, [origen, activo, hablar]);

  const distanciaDestinoM = useMemo(() => {
    if (!origen || !destino) return null;
    return distanciaEnMetros(origen.lat, origen.lng, destino.lat, destino.lng);
  }, [origen, destino]);

  const llego = distanciaDestinoM != null && distanciaDestinoM <= RADIO_LLEGADA_M;

  useEffect(() => {
    if (!activo || !llego || llegadaAvisadaRef.current) return;
    llegadaAvisadaRef.current = true;
    hablar('Llegaste al domicilio. Ya puedes marcar tu llegada.');
  }, [activo, llego, hablar]);

  useEffect(() => {
    if (activo) return;
    llegadaAvisadaRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [activo]);

  const minutosRestantes = useMemo(() => {
    if (!ruta || !estado?.restanteM || !ruta.distanciaMetros) return ruta?.duracionMinutos ?? null;
    const proporcion = estado.restanteM / ruta.distanciaMetros;
    return Math.max(1, Math.round(ruta.duracionMinutos * proporcion));
  }, [ruta, estado?.restanteM]);

  return {
    ruta,
    calculando,
    maniobra: estado?.maniobra || null,
    distanciaManiobraM: estado?.distanciaManiobraM ?? null,
    restanteM: estado?.restanteM ?? null,
    minutosRestantes,
    fueraDeRuta: Boolean(estado?.fueraDeRuta),
    distanciaDestinoM,
    llego,
    radioLlegadaM: RADIO_LLEGADA_M
  };
};
