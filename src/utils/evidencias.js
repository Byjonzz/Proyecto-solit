/**
 * Procesamiento de evidencias del contrato.
 *
 * Una evidencia puede llegar de dos formas: como foto tomada con la cámara o
 * como archivo ya digitalizado (el recibo que el cliente descarga de CFE suele
 * ser PDF). Ambas se guardan en el mismo campo de texto como data URI, así que
 * no hace falta una columna nueva; lo que cambia es cómo se procesan y cómo se
 * muestran después.
 */

// Las imágenes se recomprimen, así que el límite aplica al archivo original.
const MAX_MB_IMAGEN = 15;
// Un PDF no se puede recomprimir en el navegador: se guarda tal cual, y en
// base64 crece ~33%. Este tope evita meter documentos enormes a la base.
const MAX_MB_PDF = 4;

const MAX_LADO_PX = 1024;
const CALIDAD_JPEG = 0.6;

const mb = (bytes) => bytes / (1024 * 1024);

/** True si el valor guardado es un PDF y no una imagen. */
export const esPdf = (dataUri) =>
  typeof dataUri === 'string' && dataUri.startsWith('data:application/pdf');

/** Etiqueta legible del tipo de evidencia guardada. */
export const tipoEvidencia = (dataUri) => {
  if (!dataUri) return null;
  return esPdf(dataUri) ? 'PDF' : 'Imagen';
};

const comprimirImagen = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > MAX_LADO_PX) {
        height *= MAX_LADO_PX / width;
        width = MAX_LADO_PX;
      } else if (height > MAX_LADO_PX) {
        width *= MAX_LADO_PX / height;
        height = MAX_LADO_PX;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', CALIDAD_JPEG));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen. Intenta con otro archivo.'));
    img.src = event.target.result;
  };
  reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  reader.readAsDataURL(file);
});

const leerComoDataUri = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  reader.readAsDataURL(file);
});

/**
 * Convierte el archivo elegido en un data URI listo para guardar.
 *
 * @param {File} file
 * @returns {Promise<string>} data URI (JPEG comprimido o PDF tal cual)
 * @throws {Error} con un mensaje mostrable si el archivo no sirve
 */
export const procesarArchivoEvidencia = async (file) => {
  if (!file) throw new Error('No se seleccionó ningún archivo.');

  const esImagen = file.type.startsWith('image/');
  const esArchivoPdf = file.type === 'application/pdf';

  if (!esImagen && !esArchivoPdf) {
    throw new Error('Solo se aceptan imágenes (JPG, PNG) o documentos PDF.');
  }

  if (esArchivoPdf) {
    if (mb(file.size) > MAX_MB_PDF) {
      throw new Error(
        `El PDF pesa ${mb(file.size).toFixed(1)} MB y el máximo son ${MAX_MB_PDF} MB. ` +
        'Comprímelo o toma una foto del comprobante.'
      );
    }
    return leerComoDataUri(file);
  }

  if (mb(file.size) > MAX_MB_IMAGEN) {
    throw new Error(`La imagen pesa ${mb(file.size).toFixed(1)} MB. Toma la foto con menor resolución.`);
  }
  return comprimirImagen(file);
};
