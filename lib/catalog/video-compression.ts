'use client';

export type VideoCompressionResult = {
  blob: Blob;
  originalSizeMB: number;
  compressedSizeMB: number;
  savedPercent: number;
  mimeType: string;
};

const MB = 1024 * 1024;

export async function compressProductVideo(
  file: File,
  onProgress: (percent: number) => void,
): Promise<VideoCompressionResult> {
  const originalSizeMB = +(file.size / MB).toFixed(2);

  if (file.size <= 4 * MB) {
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
    throw new Error('This browser cannot compress large videos. Please use Chrome/Edge or upload a video under 4 MB.');
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    let raf = 0;
    let recorder: MediaRecorder | null = null;

    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch {}
      cleanup();
      reject(new Error(message));
    };

    const timeout = window.setTimeout(() => fail('Video compression timed out. Please try a shorter video.'), 180000);

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.onerror = () => fail('The selected video could not be read by this browser. Try MP4 (H.264).');

    video.onloadedmetadata = async () => {
      try {
        let width = video.videoWidth || 1280;
        let height = video.videoHeight || 720;
        const maxDim = 1080;

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
        if (!mimeType) throw new Error('This browser does not support a compatible video encoder.');

        const outputStream = canvas.captureStream(25);
        const captureStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        const audioTrack = captureStream?.getAudioTracks?.()[0];
        if (audioTrack) outputStream.addTrack(audioTrack);

        recorder = new MediaRecorder(outputStream, {
          mimeType,
          videoBitsPerSecond: 1_600_000,
          audioBitsPerSecond: 96_000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onerror = () => fail('Video compression failed while encoding.');
        recorder.onstop = () => {
          if (settled) return;
          window.clearTimeout(timeout);
          const compressed = new Blob(chunks, { type: mimeType });
          if (!compressed.size) {
            fail('Video compression produced an empty file. Please try another MP4 video.');
            return;
          }
          if (compressed.size >= file.size) {
            fail('This video could not be reduced safely. Please trim it or use a smaller MP4 video.');
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

        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
        const draw = () => {
          if (video.ended || video.paused) return;
          ctx.drawImage(video, 0, 0, width, height);
          onProgress(Math.min(98, Math.max(1, Math.round((video.currentTime / duration) * 100))));
          raf = requestAnimationFrame(draw);
        };

        video.onended = () => {
          ctx.drawImage(video, 0, 0, width, height);
          onProgress(100);
          if (raf) cancelAnimationFrame(raf);
          if (recorder?.state !== 'inactive') recorder?.stop();
        };

        recorder.start(250);
        video.playbackRate = 2;
        await video.play();
        draw();
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Video compression failed.');
      }
    };
  });
}
