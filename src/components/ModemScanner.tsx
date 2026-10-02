import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Scan,
  Zap,
  ArrowRight,
  ImageIcon,
  Video,
} from 'lucide-react';
import { ScannedModem } from '../types';

interface ModemScannerProps {
  onScanSuccess: (modem: ScannedModem) => void;
  activeModem?: ScannedModem | null;
  onFinishAccess?: () => void;
}

export const ModemScanner: React.FC<ModemScannerProps> = ({
  onScanSuccess,
  activeModem,
  onFinishAccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusStep, setScanStatusStep] = useState<string>('');
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setIsStartingCamera(false);
    setTorchOn(false);
  };

  // Safe camera stream acquisition with progressive fallbacks
  const acquireMediaStream = async (targetFacing: 'environment' | 'user'): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Câmera direta via WebRTC não suportada neste navegador.');
    }

    const withTimeout = <T,>(promise: Promise<T>, ms = 5000): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('A câmera demorou a responder.')), ms)
        ),
      ]);
    };

    // Attempt 1: Standard mobile camera resolution
    try {
      return await withTimeout(
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }),
        3500
      );
    } catch (e1) {
      console.warn('Tentativa 1 com resolução ideal falhou:', e1);
    }

    // Attempt 2: Simple facingMode
    try {
      return await withTimeout(
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        }),
        3000
      );
    } catch (e2) {
      console.warn('Tentativa 2 com facingMode falhou:', e2);
    }

    // Attempt 3: Any video device (fallback)
    return await withTimeout(
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      }),
      3000
    );
  };

  // Start Live WebRTC Camera
  const startCamera = async () => {
    try {
      setIsStartingCamera(true);
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      const mediaStream = await acquireMediaStream(facingMode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Play video silencioso:', playErr);
        }
      }

      setStream(mediaStream);
      setCameraActive(true);
      setIsStartingCamera(false);

      // Check torch capability safely
      try {
        const videoTrack = mediaStream.getVideoTracks()[0];
        const capabilities: any = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(Boolean(capabilities?.torch));
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Falha ao abrir stream ao vivo da câmera:', err?.message || err);
      setIsStartingCamera(false);
      setCameraActive(false);

      // In case live WebRTC fails or times out, suggest the native camera
      setCameraError(
        'A transmissão de vídeo ao vivo não pôde ser iniciada. Toque no botão "Abrir Câmera do Celular" abaixo para fotografar diretamente a etiqueta!'
      );
    }
  };

  // Open native mobile camera app (100% reliable on iOS Safari, Android Chrome, and WebViews)
  const openNativeCamera = () => {
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.value = '';
      nativeCameraInputRef.current.click();
    }
  };

  // Open gallery file selector
  const openGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Lanterna não suportada:', err);
      }
    }
  };

  // Toggle Camera Front / Back
  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraActive) {
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  // Compress & resize image to prevent huge mobile uploads and ensure fast OCR
  const compressImage = (fileOrDataUrl: File | string, maxDimension = 1400, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        }
      };
      img.onerror = () => {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Process image with Gemini API
  const processImageForModemData = async (base64Data: string) => {
    setIsScanning(true);
    setScanStatusStep('Iniciando análise de visão óptica da sua foto...');

    try {
      setScanStatusStep('Localizando IP, Usuário e Senha na etiqueta fotografada...');

      // Call server-side Gemini API endpoint
      const response = await fetch('/api/scan-modem-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      if (!response.ok) {
        throw new Error('Servidor retornou status ' + response.status);
      }

      setScanStatusStep('Extraindo credenciais reais da sua foto...');
      const result = await response.json();

      if (result.success && result.data) {
        const parsed = result.data;
        const brandName = parsed.brand || 'Roteador Identificado';
        const modelName = parsed.model || 'Padrão';

        const scannedModem: ScannedModem = {
          id: 'modem-' + Date.now(),
          ip: parsed.ip || '192.168.1.1',
          username: parsed.username || 'admin',
          password: parsed.password || 'admin',
          brand: brandName,
          model: modelName,
          wifiSsid: parsed.wifiSsid || (brandName ? `${brandName} Wi-Fi` : undefined),
          wifiPassword: parsed.wifiPassword || undefined,
          macAddress: parsed.macAddress || undefined,
          serialNumber: parsed.serialNumber || undefined,
          scannedAt: new Date().toISOString(),
          confidence: parsed.confidence || 'alta',
          notes: parsed.notes,
          sourceImage: base64Data,
        };

        setScanStatusStep(`Identificado: ${brandName}! Redirecionando...`);
        setTimeout(() => {
          setIsScanning(false);
          onScanSuccess(scannedModem);
        }, 600);
        return;
      }

      throw new Error(result.error || 'Não foi possível ler as informações.');
    } catch (err: any) {
      console.warn('Erro ao processar imagem:', err);

      setIsScanning(false);
      setCameraError(
        'A foto não ficou nítida o suficiente para ler o IP e a senha. Aproxime mais a câmera da etiqueta com boa iluminação e tente novamente.'
      );
      setCapturedImagePreview(null);
    }
  };

  // Capture Frame from Live Camera
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const optimizedDataUrl = await compressImage(rawDataUrl, 1400, 0.85);
    setCapturedImagePreview(optimizedDataUrl);

    processImageForModemData(optimizedDataUrl);
  };

  // Handle Photo from Native Camera or Gallery
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanStatusStep('Otimizando imagem para leitura rápida...');
      const optimizedDataUrl = await compressImage(file, 1400, 0.85);
      setCapturedImagePreview(optimizedDataUrl);
      processImageForModemData(optimizedDataUrl);
    } catch (err) {
      console.warn('Erro ao otimizar foto:', err);
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto">
      {/* Hidden Inputs for Native Camera & Gallery */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header Info */}
      <div className="flex flex-col gap-1.5 text-center px-2">
        <div className="inline-flex items-center justify-center gap-2 self-center px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-red-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Scanner Óptico com Leitura de IA</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Escanear Etiqueta do Modem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Abra a câmera e enquadre a etiqueta com <span className="text-red-600 font-bold">IP, Usuário e Senha</span> na base do roteador.
        </p>
      </div>

      {/* Main Viewfinder Box */}
      <div className={`relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-3xl overflow-hidden border-2 shadow-sm flex flex-col justify-center items-center transition-all ${
        cameraActive || capturedImagePreview ? 'bg-slate-950 border-slate-300' : 'bg-white border-slate-200'
      }`}>
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed */}
        {cameraActive && !capturedImagePreview && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Captured Image Preview */}
        {capturedImagePreview && (
          <img
            src={capturedImagePreview}
            alt="Etiqueta Capturada"
            className="absolute inset-0 w-full h-full object-contain bg-slate-950"
          />
        )}

        {/* State: Camera Standby or Error (Show Big Action Buttons in Light Theme & Red) */}
        {!cameraActive && !capturedImagePreview && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 gap-4 max-w-sm">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                <Camera className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                +
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Pronto para Escanear
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {cameraError || 'Fotografe a etiqueta na traseira do modem para extrair os dados e acessar automaticamente.'}
              </p>
            </div>

            {/* Direct Instant Action Buttons in VIBRANT RED */}
            <div className="flex flex-col w-full gap-2.5 pt-1">
              <button
                type="button"
                onClick={openNativeCamera}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-red-600/25 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Abrir Câmera do Celular</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isStartingCamera}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-red-600" />
                  <span>{isStartingCamera ? 'Iniciando...' : 'Câmera ao Vivo'}</span>
                </button>

                <button
                  type="button"
                  onClick={openGallery}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                  <span>Da Galeria</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Laser & Targeting Overlay */}
        {cameraActive && !isScanning && !capturedImagePreview && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-[85%] max-h-[75%] border-2 border-dashed border-red-500/60 rounded-2xl flex flex-col justify-between p-3 overflow-hidden backdrop-brightness-105">
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-scan-laser" />

              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg" />

              <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-red-300 font-bold bg-slate-950/80 px-2.5 py-1 rounded-md self-center">
                <span>Enquadre a Etiqueta</span>
              </div>

              <div className="text-center text-[11px] text-red-200 font-medium bg-slate-950/80 py-1 px-3 rounded-full self-center">
                Aperte "Capturar Foto" abaixo
              </div>
            </div>
          </div>
        )}

        {/* Scanning & Analyzing Animation */}
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 z-20">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center max-w-xs">
              <h3 className="text-base font-bold text-white mb-1">
                Lendo Etiqueta do Roteador...
              </h3>
              <p className="text-xs text-red-400 font-mono animate-pulse-subtle">
                {scanStatusStep}
              </p>
            </div>
          </div>
        )}

        {/* Live Camera Controls (Torch, Flip, Close) */}
        {cameraActive && !isScanning && (
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title="Lanterna"
                className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                  torchOn
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50'
                    : 'bg-slate-900/80 text-slate-200 border border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={switchCamera}
              title="Trocar Câmera"
              className="p-2.5 rounded-full bg-slate-900/80 text-slate-200 border border-slate-700/80 hover:bg-slate-800 backdrop-blur-md transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={stopCamera}
              title="Fechar Câmera ao Vivo"
              className="p-2.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/40 hover:bg-red-900 backdrop-blur-md transition-all cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Retake Photo Button */}
        {capturedImagePreview && !isScanning && (
          <button
            type="button"
            onClick={() => {
              setCapturedImagePreview(null);
            }}
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 transition-all z-10 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-600" />
            Tirar Outra Foto
          </button>
        )}
      </div>

      {/* Primary Action Buttons Bar for Live Camera */}
      {cameraActive && !capturedImagePreview && (
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={captureFrame}
            disabled={isScanning}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
          >
            <Scan className="w-5 h-5 text-white animate-pulse" />
            <span>Capturar Foto da Etiqueta</span>
          </button>
        </div>
      )}

      {/* Scanned Card Quick Preview if active */}
      {activeModem && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">
                Modem ativo: {activeModem.brand} {activeModem.model}
              </p>
              <p className="font-mono text-emerald-700 font-semibold">
                IP: {activeModem.ip} | Login: {activeModem.username}
              </p>
            </div>
          </div>
          {onFinishAccess && (
            <button
              type="button"
              onClick={onFinishAccess}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
            >
              Novo Acesso
            </button>
          )}
        </div>
      )}
    </div>
  );
};
