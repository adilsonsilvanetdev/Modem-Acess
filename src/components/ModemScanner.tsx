import React, { useState, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Scan,
  ImageIcon,
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
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusStep, setScanStatusStep] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);

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

  // Compress image to fast lightweight JPEG (<150KB) so upload takes under 200ms
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
            const maxDim = 1024;
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
              resolve(canvas.toDataURL('image/jpeg', 0.72));
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

  // Process image with Gemini API (fast response with timeout)
  const processImageForModemData = async (base64Data: string) => {
    if (!base64Data || base64Data.length < 50) {
      setIsScanning(false);
      setCameraError('Não foi possível ler a foto capturada. Por favor, tire outra foto da etiqueta.');
      return;
    }

    setIsScanning(true);
    setCameraError(null);
    setScanStatusStep('Analisando etiqueta do roteador com IA...');

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, 18000);

    try {
      setScanStatusStep('Localizando IP, Usuário e Senha na foto...');

      // Call server-side Gemini API endpoint
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
      clearTimeout(timeoutTimer);
      console.warn('Erro ao processar imagem:', err);
      setIsScanning(false);
      if (err?.name === 'AbortError') {
        setCameraError('A leitura demorou muito para responder. Por favor, tente tirar uma nova foto mais nítida ou mais próxima da etiqueta.');
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
      setScanStatusStep('Otimizando foto capturada...');

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
          <span>Leitura de Etiqueta com IA</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Fotografar Etiqueta do Modem
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Tire uma foto da etiqueta com <span className="text-red-600 font-bold">IP, Usuário e Senha</span> para preencher automaticamente na página do modem.
        </p>
      </div>

      {/* Main Action Area */}
      <div className="relative w-full rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm flex flex-col justify-center items-center transition-all p-5 sm:p-7 min-h-[360px]">
        {/* Loading / Analyzing State */}
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

        {/* Captured Image Preview */}
        {capturedImagePreview && !isScanning ? (
          <div className="relative w-full flex flex-col items-center gap-4">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center shadow-inner">
              <img
                src={capturedImagePreview}
                alt="Etiqueta Capturada"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={openNativeCamera}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100 transition-all z-10 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                <span>Tirar Outra Foto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={openNativeCamera}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-98 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
              <span>Tirar Outra Foto da Etiqueta</span>
            </button>
          </div>
        ) : (
          /* Standby: ONLY the clean "Tirar Foto" button */
          !isScanning && (
            <div className="flex flex-col items-center justify-center text-center z-10 gap-5 max-w-md w-full my-auto py-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-red-50 border-2 border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white">
                  +
                </div>
              </div>

              <div className="space-y-1.5 px-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Tirar Foto da Etiqueta
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Toque no botão abaixo para abrir a câmera do celular e fotografar a etiqueta na traseira do modem.
                </p>
              </div>

              {/* ONLY Primary Button: Tirar Foto */}
              <div className="flex flex-col w-full gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={openNativeCamera}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/30 active:scale-98 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Tirar Foto da Etiqueta</span>
                </button>

                <button
                  type="button"
                  onClick={openGallery}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Ou escolher foto da Galeria</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>

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
              className="flex-1 py-3 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar Outra Foto da Etiqueta</span>
            </button>
            <button
              type="button"
              onClick={openGallery}
              className="py-3 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-300 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Galeria</span>
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
    </div>
  );
};
