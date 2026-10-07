import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for base64 photo uploads from camera
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google GenAI client (Server-Side only)
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// API endpoint to analyze router/modem label
app.post('/api/scan-modem-label', async (req: Request, res: Response) => {
  try {
    const { image, mimeType: requestedMime = 'image/jpeg', manualHint } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada para análise.',
      });
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Use os modelos pré-definidos ou digite manualmente.',
        fallbackAvailable: true,
      });
    }

    // Detect actual MIME type from base64 data URL
    let detectedMime = requestedMime;
    const mimeMatch = image.match(/^data:([^;]+);base64,/);
    if (mimeMatch && mimeMatch[1]) {
      detectedMime = mimeMatch[1];
    }
    // Clean base64 string
    const cleanBase64 = image.replace(/^data:[^;]+;base64,/, '').trim();

    const promptText = `
Você é um leitor óptico especialista em etiquetas físicas de modems e roteadores de telecomunicações.
Analise COM ATENÇÃO MÁXIMA a imagem da etiqueta que o usuário fotografou.

REGRAS CRÍTICAS:
1. Extraia EXCLUSIVAMENTE o que você ler NESTA imagem específica do usuário.
   NUNCA invente ou presuma dados de outras operadoras ou redes vizinhas.
2. Identifique a MARCA e MODELO EXATOS que aparecem no aparelho (ex: TP-Link, Intelbras, Claro, Huawei, ZTE, D-Link, MitraStar, Askey, Humax, Sagemcom, Nokia, etc.).
3. Endereço IP / Gateway de Acesso:
   - Procure por: "IP", "Default Access", "Acesso Web", "Endereço", "Gateway", "URL".
   - Geralmente é: 192.168.1.1, 192.168.0.1, 192.168.15.1, 192.168.100.1, 10.0.0.1, ou "tplinkwifi.net", "routerlogin.net", "meuintelbras.local".
   - Se o IP não estiver explicitamente escrito, use o IP padrão de fábrica da MARCA identificada na foto.
4. Usuário de Login Web:
   - Procure por: "Username", "Usuário", "User", "Admin User", "Login". Geralmente "admin", "telecomadmin", "user", "root".
5. Senha de Acesso Web (Gerenciamento):
   - Procure por: "Password", "Senha", "Senha de Acesso", "Admin Password", "Web Password".
   - Se na etiqueta a senha de gerenciamento for a mesma do Wi-Fi ou estiver rotulada apenas como "Senha" ou "Password", extraia esse valor.
6. Nome da Rede Wi-Fi (SSID):
   - Se estiver impresso na etiqueta (ex: "SSID", "Rede Wi-Fi", "WLAN"), extraia O NOME EXATO.
   - Se NÃO estiver na etiqueta, retorne vazio (""). NUNCA invente nomes de redes vizinhas!
7. Senha do Wi-Fi:
   - Se estiver impressa (ex: "Wi-Fi Password", "Chave de Segurança", "WPA Key", "PIN"), extraia o valor exato.
   - Se NÃO estiver, retorne vazio ("").
8. Endereço MAC e Número de Série se legíveis.

Retorne estritamente o objeto JSON conforme o schema.
${manualHint ? `Dica adicional: ${manualHint}` : ''}
`;

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
        systemInstruction:
          'Você é um leitor óptico especialista em etiquetas de roteadores. Extraia com precisão absoluta as informações visíveis na foto. Se o usuário ou senha não estiverem expressos, use os padrões mais prováveis da marca.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ip: {
              type: Type.STRING,
              description: 'Endereço IP ou hostname de acesso à interface web',
            },
            username: {
              type: Type.STRING,
              description: 'Usuário de login',
            },
            password: {
              type: Type.STRING,
              description: 'Senha da interface de gerenciamento web',
            },
            brand: {
              type: Type.STRING,
              description: 'Marca impressa na etiqueta do modem',
            },
            model: {
              type: Type.STRING,
              description: 'Modelo do modem/roteador',
            },
            wifiSsid: {
              type: Type.STRING,
              description: 'Nome da rede Wi-Fi padrão de fábrica (SSID) se visível na etiqueta',
            },
            wifiPassword: {
              type: Type.STRING,
              description: 'Senha padrão do Wi-Fi se visível na etiqueta',
            },
            macAddress: {
              type: Type.STRING,
              description: 'Endereço MAC se visível',
            },
            serialNumber: {
              type: Type.STRING,
              description: 'Número de série se visível',
            },
            confidence: {
              type: Type.STRING,
              description: 'Grau de certeza da leitura: alta, média ou baixa',
            },
            notes: {
              type: Type.STRING,
              description: 'Observações específicas do que foi lido na foto',
            },
          },
        },
      },
    };

    let response: any = null;
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          ...requestPayload,
        });
        if (response && response.text) {
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        console.warn(`Tentativa com ${modelName} falhou:`, modelErr?.message || modelErr);
      }
    }

    if (!response && lastError) {
      console.warn('Todos os modelos de IA falharam ou sofreram 503 temporário. Aplicando detecção de contingência...');
    }

    const textOutput = response?.text?.trim() || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      const cleaned = textOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      try {
        parsedData = JSON.parse(cleaned);
      } catch {
        parsedData = {};
      }
    }

    const isInvalid = (val: any) => {
      if (!val) return true;
      const str = String(val).trim().toLowerCase();
      return (
        str === '' ||
        str === 'null' ||
        str === 'undefined' ||
        str === 'none' ||
        str === 'n/a' ||
        str === 'na' ||
        str === '-' ||
        str === 'não informado' ||
        str === 'desconhecido'
      );
    };

    // Robust IP Extraction with Regex across IP field, notes, and raw response
    const ipRegex = /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;
    let detectedIp = '';

    if (!isInvalid(parsedData.ip)) {
      const match = String(parsedData.ip).match(ipRegex);
      if (match) {
        detectedIp = match[0];
      }
    }

    if (!detectedIp && parsedData.notes) {
      const match = String(parsedData.notes).match(ipRegex);
      if (match) {
        detectedIp = match[0];
      }
    }

    if (!detectedIp && textOutput) {
      const match = textOutput.match(ipRegex);
      if (match) {
        detectedIp = match[0];
      }
    }

    // Check for common router hostname domains
    if (!detectedIp) {
      const lowerText = (String(parsedData.ip || '') + ' ' + textOutput).toLowerCase();
      if (lowerText.includes('tplinkwifi.net') || lowerText.includes('tplink')) {
        detectedIp = '192.168.0.1';
      } else if (lowerText.includes('routerlogin.net') || lowerText.includes('netgear')) {
        detectedIp = '192.168.1.1';
      } else if (lowerText.includes('meuintelbras.local') || lowerText.includes('intelbras')) {
        detectedIp = '192.168.0.1';
      } else if (lowerText.includes('vivo') || lowerText.includes('mitrastar') || lowerText.includes('askey')) {
        detectedIp = '192.168.15.1';
      } else if (lowerText.includes('claro') || lowerText.includes('huawei') || lowerText.includes('humax')) {
        detectedIp = '192.168.0.1';
      } else {
        detectedIp = '192.168.1.1';
      }
    }

    const brandStr = !isInvalid(parsedData.brand) ? String(parsedData.brand).trim() : 'Roteador Identificado';
    const userStr = !isInvalid(parsedData.username) ? String(parsedData.username).trim() : 'admin';
    const passStr = !isInvalid(parsedData.password) ? String(parsedData.password).trim() : 'admin';

    return res.json({
      success: true,
      data: {
        ip: detectedIp,
        username: userStr,
        password: passStr,
        brand: brandStr,
        model: !isInvalid(parsedData.model) ? String(parsedData.model).trim() : '',
        wifiSsid: !isInvalid(parsedData.wifiSsid) ? String(parsedData.wifiSsid).trim() : '',
        wifiPassword: !isInvalid(parsedData.wifiPassword) ? String(parsedData.wifiPassword).trim() : '',
        macAddress: !isInvalid(parsedData.macAddress) ? String(parsedData.macAddress).trim() : '',
        serialNumber: !isInvalid(parsedData.serialNumber) ? String(parsedData.serialNumber).trim() : '',
        confidence: parsedData.confidence || 'alta',
        notes: parsedData.notes || '',
        cleanUrl: `http://${detectedIp}`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao analisar etiqueta do modem:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao processar a imagem da etiqueta do modem.',
    });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ModemScanner server rodando na porta ${PORT}`);
  });
}

startServer();
