import React from 'react';
import { Box, Typography, Stack, IconButton, CircularProgress, Tooltip } from '@mui/material';
import {
  TurnLeft,
  TurnRight,
  Straight,
  UTurnLeft,
  RoundaboutLeft,
  Flag,
  VolumeUp,
  VolumeOff,
  AltRoute
} from '@mui/icons-material';

import { formatearDistancia } from '../../services/rutaService';

const ICONOS = {
  izquierda: TurnLeft,
  derecha: TurnRight,
  recto: Straight,
  u: UTurnLeft,
  glorieta: RoundaboutLeft,
  destino: Flag
};

/** La distancia al giro es lo que se lee de reojo: va en grande y redondeada. */
const distanciaCorta = (metros) => {
  if (metros == null) return '';
  if (metros < 20) return 'Ahora';
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1)} km`;
};

/**
 * Barra de instrucción giro a giro, al estilo de las apps de navegación.
 *
 * Se dibuja sobre el mapa y es lo único que el técnico alcanza a mirar mientras
 * maneja, así que la maniobra va en grande y el resto en chico.
 */
const BannerNavegacion = ({
  maniobra,
  distanciaM,
  restanteM,
  minutosRestantes,
  calculando = false,
  fueraDeRuta = false,
  llego = false,
  vozActiva = true,
  onToggleVoz = null
}) => {
  const Icono = ICONOS[maniobra?.direccion] || Straight;

  const encabezado = () => {
    if (llego) return { titulo: 'Llegaste al domicilio', detalle: 'Ya puedes marcar tu llegada.' };
    if (calculando) return { titulo: 'Trazando la ruta...', detalle: null };
    if (fueraDeRuta) return { titulo: 'Te saliste de la ruta', detalle: 'Recalculando el camino...' };
    if (!maniobra) return { titulo: 'Sigue el camino marcado', detalle: null };
    return { titulo: maniobra.texto, detalle: null };
  };

  const { titulo, detalle } = encabezado();

  return (
    <Box
      sx={{
        bgcolor: llego ? '#15803d' : '#1e293b',
        color: '#fff',
        borderRadius: 2,
        px: 2,
        py: 1.5,
        transition: 'background-color 0.3s ease'
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {calculando
            ? <CircularProgress size={26} sx={{ color: '#fff' }} />
            : fueraDeRuta
              ? <AltRoute sx={{ fontSize: 34 }} />
              : llego
                ? <Flag sx={{ fontSize: 34 }} />
                : <Icono sx={{ fontSize: 38 }} />}
        </Box>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {!llego && !calculando && !fueraDeRuta && distanciaM != null && (
            <Typography sx={{ fontWeight: 900, fontSize: '1.9rem', lineHeight: 1.1 }}>
              {distanciaCorta(distanciaM)}
            </Typography>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }}>
            {titulo}
          </Typography>
          {detalle && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {detalle}
            </Typography>
          )}
        </Box>

        {onToggleVoz && (
          <Tooltip title={vozActiva ? 'Silenciar indicaciones' : 'Activar indicaciones por voz'}>
            <IconButton
              onClick={onToggleVoz}
              sx={{ color: vozActiva ? '#fff' : 'rgba(255,255,255,0.45)' }}
            >
              {vozActiva ? <VolumeUp /> : <VolumeOff />}
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {!llego && (restanteM != null || minutosRestantes != null) && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.85)'
          }}
        >
          {restanteM != null && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Faltan {formatearDistancia(restanteM)}
            </Typography>
          )}
          {minutosRestantes != null && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ~{minutosRestantes} min
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default BannerNavegacion;
