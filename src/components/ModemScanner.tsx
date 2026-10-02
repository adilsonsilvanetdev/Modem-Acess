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
  Tag,
  ArrowRight,
  ImageIcon,
  Video,
} from 'lucide-react';
import { SAMPLE_MODEMS } from '../data/sampleModems';
import { RouterBrandPreset, ScannedModem } from '../types';

interface ModemScannerProps {
  onScanSuccess: (modem: ScannedModem) => void;
  activeModem?: ScannedModem | null;
}

export const ModemScanner: React.FC<ModemScannerProps> = ({
  onScanSuccess,
  activeModem,
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
  const [selectedPreset, setSelectedPreset] = useState<RouterBrandPreset | null>(null);

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
  const processImageForModemData = async (
    base64Data: string,
    presetFallback?: RouterBrandPreset
  ) => {
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
          manualHint: presetFallback ? `Etiqueta padrão de ${presetFallback.brand} ${presetFallback.model}` : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Servidor retornou status ' + response.status);
      }

      setScanStatusStep('Extraindo credenciais reais da sua foto...');
      const result = await response.json();

      if (result.success && result.data) {
        const parsed = result.data;
        const brandName = parsed.brand || (presetFallback ? presetFallback.brand : 'Roteador Identificado');
        const modelName = parsed.model || (presetFallback ? presetFallback.model : 'Padrão');

        const scannedModem: ScannedModem = {
          id: 'modem-' + Date.now(),
          ip: parsed.ip || (presetFallback ? presetFallback.defaultIp : '192.168.1.1'),
          username: parsed.username || (presetFallback ? presetFallback.defaultUser : 'admin'),
          password: parsed.password || (presetFallback ? presetFallback.defaultPass : 'admin'),
          brand: brandName,
          model: modelName,
          wifiSsid: parsed.wifiSsid || (presetFallback ? presetFallback.wifiSsid : (brandName ? `${brandName} Wi-Fi` : undefined)),
          wifiPassword: parsed.wifiPassword || (presetFallback ? presetFallback.wifiPassword : undefined),
          macAddress: parsed.macAddress || (presetFallback ? presetFallback.macAddress : undefined),
          serialNumber: parsed.serialNumber || (presetFallback ? presetFallback.serialNumber : undefined),
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

      // Only apply preset fallback if the user EXPLICITLY clicked a preset
      if (presetFallback) {
        setScanStatusStep('Carregando modelo pré-definido...');
        const fallbackModem: ScannedModem = {
          id: 'modem-' + Date.now(),
          ip: presetFallback.defaultIp,
          username: presetFallback.defaultUser,
          password: presetFallback.defaultPass,
          brand: presetFallback.brand,
          model: presetFallback.model,
          wifiSsid: presetFallback.wifiSsid,
          wifiPassword: presetFallback.wifiPassword,
          macAddress: presetFallback.macAddress,
          serialNumber: presetFallback.serialNumber,
          scannedAt: new Date().toISOString(),
          confidence: 'alta',
          notes: `Modelo selecionado: ${presetFallback.provider || presetFallback.brand}.`,
          sourceImage: base64Data,
        };
        setTimeout(() => {
          setIsScanning(false);
          onScanSuccess(fallbackModem);
        }, 500);
        return;
      }

      // If user took a REAL photo and it failed, DO NOT inject a fake neighbor router!
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

  // Handle Testing with Sample Modem Label
  const handleSelectSample = (preset: RouterBrandPreset) => {
    setSelectedPreset(preset);

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw label background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 800, 450);

      // Border and header
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 430);

      // Header Brand
      ctx.fillStyle = preset.themeColor;
      ctx.fillRect(20, 20, 760, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(preset.logoText + ' - ' + preset.model, 35, 55);

      // Label text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`ENDEREÇO IP (Gateway): ${preset.defaultIp}`, 40, 120);
      ctx.fillText(`USUÁRIO (Login): ${preset.defaultUser}`, 40, 165);
      ctx.fillText(`SENHA (Password): ${preset.defaultPass}`, 40, 210);

      ctx.fillStyle = '#475569';
      ctx.font = '16px monospace';
      ctx.fillText(`Rede Wi-Fi (SSID): ${preset.wifiSsid}`, 40, 265);
      ctx.fillText(`Senha do Wi-Fi: ${preset.wifiPassword}`, 40, 305);
      ctx.fillText(`MAC: ${preset.macAddress}  |  S/N: ${preset.serialNumber}`, 40, 350);

      // Barcode simulation
      ctx.fillStyle = '#000000';
      for (let i = 40; i < 740; i += 6) {
        if (Math.sin(i * 3) > 0) {
          ctx.fillRect(i, 380, 4, 35);
        }
      }

      const generatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImagePreview(generatedDataUrl);
      processImageForModemData(generatedDataUrl, preset);
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
            <div className="flex flex-col w-full gap-2 pt-1">
              <button
                type="button"
                onClick={openNativeCamera}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-red-600/25 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Foto da Etiqueta</span>
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

      {/* Primary Action Buttons Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* If live camera is active, show the Shutter button */}
        {cameraActive && !capturedImagePreview && (
          <button
            type="button"
            onClick={captureFrame}
            disabled={isScanning}
            className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
          >
            <Scan className="w-5 h-5 text-white animate-pulse" />
            <span>Capturar Foto da Etiqueta</span>
          </button>
        )}

        {/* If camera is not live, show the 2 main mobile buttons */}
        {!cameraActive && (
          <>
            <button
              type="button"
              onClick={openNativeCamera}
              disabled={isScanning}
              className="w-full sm:flex-1 py-3.5 px-5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar Foto com a Câmera</span>
            </button>

            <button
              type="button"
              onClick={openGallery}
              disabled={isScanning}
              className="w-full sm:w-auto py-3.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-red-600" />
              <span>Enviar Imagem</span>
            </button>
          </>
        )}
      </div>

      {/* Preset / Sample Modems Section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ou teste com uma etiqueta pré-configurada
            </h3>
          </div>
          <span className="text-[11px] text-red-600 font-bold">
            1 toque
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Toque em uma das operadoras/modelos abaixo para carregar uma etiqueta e ver o preenchimento automático no navegador:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {SAMPLE_MODEMS.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectSample(preset)}
                className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all active:scale-[0.97] cursor-pointer ${
                  isSelected
                    ? 'bg-red-50/80 border-red-500 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:border-red-300 hover:bg-red-50/30'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: preset.themeColor }}
                  >
                    {preset.brand.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-mono text-red-600 font-bold">
                    {preset.defaultIp}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate w-full">
                  {preset.model}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate w-full">
                  {preset.defaultUser} • {preset.defaultPass}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scanned Card Quick Preview if active */}
      {activeModem && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">
                Modem pronto: {activeModem.brand} {activeModem.model}
              </p>
              <p className="font-mono text-emerald-700 font-semibold">
                IP: {activeModem.ip} | Login: {activeModem.username}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
            Ativo
          </span>
        </div>
      )}
    </div>
  );
};
