import React, { useState, useRef } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { PhotoCamera, UploadFile, AddPhotoAlternate } from '@mui/icons-material';

import { procesarArchivoEvidencia } from '../../utils/evidencias';

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
