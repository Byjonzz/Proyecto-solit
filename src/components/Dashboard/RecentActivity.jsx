import React from 'react';
import { 
  Grid, Card, CardHeader, CardContent, Typography, Box, 
  List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Button 
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateIcon from '@mui/icons-material/Create';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PublicIcon from '@mui/icons-material/Public';

const RecentActivity = () => {
  const activities = [
    { id: 1, action: 'Sitio instalado', name: 'María Fernández', detail: 'Col. Jardines del Sur', time: 'Hace 30 min', icon: LocationOnIcon, bg: '#ecfdf5', text: '#059669' },
    { id: 2, action: 'Visita realizada', name: 'Juan Pérez', detail: 'Vimar a futuro', time: 'Hace 2 h', icon: VisibilityIcon, bg: '#eff6ff', text: '#2563eb' },
    { id: 3, action: 'Contrato firmado', name: 'Luis Mtz', detail: 'Carlos Pellicer', time: 'Hace 3 h', icon: CreateIcon, bg: '#fff7ed', text: '#ea580c' },
    { id: 4, action: 'Evidencia cargada', name: 'Instalación ANERF - 000048', detail: 'Sistema Central', time: 'Hace 5 h', icon: AttachFileIcon, bg: '#f3f4f6', text: '#4b5563' },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader 
            title={<Typography variant="subtitle1" fontWeight="bold">Actividad reciente</Typography>}
            subheader="Últimas acciones registradas en campo"
            sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa' }}
          />
          <CardContent sx={{ p: 0, flexGrow: 1 }}>
            <List disablePadding>
              {activities.map((act, index) => (
                <React.Fragment key={act.id}>
                  <ListItem sx={{ py: 2, px: 3, '&:hover': { bgcolor: '#f9fafb' } }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: act.bg, color: act.text, borderRadius: 2 }}>
                        <act.icon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography variant="body2" fontWeight="bold">{act.action}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{act.name} • {act.detail}</Typography>}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <AccessTimeIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{act.time}</Typography>
                    </Box>
                  </ListItem>
                  {index < activities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', textCenter: 'center' }}>
            <Button fullWidth size="small" fontWeight="bold" color="primary">
              Ver todas las actividades
            </Button>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(28, 53, 128, 0.1)', color: 'primary.main', borderRadius: 2 }}>
                <LocationOnIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">Casa SJM - 05 NMP-1036</Typography>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 180 }}><Typography variant="caption" color="text.secondary">Puntos libres:</Typography><Typography variant="caption" fontWeight="bold">0</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 180 }}><Typography variant="caption" color="text.secondary">Total puntos:</Typography><Typography variant="caption" fontWeight="bold">16</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 180, alignItems: 'center' }}><Typography variant="caption" color="text.secondary">Estado:</Typography><Typography variant="caption" fontWeight="bold" sx={{ color: '#059669', bgcolor: '#ecfdf5', px: 1, py: 0.2, borderRadius: 1 }}>Activo</Typography></Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 2, flexGrow: 1 }}>
            <Box sx={{ width: '100%', height: 140, borderRadius: 2, overflow: 'hidden', position: 'relative', border: '1px solid #e0e0e0' }}>
              <img 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&h=200&auto=format&fit=crop" 
                alt="Mapa satelital" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
              />
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, bgcolor: 'primary.main', borderRadius: '55%', border: '2px solid white', boxShadow: 3 }} />
            </Box>
          </Box>

          <Grid container sx={{ borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
            <Grid item xs={6} sx={{ p: 1.5, textCenter: 'center', borderRight: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, color: '#059669' }}>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight="bold">Instalado</Typography>
            </Grid>
            <Grid item xs={6} sx={{ p: 1.5, textCenter: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, color: '#2563eb' }}>
              <PublicIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight="bold">Conectado</Typography>
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

export default RecentActivity;