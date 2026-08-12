
const MAX_MB_IMAGEN = 15;
const MAX_MB_PDF = 4;

const MAX_LADO_PX = 1024;
const CALIDAD_JPEG = 0.6;

const mb = (bytes) => bytes / (1024 * 1024);

export const esPdf = (dataUri) =>
  typeof dataUri === 'string' && dataUri.startsWith('data:application/pdf');

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
