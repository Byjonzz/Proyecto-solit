import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { PictureAsPdf, ZoomIn, OpenInNew } from '@mui/icons-material';

import { esPdf } from '../../utils/evidencias';

const VistaEvidencia = ({ valor, titulo, altura = 140, onAmpliar = null }) => {
  if (!valor) {
    return <Typography variant="caption" color="text.secondary">Sin archivo</Typography>;
  }

  if (esPdf(valor)) {
    return (
      <Box
        sx={{
          height: altura, borderRadius: 2, border: '1px solid #cbd5e1',
          bgcolor: '#fef2f2', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 0.5, p: 1
        }}
      >
        <PictureAsPdf sx={{ fontSize: 40, color: '#dc2626' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b' }}>
          Documento PDF
        </Typography>
        <Button
          size="small"
          startIcon={<OpenInNew />}
          onClick={() => onAmpliar ? onAmpliar() : window.open(valor, '_blank')}
          sx={{ textTransform: 'none' }}
        >
          Abrir
        </Button>
      </Box>
    );
  }

  return (
    <Box
      onClick={onAmpliar || undefined}
      sx={{
        position: 'relative', cursor: onAmpliar ? 'pointer' : 'default',
        '&:hover .lupa': { opacity: onAmpliar ? 1 : 0 }
      }}
    >
      <img
        src={valor}
        alt={titulo}
        style={{
          width: '100%', maxHeight: altura, objectFit: 'contain',
          borderRadius: 8, border: '1px solid #cbd5e1'
        }}
      />
      {onAmpliar && (
        <ZoomIn className="lupa" sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          opacity: 0, transition: '0.2s', color: '#1d4ed8',
          bgcolor: 'rgba(255,255,255,0.85)', borderRadius: '50%', p: 0.5, fontSize: 34
        }} />
      )}
    </Box>
  );
};

export default VistaEvidencia;
