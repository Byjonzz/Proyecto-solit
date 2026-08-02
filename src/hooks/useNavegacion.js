import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { obtenerRuta, distanciaEnMetros } from '../services/rutaService';
import {
  prepararNavegacion,
  estadoNavegacion,
  distanciaHablada,
  RADIO_LLEGADA_M
} from '../services/navegacionService';

/** Distancias a las que se avisa un giro, de lejos a cerca. */
const UMBRALES_AVISO = [400, 150, 40];

/** Lecturas seguidas fuera de la ruta antes de recalcular. */
const DESVIOS_PARA_RECALCULAR = 3;

/** Espera mínima entre recálculos, para no castigar el plan de datos. */
const MS_ENTRE_RECALCULOS = 15000;

/** Tiempo que una misma frase queda bloqueada para no repetirse. */
const MS_MINIMO_ENTRE_REPETICIONES = 10000;

/**
 * Navegación giro a giro hacia el domicilio de la instalación.
 *
 * Recalcula sola si el técnico se sale de la ruta y va cantando las maniobras
 * en voz alta, que es lo único que sirve cuando va manejando.
 *
 * @param {{lat:number,lng:number}} origen   posición viva del técnico
 * @param {{lat:number,lng:number}} destino  domicilio
 * @param {boolean} activo
 * @param {boolean} voz
 */
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
  // Cuándo se dijo cada frase. Es un mapa y no un solo dato porque el temblor
  // del GPS puede alternar entre dos maniobras, y comparando solo contra la
  // frase anterior las dos se cuelan una y otra vez.
  const dichosRef = useRef(new Map());
  const maniobraMaxRef = useRef(-Infinity);
  const llegadaAvisadaRef = useRef(false);
  const vozRef = useRef(voz);

  origenRef.current = origen || origenRef.current;
  vozRef.current = voz;

  const hablar = useCallback((texto) => {
    if (!vozRef.current || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    // Red de seguridad: una misma frase no se repite en caliente, pase lo que
    // pase más arriba. Decir dos veces seguidas lo mismo nunca ayuda.
    const ahora = Date.now();
    const previo = dichosRef.current.get(texto);
    if (previo != null && ahora - previo < MS_MINIMO_ENTRE_REPETICIONES) return;
    dichosRef.current.set(texto, ahora);

    // Se tiran las frases ya vencidas para que el mapa no crezca sin fin en un
    // traslado largo.
    if (dichosRef.current.size > 40) {
      dichosRef.current.forEach((enMs, frase) => {
        if (ahora - enMs > MS_MINIMO_ENTRE_REPETICIONES) dichosRef.current.delete(frase);
      });
    }

    try {
      const mensaje = new SpeechSynthesisUtterance(texto);
      mensaje.lang = 'es-MX';
      mensaje.rate = 1.05;
      // Se corta lo anterior: un aviso viejo encima del actual desorienta más
      // que ayudar cuando el giro ya está encima.
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(mensaje);
    } catch {
      // Si el navegador no deja hablar, la instrucción sigue viéndose en pantalla.
    }
  }, []);

  const claveDestino = destino ? `${destino.lat.toFixed(5)},${destino.lng.toFixed(5)}` : null;
  const hayOrigen = Boolean(origen);

  // Trazado de la ruta. Depende de que exista una posición, no de la posición
  // en sí: si dependiera del punto se recalcularía en cada lectura del GPS.
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
        // La ruta nueva se mide desde cero, así que el tope de avance anterior
        // ya no significa nada. `dichosRef` sí se conserva: evita que un
        // recálculo repita al instante la frase que se acaba de decir.
        maniobraMaxRef.current = -Infinity;
      })
      .finally(() => { if (vigente) setCalculando(false); });

    return () => { vigente = false; };
  }, [activo, hayOrigen, claveDestino, recalculos]);

  // Avance sobre la ruta, un cálculo por lectura del GPS.
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

    // Una vuelta ya pasada no se vuelve a anunciar. El avance puede retroceder
    // unos metros cuando el GPS tiembla, y sin esto la maniobra anterior
    // reaparecía y se cantaba de nuevo.
    if (maniobra.avanceM < maniobraMaxRef.current - 5) return;
    maniobraMaxRef.current = Math.max(maniobraMaxRef.current, maniobra.avanceM);

    // Cada maniobra se anuncia una vez por umbral: lejos, cerca y encima. La
    // clave va redondeada porque el avance se recalcula en cada lectura y unos
    // centímetros de diferencia no significan que sea otra maniobra.
    const clave = `${Math.round(maniobra.avanceM)}|${maniobra.texto}`;
    if (clave !== avisoRef.current.clave) {
      avisoRef.current = { clave, pendientes: [...UMBRALES_AVISO] };
    }

    const pendientes = avisoRef.current.pendientes;
    if (!pendientes.some((umbral) => distanciaManiobraM <= umbral)) return;

    const esPrimerAviso = pendientes.length === UMBRALES_AVISO.length;

    // Se dan por dichos TODOS los umbrales ya rebasados, no solo uno.
    //
    // Antes se consumía el primero de la lista por lectura del GPS, y cuando
    // una maniobra entraba estando ya cerca —dos vueltas seguidas, o el último
    // tramo hacia el domicilio— los tres umbrales se cumplían a la vez: el
    // parlante repetía la misma indicación tres veces, una por segundo.
    avisoRef.current.pendientes = pendientes.filter((umbral) => distanciaManiobraM > umbral);

    // El aviso de "ya la tienes encima" solo sirve si antes hubo uno de lejos.
    // Si la vuelta se cantó por primera vez estando ya cerca, repetirla unos
    // metros después no avisa nada nuevo.
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

  // Al cerrar el mapa no debe quedar una instrucción hablándose sola.
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
