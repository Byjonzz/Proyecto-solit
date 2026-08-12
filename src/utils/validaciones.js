
const VOCALES = 'aeiouáéíóúü';

const quitarAcentos = (t) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '');

const SECUENCIAS_TECLADO = [
  'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
  'lkj', 'kjh', 'jhg', 'hgf', 'gfd', 'fds', 'dsa',
  'zxc', 'xcv', 'cvb', 'vbn', 'bnm',
  'mnb', 'nbv', 'bvc', 'vcx', 'cxz',
  'qwe', 'qwerty', 'poiu', 'oiuy', 'iuyt',
  '1234', 'abcd'
];

const esPatronRepetido = (p) => {
  for (let unidad = 3; unidad <= Math.floor(p.length / 2); unidad++) {
    if (p.length % unidad !== 0) continue;
    const trozo = p.slice(0, unidad);
    if (trozo.repeat(p.length / unidad) === p) return true;
  }
  return false;
};

const pareceAzar = (palabra) => {
  const p = quitarAcentos(palabra.toLowerCase());
  if (p.length < 2) return true;

  const vocales = [...p].filter(c => VOCALES.includes(c)).length;
  if (vocales === 0) return true;

  if (p.length >= 4 && vocales / p.length < 0.2) return true;

  if (/(.)\1{2,}/.test(p)) return true;

  if (/[^aeiou\s]{5,}/.test(p)) return true;

  if (SECUENCIAS_TECLADO.some(seq => p.includes(seq))) return true;

  if (esPatronRepetido(p)) return true;

  return false;
};

const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'da', 'di', 'van', 'von', 'mac', 'mc'];

const NOMBRES_DE_PILA = new Set([
  'jose', 'juan', 'luis', 'carlos', 'miguel', 'jesus', 'antonio', 'francisco',
  'alejandro', 'ricardo', 'roberto', 'fernando', 'jorge', 'eduardo', 'javier',
  'daniel', 'david', 'rafael', 'manuel', 'pedro', 'angel', 'sergio', 'raul',
  'oscar', 'hector', 'arturo', 'alberto', 'enrique', 'ramon', 'gerardo',
  'guillermo', 'martin', 'ruben', 'victor', 'salvador', 'armando', 'ignacio',
  'maria', 'guadalupe', 'juana', 'margarita', 'josefina', 'veronica', 'leticia',
  'rosa', 'francisca', 'patricia', 'elizabeth', 'alejandra', 'martha', 'ana',
  'silvia', 'laura', 'carmen', 'gabriela', 'claudia', 'teresa', 'sandra',
  'yolanda', 'norma', 'lucia', 'sofia', 'fernanda', 'daniela', 'andrea',
  'valeria', 'ximena', 'regina', 'camila', 'natalia', 'paola', 'diana',
  'adriana', 'monica', 'lorena', 'karla', 'brenda', 'cristina', 'isabel'
]);

export const validarNombrePersona = (valor, { partesMinimas = 3 } = {}) => {
  const limpio = (valor || '').trim().replace(/\s+/g, ' ');

  if (!limpio) return 'El nombre es obligatorio';
  if (limpio.length < 5) return 'Escribe el nombre completo (mínimo 5 letras)';
  if (limpio.length > 100) return 'El nombre es demasiado largo';

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/.test(limpio)) {
    return 'El nombre solo puede llevar letras';
  }

  const palabras = limpio.split(' ').filter(p => p.length > 0);

  const significativas = palabras.filter(
    p => !PARTICULAS.includes(quitarAcentos(p.toLowerCase()))
  );

  if (significativas.length === 0) return 'El nombre no parece válido';

  const sospechosa = significativas.find(p => p.length > 2 && pareceAzar(p));
  if (sospechosa) {
    return `"${sospechosa}" no parece un nombre real. Escribe el nombre del cliente`;
  }

  if (significativas.length < partesMinimas) {
    const todosSonNombres = significativas.every(
      p => NOMBRES_DE_PILA.has(quitarAcentos(p.toLowerCase()))
    );

    if (todosSonNombres) {
      return 'Faltan los apellidos. Escribe nombre(s) y apellidos completos';
    }
    return significativas.length === 1
      ? 'Escribe el nombre completo: nombre(s) y apellidos'
      : 'Falta un apellido. Escribe nombre(s), apellido paterno y materno';
  }

  return null;
};

export const validarTelefonoMx = (valor, { obligatorio = true } = {}) => {
  const limpio = (valor || '').replace(/\D/g, '');

  if (!limpio) return obligatorio ? 'El teléfono es obligatorio' : null;
  if (limpio.length !== 10) return `Faltan ${10 - limpio.length} dígitos (deben ser 10)`;

  if (/^(\d)\1{9}$/.test(limpio)) return 'Ese número no es válido (dígitos repetidos)';

  if ('01234567890'.includes(limpio) || '09876543210'.includes(limpio)) {
    return 'Ese número no es válido (dígitos en secuencia)';
  }

  if (/^[01]/.test(limpio)) return 'Un número de México no empieza con 0 ni 1';

  return null;
};

export const validarCorreo = (valor, { obligatorio = true } = {}) => {
  const limpio = (valor || '').trim();

  if (!limpio) return obligatorio ? 'El correo es obligatorio' : null;
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(limpio)) {
    return 'El correo no tiene un formato válido (ejemplo@dominio.com)';
  }

  const [usuario, dominio] = limpio.toLowerCase().split('@');
  if (pareceAzar(usuario) && usuario.length > 3) {
    return 'La parte antes de la @ no parece válida';
  }

  const tipos = {
    'gmail.co': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'hotmail.co': 'hotmail.com', 'hotmial.com': 'hotmail.com',
    'outlook.co': 'outlook.com', 'yahoo.co': 'yahoo.com.mx'
  };
  if (tipos[dominio]) return `¿Quisiste escribir @${tipos[dominio]}?`;

  return null;
};

export const validarINE = (valor, { longitud = 16 } = {}) => {
  const limpio = (valor || '').trim();

  if (!limpio) return 'El INE es obligatorio';
  if (!/^\d+$/.test(limpio)) return 'El INE solo lleva números';
  if (limpio.length !== longitud) {
    return `El INE debe tener ${longitud} dígitos (llevas ${limpio.length})`;
  }
  if (/^(\d)\1+$/.test(limpio)) return 'Ese INE no es válido (dígitos repetidos)';
  if ('01234567890123456789'.includes(limpio)) return 'Ese INE no es válido (dígitos en secuencia)';

  return null;
};

export const validarDireccion = (valor, { obligatorio = true, etiqueta = 'La dirección' } = {}) => {
  const limpio = (valor || '').trim().replace(/\s+/g, ' ');

  if (!limpio) return obligatorio ? `${etiqueta} es obligatoria` : null;
  if (limpio.length < 6) return `${etiqueta} está incompleta`;

  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(limpio)) return `${etiqueta} debe incluir el nombre de la calle`;

  const palabrasTexto = limpio.split(' ').filter(p => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}$/.test(p));
  if (palabrasTexto.length > 0 && palabrasTexto.every(pareceAzar)) {
    return `${etiqueta} no parece real`;
  }

  return null;
};

export const validarTextoLibre = (valor, { etiqueta = 'El texto' } = {}) => {
  const limpio = (valor || '').trim();
  if (!limpio) return null;
  if (limpio.length < 4) return null;

  const palabras = limpio.split(/\s+/).filter(p => p.length >= 3);
  if (palabras.length > 0 && palabras.every(pareceAzar)) {
    return `${etiqueta} no parece contener información real`;
  }
  return null;
};

export const validarCampos = (definiciones) => {
  const errores = {};
  Object.entries(definiciones).forEach(([campo, validar]) => {
    const mensaje = validar();
    if (mensaje) errores[campo] = mensaje;
  });
  return errores;
};
