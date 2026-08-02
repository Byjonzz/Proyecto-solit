/**
 * Validaciones de captura en campo.
 *
 * El objetivo no es solo "que el campo no venga vacío", sino detectar relleno al
 * azar: un canvaceador con prisa escribe "asdasd" o "jjjj" para pasar de paso, y
 * ese registro llega a ventas como si fuera un prospecto real.
 *
 * Cada función devuelve `null` cuando el valor es aceptable, o un mensaje de
 * error listo para mostrar en el helperText del campo.
 */

const VOCALES = 'aeiouáéíóúü';

const quitarAcentos = (t) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Tramos de teclas contiguas. La lista está acotada a propósito a combinaciones
// que no existen en español: incluir tramos como 'ert' o 'rty' rechazaría
// nombres reales ("Alberto" contiene "ert").
const SECUENCIAS_TECLADO = [
  // fila central, en ambos sentidos
  'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
  'lkj', 'kjh', 'jhg', 'hgf', 'gfd', 'fds', 'dsa',
  // fila inferior
  'zxc', 'xcv', 'cvb', 'vbn', 'bnm',
  'mnb', 'nbv', 'bvc', 'vcx', 'cxz',
  // fila superior y numérica
  'qwe', 'qwerty', 'poiu', 'oiuy', 'iuyt',
  '1234', 'abcd'
];

/**
 * Detecta una palabra formada por un tramo corto repetido: "asdasd", "abcabc".
 * Solo aplica desde 6 letras y con unidades de 3 o más, para no marcar nombres
 * cortos con sílabas repetidas.
 */
const esPatronRepetido = (p) => {
  for (let unidad = 3; unidad <= Math.floor(p.length / 2); unidad++) {
    if (p.length % unidad !== 0) continue;
    const trozo = p.slice(0, unidad);
    if (trozo.repeat(p.length / unidad) === p) return true;
  }
  return false;
};

/**
 * Heurística de "esto no parece una palabra real".
 * Se evalúa palabra por palabra para no castigar nombres compuestos.
 */
const pareceAzar = (palabra) => {
  const p = quitarAcentos(palabra.toLowerCase());
  if (p.length < 2) return true;

  // Una palabra en español siempre trae vocales.
  const vocales = [...p].filter(c => VOCALES.includes(c)).length;
  if (vocales === 0) return true;

  // Proporción de vocales muy baja: "brtsklm".
  if (p.length >= 4 && vocales / p.length < 0.2) return true;

  // Tres letras iguales seguidas: "jjj", "aaaa".
  if (/(.)\1{2,}/.test(p)) return true;

  // Cinco consonantes seguidas no ocurren en nombres en español.
  if (/[^aeiou\s]{5,}/.test(p)) return true;

  // Tramos reconocibles de teclado.
  if (SECUENCIAS_TECLADO.some(seq => p.includes(seq))) return true;

  // Un mismo tramo repetido: "asdasd".
  if (esPatronRepetido(p)) return true;

  return false;
};

// Partículas que forman parte de apellidos compuestos pero no cuentan como
// apellido por sí solas: "María de los Ángeles Vázquez" son 3 partes reales.
const PARTICULAS = ['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'da', 'di', 'van', 'von', 'mac', 'mc'];

/**
 * Nombres de pila frecuentes en México.
 *
 * Solo se usan para dar un mensaje más claro cuando el capturista escribió puros
 * nombres ("Luis Ángel", "Juan Carlos") sin apellidos. No es un diccionario de
 * validación: un nombre que no esté en la lista no se rechaza por eso.
 */
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

/**
 * Nombre de persona.
 *
 * @param {string} valor
 * @param {{partesMinimas?: number}} opciones
 *   partesMinimas: cuántas partes reales se exigen. El estándar en documentos
 *   mexicanos es nombre(s) + apellido paterno + apellido materno, o sea 3.
 */
export const validarNombrePersona = (valor, { partesMinimas = 3 } = {}) => {
  const limpio = (valor || '').trim().replace(/\s+/g, ' ');

  if (!limpio) return 'El nombre es obligatorio';
  if (limpio.length < 5) return 'Escribe el nombre completo (mínimo 5 letras)';
  if (limpio.length > 100) return 'El nombre es demasiado largo';

  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/.test(limpio)) {
    return 'El nombre solo puede llevar letras';
  }

  const palabras = limpio.split(' ').filter(p => p.length > 0);

  // Las partículas ("de", "los") no cuentan como nombre ni apellido.
  const significativas = palabras.filter(
    p => !PARTICULAS.includes(quitarAcentos(p.toLowerCase()))
  );

  if (significativas.length === 0) return 'El nombre no parece válido';

  const sospechosa = significativas.find(p => p.length > 2 && pareceAzar(p));
  if (sospechosa) {
    return `"${sospechosa}" no parece un nombre real. Escribe el nombre del cliente`;
  }

  if (significativas.length < partesMinimas) {
    // Si todo lo escrito son nombres de pila, el problema es que faltan los
    // apellidos, no que el nombre sea corto.
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

/** Teléfono móvil de 10 dígitos. */
export const validarTelefonoMx = (valor, { obligatorio = true } = {}) => {
  const limpio = (valor || '').replace(/\D/g, '');

  if (!limpio) return obligatorio ? 'El teléfono es obligatorio' : null;
  if (limpio.length !== 10) return `Faltan ${10 - limpio.length} dígitos (deben ser 10)`;

  // Todos los dígitos iguales: 0000000000, 1111111111.
  if (/^(\d)\1{9}$/.test(limpio)) return 'Ese número no es válido (dígitos repetidos)';

  // Secuencias corridas: 1234567890, 0987654321.
  if ('01234567890'.includes(limpio) || '09876543210'.includes(limpio)) {
    return 'Ese número no es válido (dígitos en secuencia)';
  }

  // En México ninguna LADA empieza en 0 o 1.
  if (/^[01]/.test(limpio)) return 'Un número de México no empieza con 0 ni 1';

  return null;
};

/** Correo electrónico. */
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

  // Errores de dedo frecuentes al escribir dominios comunes.
  const tipos = {
    'gmail.co': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'hotmail.co': 'hotmail.com', 'hotmial.com': 'hotmail.com',
    'outlook.co': 'outlook.com', 'yahoo.co': 'yahoo.com.mx'
  };
  if (tipos[dominio]) return `¿Quisiste escribir @${tipos[dominio]}?`;

  return null;
};

/** Clave de elector del INE: 18 caracteres alfanuméricos en el formato oficial. */
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

/** Dirección escrita a mano. */
export const validarDireccion = (valor, { obligatorio = true, etiqueta = 'La dirección' } = {}) => {
  const limpio = (valor || '').trim().replace(/\s+/g, ' ');

  if (!limpio) return obligatorio ? `${etiqueta} es obligatoria` : null;
  if (limpio.length < 6) return `${etiqueta} está incompleta`;

  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(limpio)) return `${etiqueta} debe incluir el nombre de la calle`;

  // Evaluamos solo las palabras con letras: los números de casa son válidos.
  const palabrasTexto = limpio.split(' ').filter(p => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}$/.test(p));
  if (palabrasTexto.length > 0 && palabrasTexto.every(pareceAzar)) {
    return `${etiqueta} no parece real`;
  }

  return null;
};

/** Texto libre opcional (notas, referencias): solo bloquea el relleno al azar. */
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

/**
 * Aplica un mapa de validadores y devuelve `{ campo: mensaje }` solo con los
 * campos que fallaron. Un objeto vacío significa que el paso está listo.
 */
export const validarCampos = (definiciones) => {
  const errores = {};
  Object.entries(definiciones).forEach(([campo, validar]) => {
    const mensaje = validar();
    if (mensaje) errores[campo] = mensaje;
  });
  return errores;
};
