import React, { useState, useRef } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { PhotoCamera, UploadFile, AddPhotoAlternate } from '@mui/icons-material';

import { procesarArchivoEvidencia } from '../../utils/evidencias';

/**
 * Botón de captura de evidencia con dos formas de subirla.
 *
 * Al tocarlo pregunta si el usuario quiere tomar la foto o elegir un archivo ya
 * digitalizado (por ejemplo el recibo en PDF que el cliente descarga de CFE).
 * Ambas terminan en el mismo campo, así que no hace falta una columna aparte.
 *
 * Se usan dos <input type="file"> distintos a propósito: el atributo `capture`
 * no se puede alternar de forma confiable en el mismo input entre navegadores,
 * así que uno abre la cámara y el otro el explorador de archivos.
 */
const BotonEvidencia = ({
  etiqueta,
  cargada = false,
  onArchivo,
  onError,
  permitirPdf = false,
  icono = <AddPhotoAlternate />,
  color = 'primary',
  ...propsBoton
}) => {
  const [menuAncla, setMenuAncla] = useState(null);
  const inputCamaraRef = useRef(null);
  const inputArchivoRef = useRef(null);

  // Sin PDF permitido el botón no tiene por qué preguntar nada: abre la cámara.
  const abrir = (e) => {
    if (!permitirPdf) {
      inputCamaraRef.current?.click();
      return;
    }
    setMenuAncla(e.currentTarget);
  };

  const elegir = (ref) => {
    setMenuAncla(null);
    ref.current?.click();
  };

  const handleArchivo = async (e) => {
    const file = e.target.files?.[0];
    // Se limpia siempre para poder reelegir el mismo archivo si se equivocó.
    e.target.value = '';
    if (!file) return;

    try {
      const dataUri = await procesarArchivoEvidencia(file);
      onArchivo(dataUri, file);
    } catch (err) {
      if (onError) onError(err.message);
      else alert(err.message);
    }
  };

  return (
    <>
      <Button
        variant={cargada ? 'contained' : 'outlined'}
        color={cargada ? 'success' : color}
        startIcon={icono}
        onClick={abrir}
        {...propsBoton}
      >
        {cargada ? `✓ ${etiqueta}` : etiqueta}
      </Button>

      <Menu anchorEl={menuAncla} open={Boolean(menuAncla)} onClose={() => setMenuAncla(null)}>
        <MenuItem onClick={() => elegir(inputCamaraRef)}>
          <ListItemIcon><PhotoCamera fontSize="small" /></ListItemIcon>
          <ListItemText primary="Tomar foto" secondary="Con la cámara del dispositivo" />
        </MenuItem>
        <MenuItem onClick={() => elegir(inputArchivoRef)}>
          <ListItemIcon><UploadFile fontSize="small" /></ListItemIcon>
          <ListItemText primary="Subir archivo digital" secondary="PDF o imagen ya guardada" />
        </MenuItem>
      </Menu>

      <input
        ref={inputCamaraRef}
        type="file" hidden accept="image/*" capture="environment"
        onChange={handleArchivo}
      />
      <input
        ref={inputArchivoRef}
        type="file" hidden
        accept={permitirPdf ? 'image/*,application/pdf' : 'image/*'}
        onChange={handleArchivo}
      />
    </>
  );
};

export default BotonEvidencia;
