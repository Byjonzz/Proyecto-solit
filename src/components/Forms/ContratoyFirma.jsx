import React, { useState } from 'react';
import { 
  Grid, Card, CardContent, CardHeader, Typography, Box, 
  Button, Alert, Avatar, Divider, Chip 
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ContratoyFirma = () => {
  const [signature, setSignature] = useState(false);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight="bold">Contrato y firma</Typography>
        <Typography variant="body2" color="text.secondary">Recaba los archivos y la validación digital para concluir la orden de servicio.</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Tiempo estimado de instalación</Typography>
            <Typography variant="body2">Zona con cobertura de Fibra Óptica activa. Se valida infraestructura disponible en los postes adyacentes.</Typography>
          </Alert>

          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3 }}>
            <CardHeader title={<Typography variant="subtitle2" fontWeight="bold">Firma digital del titular</Typography>} />
            <Divider />
            <CardContent>
              <Box 
                onClick={() => setSignature(true)}
                sx={{ 
                  height: 180, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#fafafa',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5', borderColor: 'primary.main' },
                  transition: 'all 0.2s'
                }}
              >
                {signature ? (
                  <Box sx={{ textCenter: 'center', color: '#059669' }}>
                    <CheckCircleIcon sx={{ fontSize: 40, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body2" fontWeight="bold">Firma capturada correctamente</Typography>
                  </Box>
                ) : (
                  <Box sx={{ textCenter: 'center', color: 'text.disabled' }}>
                    <CreateIcon sx={{ fontSize: 32, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body2">Haz clic aquí para abrir el panel de firma digital</Typography>
                  </Box>
                )}
              </Box>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2, fontWeight: 'bold' }}
                onClick={() => setSignature(!signature)}
              >
                {signature ? 'Reiniciar panel de firma' : 'Simular Firma Física'}
              </Button>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3 }}>
            <CardHeader title={<Typography variant="subtitle2" fontWeight="bold">Evidencia fotográfica del domicilio</Typography>} />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ height: 130, borderRadius: 2, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary', cursor: 'pointer', '&:hover': { bgcolor: '#e5e7eb' } }}>
                    <CameraAltIcon sx={{ mb: 0.5 }} />
                    <Typography variant="caption" fontWeight="bold">Agregar Foto Fachada</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ height: 130, borderRadius: 2, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.secondary', cursor: 'pointer', '&:hover': { bgcolor: '#e5e7eb' } }}>
                    <CameraAltIcon sx={{ mb: 0.5 }} />
                    <Typography variant="caption" fontWeight="bold">Agregar Foto Detalle Poste</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3 }}>
            <CardHeader title={<Typography variant="subtitle2" fontWeight="bold">Datos de validación del cliente</Typography>} />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3f4f6', color: 'text.secondary', width: 36, height: 36 }}><PersonIcon fontSize="small" /></Avatar>
                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>TITULAR</Typography><Typography variant="body2" fontWeight="bold">Fernando López</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3f4f6', color: 'text.secondary', width: 36, height: 36 }}><PhoneIcon fontSize="small" /></Avatar>
                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>TELÉFONO</Typography><Typography variant="body2" fontWeight="bold">9871234567</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3f4f6', color: 'text.secondary', width: 36, height: 36 }}><EmailIcon fontSize="small" /></Avatar>
                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>EMAIL</Typography><Typography variant="body2" fontWeight="bold">fernando@example.com</Typography></Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#f3f4f6', color: 'text.secondary', width: 36, height: 36 }}><LocationOnIcon fontSize="small" /></Avatar>
                <Box><Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>DIRECCIÓN</Typography><Typography variant="body2" fontWeight="bold">Calle Principal 123</Typography></Box>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: '#059669', fontSize: 20 }} />
              <Typography variant="body2" fontWeight="bold" sx={{ color: '#047857' }}>Cotejo de Identificación Oficial</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#065f46', display: 'block', mt: 0.5, ml: 3.5 }}>Estatus: INE Válida y Guardada</Typography>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
        <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} sx={{ fontWeight: 'bold' }}>
          Regresar
        </Button>
        <Button variant="contained" color="primary" disableElevation sx={{ fontWeight: 'bold', px: 4 }}>
          Concluir Contrato e Instalar
        </Button>
      </Box>
    </Box>
  );
};

export default ContratoyFirma;