import { useEffect, useRef, useState } from 'react';
import { getFaceDescriptor, loadFaceModels } from '../services/faceService';

type FaceCaptureProps = {
  onCapture: (descriptor: Float32Array) => void;
  buttonLabel?: string;
};

export default function FaceCapture({ onCapture, buttonLabel = 'Capture Face' }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'no_face' | 'captured' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;

    (async () => {
      setStatus('loading');
      try {
        await loadFaceModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
        setStatus('idle');
      } catch (err) {
        console.error('FaceCapture init error:', err);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(
            err instanceof Error && err.message.includes('model')
              ? 'Hindi ma-load ang face detection models. Kontakin ang admin.'
              : 'Hindi ma-access ang camera. Payagan ang camera permission.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setStatus('loading');
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setStatus('no_face');
        return;
      }
      setStatus('captured');
      onCapture(descriptor);
    } catch (err) {
      console.error('Face capture error:', err);
      setStatus('error');
      setErrorMsg('May error sa pag-detect ng mukha. Subukan ulit.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-lg border border-gray-200 w-[320px] h-[240px] bg-black"
      />

      <button
        onClick={handleCapture}
        disabled={!ready || status === 'loading'}
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {status === 'loading' ? 'Processing...' : buttonLabel}
      </button>

      {status === 'no_face' && (
        <p className="text-sm text-red-500">Walang nakitang face. I-center mo yung mukha mo sa camera at subukan ulit.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}