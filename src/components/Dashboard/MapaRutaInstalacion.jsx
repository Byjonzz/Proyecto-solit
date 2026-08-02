import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Stack, Chip, Alert, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Straighten, Timer, WifiTethering } from '@mui/icons-material';

import { obtenerRuta, formatearDistancia } from '../../services/rutaService';

const estilosMarcadores = `
  @keyframes pulsoTecnico {
    0%   { transform: scale(0.5); opacity: 0.55; }
    70%  { transform: scale(2.1); opacity: 0.07; }
    100% { transform: scale(2.5); opacity: 0;    }
  }'
  .marcador-tecnico { position: relative; width: 22px; height: 22px; }
  .marcador-tecnico .halo {
    position: absolute; inset: 0; border-radius: 50%;
    background: #2563eb; animation: pulsoTecnico 1.8s ease-out infinite;
  }
  .marcador-tecnico .punto {
    position: absolute; left: 4px; top: 4px; width: 14px; height: 14px;
    box-sizing: border-box; border-radius: 50%;
    background: #2563eb; border: 3px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.45);
  }
  .marcador-destino { font-size: 26px; line-height: 1; text-align: center; }
  /* Contrarresta el giro del contenedor para quedar siempre apuntando hacia
     arriba. La variable la pone el contenedor y se hereda hasta aquí, así el
     icono no se tiene que volver a crear en cada lectura del GPS. */
  .marcador-navegando {
    width: 38px; height: 38px;
    transform: rotate(var(--contragiro, 0deg));
  }
`;

const iconoTecnico = L.divIcon({
  className: 'wrapper-tecnico',
  html: '<div class="marcador-tecnico"><div class="halo"></div><div class="punto"></div></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

/** Flecha del técnico en modo navegación; siempre apunta hacia adelante. */
const iconoNavegando = L.divIcon({
  className: 'wrapper-tecnico',
  html: `
    <div class="marcador-navegando">
      <svg viewBox="0 0 38 38" width="38" height="38">
        <circle cx="19" cy="19" r="17" fill="#2563eb" fill-opacity="0.22" />
        <path d="M19 5 L29 30 L19 24 L9 30 Z"
              fill="#2563eb" stroke="#fff" stroke-width="2.5" stroke-linejoin="round" />
      </svg>
    </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19]
});

const modulo = (n, m) => ((n % m) + m) % m;

/** Diferencia con signo entre dos ángulos, siempre por el lado corto. */
const diferenciaAngular = (desde, hasta) => modulo(hasta - desde + 180, 360) - 180;

/** Cada cuánto se acerca el giro a su objetivo, en milisegundos. */
const MS_PASO_GIRO = 100;

/**
 * Ángulo del mapa, suavizado y sin saltos.
 *
 * Aplicar el rumbo directo al CSS tenía dos problemas. Uno: al cruzar el norte
 * el rumbo salta de 359° a 1°, y la transición de CSS interpola por el lado
 * largo, así que el mapa daba una vuelta completa hacia atrás en cada giro
 * hacia el norte. Dos: el rumbo del GPS tiembla unos grados aunque se vaya
 * derecho, y eso se veía como vibración.
 *
 * Se resuelve acumulando un ángulo continuo —puede pasar de 360 o de 0 sin
 * problema— al que se avanza siempre por el lado corto. El paso es adaptativo:
 * un giro de verdad se sigue rápido, el temblor se amortigua.
 */
const useGiroSuave = (rumbo, activo) => {
  const [angulo, setAngulo] = useState(-(rumbo || 0));
  const anguloRef = useRef(-(rumbo || 0));
  const objetivoRef = useRef(-(rumbo || 0));

  objetivoRef.current = -(rumbo || 0);

  useEffect(() => {
    if (!activo) return;

    const timer = setInterval(() => {
      const delta = diferenciaAngular(anguloRef.current, objetivoRef.current);
      if (Math.abs(delta) < 0.5) return;

      anguloRef.current += delta * (Math.abs(delta) > 40 ? 0.35 : 0.15);
      setAngulo(anguloRef.current);
    }, MS_PASO_GIRO);

    return () => clearInterval(timer);
  }, [activo]);

  return angulo;
};

const iconoDestino = L.divIcon({
  className: 'wrapper-destino',
  html: '<div class="marcador-destino">📍</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26]
});


const EncuadrarRuta = ({ puntos }) => {
  const map = useMap();
  const firma = puntos.map(p => p.join(',')).join('|');

  useEffect(() => {
    const timers = [150, 450].map(ms => setTimeout(() => map.invalidateSize(), ms));
    if (puntos.length >= 2) {
      map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40] });
    } else if (puntos.length === 1) {
      map.setView(puntos[0], 16);
    }
    return () => timers.forEach(clearTimeout);
  }, [firma, map]);

  return null;
};

const ADELANTO_CENTRO = 0.14;


const SeguirTecnico = ({ posicion, rumbo, zoom }) => {
  const map = useMap();

  useEffect(() => {
    // El contenedor va girado por CSS, así que arrastrar o hacer zoom con los
    // dedos daría coordenadas cruzadas. En navegación el mapa se maneja solo.
    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.touchZoom.disable();

    const timers = [150, 450].map(ms => setTimeout(() => map.invalidateSize(), ms));

    return () => {
      timers.forEach(clearTimeout);
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
    };
  }, [map]);

  useEffect(() => {
    if (!posicion) return;

    const desplazamiento = map.getSize().y * ADELANTO_CENTRO;
    const radianes = (rumbo || 0) * Math.PI / 180;

    // En píxeles proyectados la y crece hacia el sur, de ahí el signo del coseno.
    const punto = map.project([posicion.lat, posicion.lng], zoom)
      .add(L.point(
        Math.sin(radianes) * desplazamiento,
        -Math.cos(radianes) * desplazamiento
      ));

    map.setView(map.unproject(punto, zoom), zoom, { animate: true, duration: 0.4 });
  }, [map, posicion?.lat, posicion?.lng, rumbo, zoom]);

  return null;
};

/**
 * Mapa con la ruta más corta entre el técnico y el domicilio.
 *
 * @param {{lat:number,lng:number}} origen        posición del técnico
 * @param {{lat:number,lng:number}} destino       domicilio de la instalación
 * @param {string}                  etiquetaDestino
 * @param {number}                  alturaMapa
 * @param {(datos:{etaMinutos:number,distanciaMetros:number}) => void} onRutaCalculada
 * @param {string}                  actualizadoEn ISO de la última posición (vista oficina)
 * @param {boolean}                 modoNavegacion centra, sigue y gira con el técnico
 * @param {object}                  rutaPrecalculada ruta ya trazada por quien nos usa
 */
const MapaRutaInstalacion = ({
  origen,
  destino,
  etiquetaDestino = 'Domicilio del cliente',
  alturaMapa = 340,
  onRutaCalculada = null,
  actualizadoEn = null,
  buscandoOrigen = false,
  resumenGuardado = null,
  mensajeSinOrigen = null,
  modoNavegacion = false,
  rutaPrecalculada = null
}) => {
  const [rutaInterna, setRutaInterna] = useState(null);
  const [calculando, setCalculando] = useState(false);

  // En navegación la ruta la trae el hook (con las maniobras); pedirla otra vez
  // aquí sería una segunda llamada al ruteador por cada movimiento.
  const ruta = rutaPrecalculada || rutaInterna;
  const trazaPropia = !rutaPrecalculada;

  const claveOrigen = origen ? `${origen.lat.toFixed(4)},${origen.lng.toFixed(4)}` : null;
  const claveDestino = destino ? `${destino.lat.toFixed(4)},${destino.lng.toFixed(4)}` : null;

  useEffect(() => {
    if (!trazaPropia) return;
    if (!origen || !destino) return;
    let vigente = true;

    setCalculando(true);
    obtenerRuta(origen, destino)
      .then(resultado => {
        if (!vigente || !resultado) return;
        setRutaInterna(resultado);
        if (onRutaCalculada) {
          onRutaCalculada({
            etaMinutos: resultado.duracionMinutos,
            distanciaMetros: resultado.distanciaMetros
          });
        }
      })
      .finally(() => { if (vigente) setCalculando(false); });

    return () => { vigente = false; };

  }, [claveOrigen, claveDestino, trazaPropia]);

  const puntosEncuadre = useMemo(() => {
    const puntos = [];
    if (origen) puntos.push([origen.lat, origen.lng]);
    if (destino) puntos.push([destino.lat, destino.lng]);
    return puntos;
  }, [claveOrigen, claveDestino]);

  const navegando = modoNavegacion && Boolean(origen) && Boolean(destino);

  // Va antes del return de "sin coordenadas" porque es un hook: tiene que
  // ejecutarse siempre, en todos los renders.
  const anguloMapa = useGiroSuave(origen?.rumbo || 0, navegando);

  // El contenedor gira `anguloMapa` y la flecha gira lo contrario, así que se
  // cancelan exactamente y queda apuntando hacia adelante sin desfasarse.
  const contragiro = -anguloMapa;

  if (!destino) {
    return (
      <Alert severity="warning">
        El contrato no tiene coordenadas registradas, así que no se puede trazar la ruta.
        Usa la dirección escrita: <strong>{etiquetaDestino}</strong>.
      </Alert>
    );
  }

  const mapa = (
    <MapContainer
      center={navegando ? [origen.lat, origen.lng] : [destino.lat, destino.lng]}
      zoom={navegando ? 17 : 15}
      style={{ height: '100%', width: '100%' }}
      preferCanvas={true}
      zoomControl={!navegando}
      attributionControl={!navegando}
    >
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        attribution='&copy; Google Maps'
      />

      {navegando
        // Se le pasa el rumbo ya suavizado, el mismo que gira el mapa: si el
        // encuadre usara el crudo, el centro y la imagen irían desfasados.
        ? <SeguirTecnico posicion={origen} rumbo={contragiro} zoom={17} />
        : <EncuadrarRuta puntos={puntosEncuadre} />}

      {ruta && (
        <Polyline
          positions={ruta.coordenadas}
          pathOptions={{
            color: '#2563eb',
            weight: navegando ? 8 : 5,
            opacity: 0.8,
            dashArray: ruta.aproximada ? '8 8' : null
          }}
        />
      )}

      <Marker position={[destino.lat, destino.lng]} icon={iconoDestino} />

      {origen && (
        <>
          {!navegando && origen.precision && origen.precision < 500 && (
            <CircleMarker
              center={[origen.lat, origen.lng]}
              radius={Math.min(30, Math.max(6, origen.precision / 8))}
              pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.1 }}
            />
          )}
          <Marker
            position={[origen.lat, origen.lng]}
            icon={navegando ? iconoNavegando : iconoTecnico}
            zIndexOffset={1000}
          />
        </>
      )}
    </MapContainer>
  );

  return (
    <Box>
      <style>{estilosMarcadores}</style>

      {!modoNavegacion && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          {calculando && <Chip size="small" icon={<CircularProgress size={12} />} label="Calculando ruta..." />}
          {ruta && (
            <>
              <Chip size="small" icon={<Straighten />} label={formatearDistancia(ruta.distanciaMetros)} />
              <Chip size="small" icon={<Timer />} color="primary" label={`~${ruta.duracionMinutos} min`} />
              {ruta.aproximada && (
                <Chip size="small" color="warning" label="Estimación en línea recta (sin servicio de ruteo)" />
              )}
            </>
          )}

          {!ruta && !calculando && resumenGuardado?.distanciaMetros != null && (
            <Chip
              size="small"
              variant="outlined"
              icon={<Straighten />}
              label={`Ruta asignada: ${formatearDistancia(resumenGuardado.distanciaMetros)}`}
            />
          )}
          {!ruta && !calculando && resumenGuardado?.etaMinutos != null && (
            <Chip
              size="small"
              variant="outlined"
              icon={<Timer />}
              label={`Estimado ~${resumenGuardado.etaMinutos} min`}
            />
          )}
          {actualizadoEn && (
            <Chip
              size="small"
              icon={<WifiTethering />}
              label={`Posición: ${new Date(actualizadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
            />
          )}
        </Stack>
      )}

      {!origen && buscandoOrigen && (
        <Alert severity="info" icon={<CircularProgress size={16} />} sx={{ mb: 1.5 }}>
          Consultando la ubicación del técnico...
        </Alert>
      )}

      {!origen && !buscandoOrigen && (
        <Alert severity={mensajeSinOrigen ? 'warning' : 'info'} sx={{ mb: 1.5 }}>
          {mensajeSinOrigen ||
            'Aún no hay posición del técnico. Se mostrará en cuanto reporte su ubicación.'}
        </Alert>
      )}

      <Box
        sx={{
          width: '100%',
          height: alturaMapa,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          position: 'relative'
        }}
      >
        {navegando ? (
          // El mapa se gira entero con CSS y se dibuja más grande que su marco:
          // al rotar un rectángulo dentro de su propio tamaño quedarían las
          // esquinas vacías.
          <Box
            style={{ '--contragiro': `${contragiro}deg` }}
            sx={{
              position: 'absolute',
              top: '-25%',
              left: '-25%',
              width: '150%',
              height: '150%',
              transform: `rotate(${anguloMapa}deg)`,
              transformOrigin: '50% 50%',
              // Corta: el ángulo ya viene suavizado desde useGiroSuave, esto
              // solo rellena entre un paso y el siguiente.
              transition: `transform ${MS_PASO_GIRO}ms linear`
            }}
          >
            {mapa}
          </Box>
        ) : mapa}
      </Box>

      {!modoNavegacion && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Destino: {etiquetaDestino}
        </Typography>
      )}
    </Box>
  );
};

export default MapaRutaInstalacion;
