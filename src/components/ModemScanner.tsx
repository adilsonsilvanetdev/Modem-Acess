import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Scan,
  ImageIcon,
  Zap,
  ZapOff,
  Video,
  Sun,
} from 'lucide-react';
import { ScannedModem } from '../types';
import { cleanModemPassword, cleanModemUser } from '../utils/credentials';

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
  const streamRef = useRef<MediaStream | null>(null);

  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState<boolean>(false);
  const [liveCameraLoading, setLiveCameraLoading] = useState<boolean>(true);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorchSupport, setHasTorchSupport] = useState<boolean>(false);
  const [brightnessBoost, setBrightnessBoost] = useState<boolean>(false);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusStep, setScanStatusStep] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);

  // Callback ref guarantees srcObject is attached the exact millisecond the <video> node mounts in the DOM
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.muted = true;
      node.playsInline = true;
      node.play().catch((err) => {
        console.warn('Video auto-play aguardando interação:', err);
      });
    }
  }, []);

  // Stop live camera stream safely
  const stopLiveCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
    setTorchEnabled(false);
  }, []);

  // Start live camera stream automatically when app opens
  const startLiveCamera = useCallback(async () => {
    setLiveCameraLoading(true);
    setCameraError(null);
    stopLiveCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso direto à câmera em tempo real não suportado neste navegador. Use o botão Tirar Foto.');
      }

      // Flexible constraints to avoid OverconstrainedError and dark feeds
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('Tentando configuração secundária de câmera:', firstErr);
        // Fallback for devices/laptops with simpler webcams
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      // Ensure tracks are enabled and active
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      // Check flashlight/torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorchSupport(true);
        }
      }

      setIsLiveCameraActive(true);
      setLiveCameraLoading(false);

      // Connect to video element if already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch((e) => {
          console.warn('Play error:', e);
        });
      }
    } catch (err: any) {
      console.warn('Câmera automática ao vivo não pôde iniciar:', err?.message || err);
      setIsLiveCameraActive(false);
      setLiveCameraLoading(false);
    }
  }, [stopLiveCamera]);

  // Ensure stream stays bound whenever videoElement or isLiveCameraActive changes
  useEffect(() => {
    if (videoElement && streamRef.current) {
      if (videoElement.srcObject !== streamRef.current) {
        videoElement.srcObject = streamRef.current;
      }
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.play().catch(() => {});
    }
  }, [videoElement, isLiveCameraActive]);

  // Start automatic scanner when opening the app
  useEffect(() => {
    startLiveCamera();
    return () => {
      stopLiveCamera();
    };
  }, [startLiveCamera, stopLiveCamera]);

  // Toggle Torch/Flashlight if available
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0] as any;
    if (track && track.applyConstraints) {
      try {
        const nextState = !torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchEnabled(nextState);
      } catch (e) {
        console.warn('Erro ao alternar lanterna:', e);
      }
    }
  };

  // Capture current sharp frame from live video scanner
  const captureFrameFromLiveVideo = async () => {
    if (!videoRef.current || !isLiveCameraActive) {
      openNativeCamera();
      return;
    }

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível inicializar o canvas de captura');

      if (brightnessBoost) {
        ctx.filter = 'brightness(1.25) contrast(1.15)';
      }
      ctx.drawImage(video, 0, 0, width, height);
      // High quality JPEG so numbers on router labels remain crisp
      const highResDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      setCapturedImagePreview(highResDataUrl);
      await processImageForModemData(highResDataUrl);
    } catch (err: any) {
      console.warn('Falha ao capturar do vídeo ao vivo:', err);
      openNativeCamera();
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

  // Compress image preserving sharp label details (max 1600px with 0.90 quality for crisp IP numbers)
  const compressImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const rawData = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(rawData);
        img.onload = () => {
          try {
            const maxDim = 1600;
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
              resolve(canvas.toDataURL('image/jpeg', 0.90));
              return;
            }
            resolve(rawData);
          } catch {
            resolve(rawData);
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  };

  // Process image with Gemini API
  const processImageForModemData = async (base64Data: string) => {
    if (!base64Data || base64Data.length < 50) {
      setIsScanning(false);
      setCameraError('Não foi possível ler a foto capturada. Por favor, tente tirar uma nova foto da etiqueta.');
      return;
    }

    setIsScanning(true);
    setCameraError(null);
    setScanStatusStep('Foto nítida capturada! Analisando etiqueta...');

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, 35000);

    try {
      setScanStatusStep('Identificando IP, Usuário e Senha na foto...');

      const response = await fetch('/api/scan-modem-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          image: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      clearTimeout(timeoutTimer);

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const serverError = result?.error || `Falha de conexão com o servidor (código ${response.status}).`;
        throw new Error(serverError);
      }

      setScanStatusStep('Extraindo dados de acesso e preparando conexão...');

      if (result.success && result.data) {
        const parsed = result.data;
        const brandName = parsed.brand || 'Roteador Identificado';
        const modelName = parsed.model || '';

        const scannedModem: ScannedModem = {
          id: 'modem-' + Date.now(),
          ip: parsed.ip || '192.168.1.1',
          username: cleanModemUser(parsed.username),
          password: cleanModemPassword(parsed.password),
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

        setScanStatusStep(`IP ${scannedModem.ip} detectado! Abrindo página...`);
        setTimeout(() => {
          setIsScanning(false);
          stopLiveCamera();
          onScanSuccess(scannedModem);
        }, 500);
        return;
      }

      throw new Error(result?.error || 'Não foi possível ler as credenciais da etiqueta.');
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      console.warn('Erro ao processar imagem:', err);
      setIsScanning(false);
      if (err?.name === 'AbortError') {
        setCameraError('A leitura demorou para responder. Verifique sua conexão e tente tirar a foto novamente com boa iluminação.');
      } else {
        const rawMsg = err?.message || 'Falha ao processar a foto da etiqueta.';
        setCameraError(rawMsg);
      }
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
      setScanStatusStep('Otimizando foto em alta resolução...');

      const optimizedBase64 = await compressImageFile(file);
      setCapturedImagePreview(optimizedBase64);
      await processImageForModemData(optimizedBase64);
    } catch (err: any) {
      console.warn('Erro ao processar arquivo:', err);
      setIsScanning(false);
      setCameraError('Erro ao carregar a foto: ' + (err?.message || 'Tente novamente.'));
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
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
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Info - Texto Principal alterado para Acesso Configurações do Modem */}
      <div className="flex flex-col gap-1.5 text-center px-2">
        <div className="inline-flex items-center justify-center gap-2 self-center px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-red-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Scanner Automático com IA</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Acesso Configurações do Modem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Aponte a câmera para a etiqueta com <span className="text-red-600 font-bold">IP, Usuário e Senha</span> para preencher automaticamente na página do modem.
        </p>
      </div>

      {/* Main Scanner Viewport Area */}
      <div className="relative w-full rounded-3xl overflow-hidden border-2 border-slate-200 bg-slate-950 shadow-md flex flex-col justify-center items-center transition-all min-h-[380px] h-[380px] sm:h-[420px]">
        {/* Loading / Analyzing Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-6 z-30">
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
              <p className="text-xs text-red-400 font-mono">
                {scanStatusStep}
              </p>
            </div>
          </div>
        )}

        {/* Captured Preview Mode if image was taken */}
        {capturedImagePreview && !isScanning ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-3">
            <img
              src={capturedImagePreview}
              alt="Etiqueta Capturada"
              className="w-full h-full object-contain rounded-2xl"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={() => {
                  setCapturedImagePreview(null);
                  startLiveCamera();
                }}
                className="flex-1 py-3 px-4 bg-white/95 hover:bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-red-600" />
                <span>Voltar ao Scanner</span>
              </button>
              <button
                type="button"
                onClick={openNativeCamera}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tirar Outra Foto</span>
              </button>
            </div>
          </div>
        ) : isLiveCameraActive ? (
          /* 1. Live Camera Scanner Mode (Ativo Automaticamente ao Abrir) */
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
            <video
              ref={videoRefCallback}
              playsInline
              autoPlay
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              style={{
                filter: brightnessBoost ? 'brightness(1.4) contrast(1.15) saturate(1.1)' : 'none',
              }}
              className="w-full h-full object-cover transition-all"
            />

            {/* Viewfinder Target Reticle / Scanning Frame - Clean and Bright */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl border-2 border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]">
                {/* Corner Marks */}
                <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg" />

                {/* Animated Red Laser Scanning Line */}
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444]"
                  style={{
                    animation: 'scannerLaser 2.2s ease-in-out infinite alternate',
                  }}
                />

                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border border-red-500/40 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                </div>

                <div className="absolute -bottom-7 left-0 right-0 text-center">
                  <span className="text-[11px] font-bold text-white bg-slate-900/90 px-3 py-1 rounded-full border border-red-500/50 shadow-md">
                    Posicione o IP e a Senha no quadro
                  </span>
                </div>
              </div>
            </div>

            {/* Top Bar Controls (Flashlight, Clarear +Luz, Status) */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] text-white font-medium">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Scanner Ativo</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Clarear / Aumentar Luz */}
                <button
                  type="button"
                  onClick={() => setBrightnessBoost(!brightnessBoost)}
                  className={`px-3 py-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    brightnessBoost
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg ring-2 ring-amber-300/60'
                      : 'bg-slate-900/80 text-white border-slate-700/80 hover:bg-slate-800'
                  }`}
                  title="Clarear imagem / Modo iluminação alta"
                >
                  <Sun className={`w-3.5 h-3.5 ${brightnessBoost ? 'text-slate-950 animate-spin' : 'text-amber-400'}`} style={brightnessBoost ? { animationDuration: '8s' } : undefined} />
                  <span>{brightnessBoost ? '+Luz Ligada' : 'Clarear (+Luz)'}</span>
                </button>

                {/* Lanterna / Flash se suportado pelo hardware */}
                {hasTorchSupport && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
                      torchEnabled
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-slate-900/80 text-white border-slate-700/80 hover:bg-slate-800'
                    }`}
                    title="Lanterna / Flash"
                  >
                    {torchEnabled ? <Zap className="w-4 h-4 fill-current text-slate-950" /> : <ZapOff className="w-4 h-4 text-slate-300" />}
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Controls inside Viewfinder */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={captureFrameFromLiveVideo}
                className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-red-600/40 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Capturar e Ler Etiqueta</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openNativeCamera}
                  className="flex-1 py-2 px-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-red-400" />
                  <span>Foto Câmera Nativa</span>
                </button>
                <button
                  type="button"
                  onClick={openGallery}
                  className="flex-1 py-2 px-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
                  <span>Galeria</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standby Fallback (quando acesso à câmera em tempo real aguarda permissão) */
          <div className="flex flex-col items-center justify-center text-center z-10 gap-4 max-w-md w-full p-6 my-auto text-white">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center text-red-500 shadow-sm">
                <Camera className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-slate-900">
                +
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">
                Tirar Foto da Etiqueta
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Tire uma foto nítida e iluminada da etiqueta na traseira do modem para capturar IP, login e senha.
              </p>
            </div>

            <div className="flex flex-col w-full gap-2.5 pt-1">
              <button
                type="button"
                onClick={openNativeCamera}
                className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Tirar Foto da Etiqueta</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-red-400" />
                  <span>Scanner ao Vivo</span>
                </button>
                <button
                  type="button"
                  onClick={openGallery}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>Galeria</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Card if photo scan had an issue */}
      {cameraError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 flex flex-col gap-3 text-xs text-red-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-black text-red-900 text-sm block">Aviso na Captura do IP</span>
              <p className="mt-0.5 text-red-700 leading-relaxed font-medium">{cameraError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-red-200/80">
            <button
              type="button"
              onClick={openNativeCamera}
              className="flex-1 py-3 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar Outra Foto Nítida</span>
            </button>
            <button
              type="button"
              onClick={startLiveCamera}
              className="py-3 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar Scanner</span>
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
              title="Limpar senhas deste modem e iniciar novo acesso"
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            >
              Limpar & Novo Acesso
            </button>
          )}
        </div>
      )}

      {/* CSS Keyframes for the scanner laser animation */}
      <style>{`
        @keyframes scannerLaser {
          0% {
            top: 6%;
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 92%;
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
};
