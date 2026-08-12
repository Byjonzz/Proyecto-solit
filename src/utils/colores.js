/**
 * Tonos derivados del color de una categoría.
 *
 * Cada pestaña necesita tres colores (borde, fondo y texto) más el degradado de
 * las tarjetas. Se calculan a partir de uno solo para que quien administre el
 * catálogo elija un color y no cuatro, y para que no puedan quedar
 * descoordinados entre sí.
 */

const COLOR_POR_DEFECTO = '#1976d2';

const aRgb = (hex) => {
  const limpio = String(hex || '').replace('#', '').trim();
  const completo = limpio.length === 3
    ? limpio.split('').map(c => c + c).join('')
    : limpio.padEnd(6, '0').slice(0, 6);
  const n = parseInt(completo, 16);
  if (Number.isNaN(n)) return aRgb(COLOR_POR_DEFECTO);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const aHex = ({ r, g, b }) => '#' + [r, g, b]
  .map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
  .join('');

/** Mezcla el color con blanco (destino 255) o negro (destino 0). */
const mezclar = (hex, destino, proporcion) => {
  const c = aRgb(hex);
  return aHex({
    r: c.r + (destino - c.r) * proporcion,
    g: c.g + (destino - c.g) * proporcion,
    b: c.b + (destino - c.b) * proporcion
  });
};

export const tonosDeCategoria = (color) => {
  const base = /^#?[0-9a-fA-F]{3,8}$/.test(String(color || '').trim())
    ? String(color).trim()
    : COLOR_POR_DEFECTO;

  return {
    color: base,
    colorBorde: base,
    // Muy lavado: es el fondo del panel, tiene que dejar leer el texto encima.
    colorFondo: mezclar(base, 255, 0.88),
    // Oscurecido para que el texto contraste contra ese fondo lavado.
    colorTexto: mezclar(base, 0, 0.3),
    colorGradient: `linear-gradient(135deg, ${base} 0%, ${mezclar(base, 255, 0.25)} 100%)`
  };
};
