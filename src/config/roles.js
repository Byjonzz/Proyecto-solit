

export const ROLES = {
  CANVACEADOR: 'canvaceador',
  TECNICO: 'tecnico',
  LOGISTICA: 'logistica',
  ADMIN_VENTAS: 'admin_ventas',
  ADMIN: 'admin'
};


export const RUTAS_POR_ROL = {
  
  [ROLES.CANVACEADOR]: [
    'ventas-mis-contratos',
    'canvaceo-dashboard',
    'canvaceo-registro',
    'canvaceo-ruta',
    'ventas-contrato-directo',
    'ventas-seguimiento',
    'ventas-de-chips',
    'ventas-seguimiento'
  ],
  
  
  // Ojo: el primero de la lista es la pantalla con la que arranca el rol al
  // iniciar sesión (ver obtenerPrimeraRuta). Para el técnico eso es su trabajo
  // del día, no el alta de contratos.
  [ROLES.TECNICO]: [
    'tecnico-ejecucion',
    'tecnico-mis-instalaciones',
    'ventas-mis-contratos',
    'ventas-contrato-directo',
  ],
  
  
  [ROLES.LOGISTICA]: [
    'logistica-agenda',
    'logistica-seguimiento',
    'ventas-seguimiento'
  ],
  
  
  [ROLES.ADMIN_VENTAS]: [
    'ventas-mis-contratos',
    'canvaceo-dashboard',
    'canvaceo-registro',
    'canvaceo-ruta',
    'ventas-contrato-directo',
    'ventas-seguimiento',
    'admin-comisiones',
    'admin-asignacion-rutas',
    'ventas-de-chips'
  ],
  
  
  [ROLES.ADMIN]: [
    'canvaceo-dashboard',
    'ventas-mis-contratos',
    'canvaceo-registro',
    'canvaceo-ruta',
    'ventas-contrato-directo',
    'ventas-seguimiento',
    'logistica-agenda',
    'tecnico-ejecucion',
    'admin-comisiones',
    'admin-bono-proactividad',
    'admin-asignacion-rutas',
    'admin-planes',
    'admin-usuarios',
    'ventas-de-chips'
  ]
};


export const puedeAccederARuta = (rolUsuario, ruta) => {
  if (!rolUsuario || !ruta) return false;
  
  
  const rolNormalizado = rolUsuario.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  
  const rutasPermitidas = RUTAS_POR_ROL[rolNormalizado] || [];
  
  return rutasPermitidas.includes(ruta);
};


/**
 * Pantalla con la que arranca cada rol al iniciar sesión.
 *
 * Es la primera de RUTAS_POR_ROL, así que ese orden no es decorativo: mover un
 * elemento al principio cambia dónde cae la gente al entrar.
 */
export const obtenerPrimeraRuta = (rolUsuario) => {
  const rolNormalizado = rolUsuario.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const rutasPermitidas = RUTAS_POR_ROL[rolNormalizado] || [];
  return rutasPermitidas[0] || 'canvaceo-dashboard';
};


export const obtenerNombreRol = (rol) => {
  const nombres = {
    [ROLES.CANVACEADOR]: 'Canvaceador',
    [ROLES.TECNICO]: 'Técnico',
    [ROLES.LOGISTICA]: 'Logística',
    [ROLES.ADMIN_VENTAS]: 'Admin Ventas',
    [ROLES.ADMIN]: 'Administrador'
  };
  return nombres[rol] || rol;
};


export const obtenerColorRol = (rol) => {
  const colores = {
    [ROLES.CANVACEADOR]: '#3b82f6',    
    [ROLES.TECNICO]: '#10b981',        
    [ROLES.LOGISTICA]: '#f59e0b',      
    [ROLES.ADMIN_VENTAS]: '#8b5cf6',   
    [ROLES.ADMIN]: '#ef4444'           
  };
  return colores[rol] || '#6b7280';
};