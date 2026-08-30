'use client';

export type VideoCompressionResult = {
  blob: Blob;
  originalSizeMB: number;
  compressedSizeMB: number;
  savedPercent: number;
  mimeType: string;
};

const MB = 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * MB;
// Leave headroom for container overhead and browser encoder variance.
const TARGET_BYTES = Math.floor(3.35 * MB);

function chooseMaxDimension(durationSeconds: number) {
  if (durationSeconds <= 45) return 720;
  if (durationSeconds <= 90) return 540;
  return 360;
}

function chooseFrameRate(durationSeconds: number) {
  if (durationSeconds <= 45) return 20;
  if (durationSeconds <= 90) return 16;
  return 12;
}

export async function compressProductVideo(
  file: File,
  onProgress: (percent: number) => void,
): Promise<VideoCompressionResult> {
  const originalSizeMB = +(file.size / MB).toFixed(2);

  if (file.size <= MAX_UPLOAD_BYTES) {
    onProgress(100);
    return {
      blob: file,
      originalSizeMB,
      compressedSizeMB: originalSizeMB,
      savedPercent: 0,
      mimeType: file.type || 'video/mp4',
    };
  }

  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser cannot compress large videos. Please use the latest Chrome or Edge.');
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    let raf = 0;
    let recorder: MediaRecorder | null = null;
    let timeout = 0;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      try {
        const currentRecorder = recorder;
        if (currentRecorder && currentRecorder.state !== 'inactive') currentRecorder.stop();
      } catch {}
      cleanup();
      reject(new Error(message));
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.onerror = () => fail('The selected video could not be read by this browser. Please use MP4 (H.264) or WEBM.');

    video.onloadedmetadata = async () => {
      try {
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          throw new Error('Video duration could not be detected. Please try another MP4 video.');
        }

        timeout = window.setTimeout(
          () => fail('Video compression timed out before completion. Please keep the browser tab open and try again.'),
          Math.max(180000, Math.ceil(duration * 1000 * 1.6 + 60000)),
        );

        const maxDim = chooseMaxDimension(duration);
        let width = video.videoWidth || 1280;
        let height = video.videoHeight || 720;

        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        width = Math.max(2, width - (width % 2));
        height = Math.max(2, height - (height % 2));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Video compressor could not initialize.');

        const mimeCandidates = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
        ];
        const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
        if (!mimeType) throw new Error('This browser does not support a compatible video encoder. Please use Chrome or Edge.');

        const fps = chooseFrameRate(duration);
        const outputStream = canvas.captureStream(fps);

        const targetBits = TARGET_BYTES * 8;
        const calculatedBitrate = Math.floor((targetBits / duration) * 0.88);
        const videoBitrate = Math.max(24000, Math.min(900000, calculatedBitrate));

        const activeRecorder = new MediaRecorder(outputStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate,
        });
        recorder = activeRecorder;

        const chunks: Blob[] = [];
        activeRecorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };

        activeRecorder.onerror = () => fail('Video compression failed while encoding. Please retry in Chrome or Edge.');

        activeRecorder.onstop = () => {
          if (settled) return;

          const compressed = new Blob(chunks, { type: mimeType });
          if (!compressed.size) {
            fail('Video compression produced an empty file. Please try another MP4 video.');
            return;
          }

          if (compressed.size > MAX_UPLOAD_BYTES) {
            fail(
              `Compressed video is ${(compressed.size / MB).toFixed(2)} MB. It was blocked before Supabase upload because the final file must be under 4 MB.`,
            );
            return;
          }

          settled = true;
          cleanup();
          const compressedSizeMB = +(compressed.size / MB).toFixed(2);
          resolve({
            blob: compressed,
            originalSizeMB,
            compressedSizeMB,
            savedPercent: Math.max(0, Math.round(((file.size - compressed.size) / file.size) * 100)),
            mimeType,
          });
        };

        const draw = () => {
          if (video.ended) return;
          if (!video.paused) {
            ctx.drawImage(video, 0, 0, width, height);
            onProgress(Math.min(98, Math.max(1, Math.round((video.currentTime / duration) * 100))));
          }
          raf = requestAnimationFrame(draw);
        };

        video.onended = () => {
          ctx.drawImage(video, 0, 0, width, height);
          onProgress(100);
          if (raf) cancelAnimationFrame(raf);
          if (activeRecorder.state !== 'inactive') activeRecorder.stop();
        };

        activeRecorder.start(250);
        video.playbackRate = 1;
        await video.play();
        draw();
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Video compression failed.');
      }
    };
  });
}
