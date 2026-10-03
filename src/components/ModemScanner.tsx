import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Scan,
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

  // Stop Camera stream
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
      throw new Error('Câmera direta via navegador não suportada neste aplicativo. Use o botão "Tirar Foto da Etiqueta".');
    }

    // Attempt 1: Standard mobile camera with back camera requested
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      // ignore and try next
    }

    // Attempt 2: Simple facingMode
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacing },
        audio: false,
      });
    } catch {
      // ignore and try next
    }

    // Attempt 3: Any video device (fallback)
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  };

  // Start Live WebRTC Camera
  const startCamera = async (isAutoMount = false) => {
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
        } catch {
          // Play video silent fail
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
      setIsStartingCamera(false);
      setCameraActive(false);
      // If failed automatically on page load due to mobile browser autoplay policy, do not show an aggressive error, just wait for user tap
      if (!isAutoMount) {
        setCameraError(
          'Para usar a câmera ao vivo, permita o acesso à câmera quando o navegador solicitar, ou toque em "Tirar Foto com a Câmera" para fotografar diretamente com o celular.'
        );
      }
    }
  };

  // Open native mobile camera app
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

  // Auto-start live camera on mount
  useEffect(() => {
    startCamera(true);
    return () => {
      stopCamera();
    };
  }, []);

  // Process image with Gemini API
  const processImageForModemData = async (base64Data: string) => {
    if (!base64Data || base64Data.length < 50) {
      setIsScanning(false);
      setCameraError('Não foi possível ler a foto capturada. Por favor, tire outra foto da etiqueta.');
      return;
    }

    setIsScanning(true);
    setCameraError(null);
    setScanStatusStep('Analisando etiqueta do roteador com IA...');

    try {
      setScanStatusStep('Localizando IP, Usuário e Senha na foto...');

      // Call server-side Gemini API endpoint
      const response = await fetch('/api/scan-modem-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const serverError = result?.error || `Falha de conexão com o servidor (código ${response.status}).`;
        throw new Error(serverError);
      }

      setScanStatusStep('Extraindo credenciais reais da sua foto...');

      if (result.success && result.data) {
        const parsed = result.data;
        const brandName = parsed.brand || 'Roteador Identificado';
        const modelName = parsed.model || '';

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

        setScanStatusStep(`Identificado: ${brandName}! Conectando e preenchendo...`);
        setTimeout(() => {
          setIsScanning(false);
          onScanSuccess(scannedModem);
        }, 500);
        return;
      }

      throw new Error(result?.error || 'Não foi possível ler as credenciais da etiqueta.');
    } catch (err: any) {
      console.warn('Erro ao processar imagem:', err);
      setIsScanning(false);
      const rawMsg = err?.message || 'Falha ao processar a foto da etiqueta.';
      setCameraError(rawMsg);
    }
  };

  // Capture Frame from Live Camera
  const captureFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    try {
      setIsScanning(true);
      setCameraError(null);
      setScanStatusStep('Capturando foto da câmera...');

      const canvas = canvasRef.current || document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Falha ao processar imagem da câmera.');
      }

      ctx.drawImage(video, 0, 0, w, h);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setCapturedImagePreview(rawDataUrl);
      await processImageForModemData(rawDataUrl);
    } catch (err: any) {
      console.error('Erro ao capturar foto do vídeo:', err);
      setIsScanning(false);
      setCameraError('Erro ao capturar foto: ' + (err?.message || 'Tente novamente.'));
    }
  };

  // Handle Photo from Native Camera or Gallery
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so taking another photo with same filename fires onChange
    e.target.value = '';

    try {
      setIsScanning(true);
      setCameraError(null);
      setScanStatusStep('Carregando foto capturada...');

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = async () => {
        try {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(objectUrl);
            setCapturedImagePreview(optimized);
            await processImageForModemData(optimized);
          } else {
            throw new Error('Falha no renderizador.');
          }
        } catch {
          URL.revokeObjectURL(objectUrl);
          // Fallback via FileReader
          const reader = new FileReader();
          reader.onload = () => {
            const raw = reader.result as string;
            setCapturedImagePreview(raw);
            processImageForModemData(raw);
          };
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => {
          const raw = reader.result as string;
          setCapturedImagePreview(raw);
          processImageForModemData(raw);
        };
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    } catch (err: any) {
      console.warn('Erro ao processar arquivo:', err);
      setIsScanning(false);
      setCameraError('Erro ao carregar a foto: ' + (err?.message || 'Tente novamente.'));
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
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Header Info */}
      <div className="flex flex-col gap-1.5 text-center px-2">
        <div className="inline-flex items-center justify-center gap-2 self-center px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-red-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Scanner Óptico com Leitura de IA</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Configurações do Modem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Tire uma foto da etiqueta com <span className="text-red-600 font-bold">IP, Usuário e Senha</span> para preencher automaticamente na página do modem.
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

        {/* State: Camera Standby (Show Instant Buttons in VIBRANT RED) */}
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
                Tirar Foto da Etiqueta
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {cameraError || 'Fotografe a etiqueta na traseira do modem para ler e preencher automaticamente login e senha.'}
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
                <span>Tirar Foto com a Câmera</span>
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
              startCamera();
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
        <div className="flex flex-col items-center w-full gap-2.5">
          <button
            type="button"
            onClick={captureFrame}
            disabled={isScanning}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
          >
            <Scan className="w-5 h-5 text-white animate-pulse" />
            <span>Capturar Foto da Etiqueta</span>
          </button>

          <button
            type="button"
            onClick={openNativeCamera}
            className="text-xs font-bold text-slate-600 hover:text-red-600 py-1 flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Ou usar o aplicativo de câmera nativo do celular</span>
          </button>
        </div>
      )}

      {/* Error Alert Card if photo scan had an issue */}
      {cameraError && (
        <div className="bg-red-50/90 border-2 border-red-200 rounded-3xl p-4 flex flex-col gap-3 text-xs text-red-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-black text-red-900 text-sm block">Aviso na Leitura da Foto</span>
              <p className="mt-0.5 text-red-700 leading-relaxed font-medium">{cameraError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-red-200/80">
            <button
              type="button"
              onClick={openNativeCamera}
              className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Tirar Outra Foto com a Câmera</span>
            </button>
            <button
              type="button"
              onClick={openGallery}
              className="py-2.5 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Escolher da Galeria</span>
            </button>
          </div>
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
