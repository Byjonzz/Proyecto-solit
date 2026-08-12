import { distanciaEnMetros } from './rutaService';

export const RADIO_LLEGADA_M = 40;

export const FUERA_DE_RUTA_M = 60;

const VENTANA_ATRAS = 30;

const GIROS = {
  'sharp right':  { texto: 'Gira cerrado a la derecha',       direccion: 'derecha' },
  'right':        { texto: 'Gira a la derecha',               direccion: 'derecha' },
  'slight right': { texto: 'Gira ligeramente a la derecha',   direccion: 'derecha' },
  'straight':     { texto: 'Sigue derecho',                   direccion: 'recto' },
  'slight left':  { texto: 'Gira ligeramente a la izquierda', direccion: 'izquierda' },
  'left':         { texto: 'Gira a la izquierda',             direccion: 'izquierda' },
  'sharp left':   { texto: 'Gira cerrado a la izquierda',     direccion: 'izquierda' },
  'uturn':        { texto: 'Da vuelta en U',                  direccion: 'u' }
};

const ladoDe = (modificador = '') =>
  modificador.includes('right') ? 'derecha' : modificador.includes('left') ? 'izquierda' : 'recto';

export const describirManiobra = (paso) => {
  const tipo = paso?.maneuver?.type || 'continue';
  const modificador = paso?.maneuver?.modifier || 'straight';
  const salida = paso?.maneuver?.exit;
  const calle = (paso?.name || '').trim();
  const giro = GIROS[modificador] || GIROS.straight;

  const conCalle = (texto, preposicion = 'en') =>
    calle ? `${texto} ${preposicion} ${calle}` : texto;

  switch (tipo) {
    case 'arrive':
      return { texto: 'Llegas al domicilio', direccion: 'destino' };

    case 'depart':
      return { texto: conCalle('Arranca', 'por'), direccion: 'recto' };

    case 'roundabout':
    case 'rotary':
      return {
        texto: salida
          ? `En la glorieta toma la salida ${salida}`
          : 'Entra a la glorieta',
        direccion: 'glorieta'
      };

    case 'exit roundabout':
    case 'exit rotary':
      return { texto: conCalle('Sal de la glorieta', 'hacia'), direccion: 'glorieta' };

    case 'merge':
      return { texto: conCalle('Incorpórate', 'a'), direccion: ladoDe(modificador) };

    case 'on ramp':
      return { texto: conCalle('Toma la incorporación', 'hacia'), direccion: ladoDe(modificador) };

    case 'off ramp':
      return { texto: conCalle('Toma la salida', 'hacia'), direccion: ladoDe(modificador) };

    case 'fork': {
      const lado = ladoDe(modificador);
      if (lado === 'recto') return { texto: conCalle('Continúa de frente', 'por'), direccion: 'recto' };
      return { texto: conCalle(`Mantente a la ${lado}`, 'hacia'), direccion: lado };
    }

    case 'new name':
    case 'continue':
    case 'notification':
      return modificador === 'straight'
        ? { texto: conCalle('Continúa', 'por'), direccion: 'recto' }
        : { texto: conCalle(giro.texto), direccion: giro.direccion };

    case 'end of road':
    case 'turn':
    default:
      return { texto: conCalle(giro.texto), direccion: giro.direccion };
  }
};

export const prepararNavegacion = (ruta) => {
  const coordenadas = ruta?.coordenadas || [];
  if (coordenadas.length < 2) return null;

  const acumulados = new Array(coordenadas.length);
  acumulados[0] = 0;
  for (let i = 1; i < coordenadas.length; i++) {
    const [latA, lngA] = coordenadas[i - 1];
    const [latB, lngB] = coordenadas[i];
    acumulados[i] = acumulados[i - 1] + distanciaEnMetros(latA, lngA, latB, lngB);
  }

  const largoM = acumulados[acumulados.length - 1];

  const maniobras = (ruta.pasos || [])
    .map((paso) => {
      const punto = paso?.maneuver?.location;
      if (!Array.isArray(punto) || punto.length < 2) return null;
      const [lng, lat] = punto;

      let indice = 0;
      let mejor = Infinity;
      for (let i = 0; i < coordenadas.length; i++) {
        const d = distanciaEnMetros(lat, lng, coordenadas[i][0], coordenadas[i][1]);
        if (d < mejor) { mejor = d; indice = i; }
      }

      const { texto, direccion } = describirManiobra(paso);
      return { avanceM: acumulados[indice], texto, direccion, calle: (paso.name || '').trim() };
    })
    .filter(Boolean)
    .filter((m) => m.avanceM > 0)
    .sort((a, b) => a.avanceM - b.avanceM);

  return { coordenadas, acumulados, maniobras, largoM };
};

export const estadoNavegacion = (nav, punto, indicePrevio = 0) => {
  if (!nav || !punto) return null;

  const { coordenadas, acumulados, maniobras, largoM } = nav;

  const desde = Math.max(0, indicePrevio - VENTANA_ATRAS);
  let indice = desde;
  let desvio = Infinity;
  for (let i = desde; i < coordenadas.length; i++) {
    const d = distanciaEnMetros(punto.lat, punto.lng, coordenadas[i][0], coordenadas[i][1]);
    if (d < desvio) { desvio = d; indice = i; }
  }

  const avanceM = acumulados[indice];
  const siguiente = maniobras.find((m) => m.avanceM > avanceM - 5) || null;

  return {
    indice,
    avanceM,
    desvioM: Math.round(desvio),
    fueraDeRuta: desvio > FUERA_DE_RUTA_M,
    maniobra: siguiente,
    distanciaManiobraM: siguiente ? Math.max(0, Math.round(siguiente.avanceM - avanceM)) : null,
    restanteM: Math.max(0, Math.round(largoM - avanceM))
  };
};

export const distanciaHablada = (metros) => {
  if (metros == null) return '';
  if (metros < 30) return 'ahora';
  if (metros < 1000) return `en ${Math.round(metros / 10) * 10} metros`;
  return `en ${(metros / 1000).toFixed(1).replace('.', ' punto ')} kilómetros`;
};
