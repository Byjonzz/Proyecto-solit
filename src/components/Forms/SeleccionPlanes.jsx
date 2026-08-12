import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Download,
  Upload,
  Wifi,
  Tv,
  FiberManualRecord,
  EmojiEvents,
  SignalCellularAlt
} from '@mui/icons-material';
import { usePlanes } from '../../hooks/usePlanes';

// Cada categoría guarda el nombre lógico de su icono y aquí se traduce al set de
// esta pantalla. Así el catálogo no depende de qué iconos tenga instalado el
// frontend, y uno desconocido cae en el genérico en vez de romper la vista.
const ICONOS = {
  fibra: FiberManualRecord,
  wifi: Wifi,
  tv: Tv,
  antena: SignalCellularAlt,
  trofeo: EmojiEvents,
  chip: SignalCellularAlt
};

const IconoCategoria = ({ clave, color }) => {
  const Icono = ICONOS[clave] || FiberManualRecord;
  return <Icono sx={{ color, fontSize: 14 }} />;
};

const TarjetaPlan = ({ plan, seleccionado, onSelect }) => {
  return (
    <Card 
      onClick={() => onSelect(plan)}
      sx={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 2,
        overflow: 'hidden',
        border: seleccionado ? '2px solid #1976d2' : '1px solid #e0e0e0',
        transition: 'all 0.2s ease',
        transform: seleccionado ? 'scale(1.02)' : 'scale(1)',
        boxShadow: seleccionado ? '0 4px 12px rgba(25, 118, 210, 0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
        }
      }}
    >
      {plan.destacado && (
        <Box sx={{
          position: 'absolute',
          top: 6,
          right: -22,
          backgroundColor: '#ff9800',
          color: 'white',
          px: 2.5,
          py: 0.3,
          fontSize: '0.6rem',
          fontWeight: 700,
          transform: 'rotate(45deg)',
          zIndex: 2
        }}>
          POPULAR
        </Box>
      )}
      <Box sx={{ background: plan.colorGradient, py: 1, textAlign: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 800, letterSpacing: 0.5, fontSize: '0.85rem' }}>
          {plan.nombre}
        </Typography>
      </Box>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#1a1a1a', lineHeight: 1 }}>
            ${plan.precio}
          </Typography>
          <Typography sx={{ color: '#d63384', fontSize: '0.7rem', fontWeight: 600 }}>
            mensual
          </Typography>
        </Box>
        <Divider sx={{ my: 0.8 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
          <Download sx={{ color: '#9c27b0', fontSize: 14 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.75rem' }}>
            Bajada: <strong>{plan.descarga}Mbps</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
          <Upload sx={{ color: '#9c27b0', fontSize: 14 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.75rem' }}>
            Subida: <strong>{plan.subida}Mbps</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.6 }}>
          <Wifi sx={{ color: '#d63384', fontSize: 14 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
            <strong style={{ color: plan.simetrica ? '#4CAF50' : '#ff9800' }}>
              {plan.simetrica ? 'Simétrica' : 'Asimétrica'}
            </strong>
          </Typography>
        </Box>
        {plan.canales && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
            <Tv sx={{ color: '#2196F3', fontSize: 14 }} />
            <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
              <strong>{plan.canales}</strong>
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 0.8 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 12 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
            Mensualidad fija
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 12 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.7rem' }}>
            Sin plazo forzoso
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8 }}>
          <CheckCircle sx={{ color: '#d63384', fontSize: 12 }} />
          <Typography variant="caption" sx={{ color: '#333', fontSize: '0.65rem' }}>
            IFT: {plan.ift}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          fullWidth 
          size="small" 
          sx={{ 
            background: plan.colorGradient, 
            py: 0.6, 
            fontWeight: 700, 
            borderRadius: 1.5, 
            textTransform: 'none', 
            fontSize: '0.75rem', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)', 
            '&:hover': { opacity: 0.9 } 
          }}
        >
          {seleccionado ? '✓ Seleccionado' : 'Me Interesa'}
        </Button>
      </CardContent>
    </Card>
  );
};

const TablaPlanes = ({ planes, seleccionadoId, onSelect, titulo, subtitulo, colorPrincipal }) => {
  const color = colorPrincipal || '#26a69a';
  return (
    <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: `2px solid ${color}`, background: `linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)` }}>
      <Box sx={{ p: 1.5, textAlign: 'center', background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'white', letterSpacing: 1, fontSize: '0.95rem' }}>
          {titulo}
        </Typography>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, fontSize: '0.7rem' }}>
          {subtitulo}
        </Typography>
      </Box>
      <Box sx={{ p: 1 }}>
        {planes.map((plan) => (
          <Box 
            key={plan.id} 
            onClick={() => onSelect(plan)} 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              mb: 0.4, 
              borderRadius: 1, 
              overflow: 'hidden', 
              cursor: 'pointer', 
              border: seleccionadoId === plan.id ? '2px solid #1976d2' : '1px solid #e0e0e0', 
              backgroundColor: seleccionadoId === plan.id ? '#e3f2fd' : 'white', 
              transition: 'all 0.2s', 
              '&:hover': { backgroundColor: '#e0f7fa', transform: 'scale(1.01)' } 
            }}
          >
            <Typography sx={{ p: 0.8, textAlign: 'center', textDecoration: 'underline', fontWeight: 600, color: '#333', fontSize: '0.8rem' }}>
              {plan.nombre}
            </Typography>
            <Typography sx={{ p: 0.8, textAlign: 'center', fontWeight: 700, color: color, borderLeft: '1px solid #b2ebf2', fontSize: '0.85rem' }}>
              ${plan.precio}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

const SeleccionPlanes = ({ planSeleccionado, onPlanSeleccionado }) => {
  const { categorias, loading, error } = usePlanes();

  const [tabActiva, setTabActiva] = useState(0);
  const handleChangeTab = (event, newValue) => {
    setTabActiva(newValue);
  };

  // El catálogo se refresca solo: si administración borra o desactiva la
  // categoría que estaba abierta, hay que volver a una válida o la vista se
  // quedaría en blanco.
  useEffect(() => {
    if (tabActiva > categorias.length - 1) setTabActiva(0);
  }, [categorias.length, tabActiva]);
  const handleSeleccionar = (plan) => { 
    onPlanSeleccionado(plan); 
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Cargando planes disponibles...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error al cargar los planes: {error}
      </Alert>
    );
  }

  if (categorias.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No hay planes disponibles. Por favor, crea planes en el módulo de Administración.
      </Alert>
    );
  }

  // El color de la pestaña activa manda sobre el subrayado, para que al
  // renombrar o recolorear una categoría todo se mueva junto.
  const colorActivo = categorias[tabActiva]?.color || '#d63384';

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a', fontSize: '0.9rem' }}>
        Selecciona tu Paquete
      </Typography>
      
      <Tabs 
        value={tabActiva} 
        onChange={handleChangeTab} 
        variant="scrollable" 
        scrollButtons="auto" 
        sx={{ 
          mb: 2, 
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', minHeight: 36, py: 0.8 },
          '& .Mui-selected': { color: `${colorActivo} !important` },
          '& .MuiTabs-indicator': { backgroundColor: colorActivo }
        }}
      >
        {categorias.map((cat) => (
          <Tab
            key={cat.id}
            icon={<IconoCategoria clave={cat.icono} color={cat.color} />}
            label={cat.nombre}
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Box sx={{ minHeight: 400 }}>
        {categorias.map((cat, index) => (
          tabActiva === index && (
            <Box key={cat.id}>
              {cat.descripcion && (
                <Box sx={{ mb: 2, p: 1, backgroundColor: cat.colorFondo, borderRadius: 1, borderLeft: `3px solid ${cat.colorBorde}` }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: cat.colorTexto, fontSize: '0.75rem' }}>
                    {cat.descripcion}
                  </Typography>
                </Box>
              )}

              {cat.esTabla ? (
                <Box sx={{ maxWidth: 600 }}>
                  <TablaPlanes
                    planes={cat.planes}
                    seleccionadoId={planSeleccionado?.id}
                    onSelect={handleSeleccionar}
                    titulo={cat.nombre.toUpperCase()}
                    subtitulo={cat.descripcion || ''}
                    colorPrincipal={cat.colorBorde}
                  />
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {cat.planes.map((plan) => (
                    <Grid size={{ xs: 12, sm: 4 }} key={plan.id}>
                      <TarjetaPlan 
                        plan={plan} 
                        seleccionado={planSeleccionado?.id === plan.id} 
                        onSelect={handleSeleccionar} 
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )
        ))}
      </Box>
      
      {planSeleccionado && (
        <Paper sx={{ 
          mt: 2, 
          p: 1.5, 
          backgroundColor: '#e8f5e9', 
          borderRadius: 2, 
          border: '2px solid #4CAF50', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5 
        }}>
          <CheckCircle sx={{ color: '#4CAF50', fontSize: 28 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#2e7d32', display: 'block', fontSize: '0.8rem' }}>
              Plan: {planSeleccionado.nombre}
            </Typography>
            <Typography variant="caption" sx={{ color: '#555', fontSize: '0.75rem' }}>
              ${planSeleccionado.precio}/mes • {planSeleccionado.descarga || planSeleccionado.velocidad}Mbps
            </Typography>
          </Box>
          <Chip label="✓ Confirmado" color="success" size="small" sx={{ fontWeight: 700 }} />
        </Paper>
      )}
    </Box>
  );
};

export default SeleccionPlanes;