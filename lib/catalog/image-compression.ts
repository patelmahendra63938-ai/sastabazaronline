export type ProductImageOptimizationResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  originalBytes: number;
  optimizedBytes: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  savedPercent: number;
  convertedToWebp: boolean;
};

const MAX_IMAGE_DIMENSION = 1600;
const SMALL_WEBP_BYTES = 300 * 1024;

function chooseImageQuality(bytes: number) {
  if (bytes > 2 * 1024 * 1024) return 0.8;
  if (bytes > 1024 * 1024) return 0.82;
  if (bytes > 500 * 1024) return 0.84;
  return 0.86;
}

async function loadImage(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not decode selected image.'));
    });
    return { image, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function optimizeProductImageBeforeUpload(file: File): Promise<ProductImageOptimizationResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not a valid image.`);
  }

  const { image, objectUrl } = await loadImage(file);

  try {
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;

    if (!originalWidth || !originalHeight) {
      throw new Error('Selected image has invalid dimensions.');
    }

    const largestSide = Math.max(originalWidth, originalHeight);

    if (
      file.type === 'image/webp' &&
      file.size <= SMALL_WEBP_BYTES &&
      largestSide <= MAX_IMAGE_DIMENSION
    ) {
      return {
        blob: file,
        mimeType: 'image/webp',
        extension: 'webp',
        originalBytes: file.size,
        optimizedBytes: file.size,
        originalWidth,
        originalHeight,
        outputWidth: originalWidth,
        outputHeight: originalHeight,
        savedPercent: 0,
        convertedToWebp: false,
      };
    }

    const scale = largestSide > MAX_IMAGE_DIMENSION
      ? MAX_IMAGE_DIMENSION / largestSide
      : 1;

    const outputWidth = Math.max(1, Math.round(originalWidth * scale));
    const outputHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Image optimization is not available in this browser.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(image, 0, 0, outputWidth, outputHeight);

    const quality = chooseImageQuality(file.size);
    const webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('WebP conversion failed.')),
        'image/webp',
        quality,
      );
    });

    const resized = outputWidth !== originalWidth || outputHeight !== originalHeight;
    const useWebp = resized || webpBlob.size < file.size;
    const outputBlob = useWebp ? webpBlob : file;
    const outputMimeType = useWebp ? 'image/webp' : (file.type || 'image/jpeg');
    const extension = useWebp
      ? 'webp'
      : outputMimeType === 'image/png'
        ? 'png'
        : outputMimeType === 'image/webp'
          ? 'webp'
          : 'jpg';

    return {
      blob: outputBlob,
      mimeType: outputMimeType,
      extension,
      originalBytes: file.size,
      optimizedBytes: outputBlob.size,
      originalWidth,
      originalHeight,
      outputWidth: useWebp ? outputWidth : originalWidth,
      outputHeight: useWebp ? outputHeight : originalHeight,
      savedPercent: Math.max(0, Math.round(((file.size - outputBlob.size) / file.size) * 100)),
      convertedToWebp: useWebp,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
