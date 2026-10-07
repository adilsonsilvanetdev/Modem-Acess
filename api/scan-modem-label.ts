import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido. Utilize POST.',
    });
  }

  try {
    const { image, mimeType: requestedMime = 'image/jpeg', manualHint } = req.body || {};

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada para análise.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor Vercel. Adicione a variável GEMINI_API_KEY no painel da Vercel (Project Settings -> Environment Variables).',
        fallbackAvailable: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let detectedMime = requestedMime;
    const mimeMatch = image.match(/^data:([^;]+);base64,/);
    if (mimeMatch && mimeMatch[1]) {
      detectedMime = mimeMatch[1];
    }
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

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        ...requestPayload,
      });
    } catch (modelErr: any) {
      console.warn('Tentativa com gemini-3.1-flash-lite falhou/ocupado na Vercel, usando gemini-flash-latest:', modelErr?.message || modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        ...requestPayload,
      });
    }

    const textOutput = response.text?.trim() || '{}';
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

    let normalizedIp = !isInvalid(parsedData.ip) ? String(parsedData.ip).trim() : '192.168.1.1';
    normalizedIp = normalizedIp.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!normalizedIp || !/^(\d{1,3}\.){3}\d{1,3}$/.test(normalizedIp)) {
      normalizedIp = '192.168.1.1';
    }

    return res.status(200).json({
      success: true,
      data: {
        ip: normalizedIp,
        username: !isInvalid(parsedData.username) ? String(parsedData.username).trim() : 'admin',
        password: !isInvalid(parsedData.password) ? String(parsedData.password).trim() : 'admin',
        brand: !isInvalid(parsedData.brand) ? String(parsedData.brand).trim() : 'Roteador Identificado',
        model: !isInvalid(parsedData.model) ? String(parsedData.model).trim() : '',
        wifiSsid: !isInvalid(parsedData.wifiSsid) ? String(parsedData.wifiSsid).trim() : '',
        wifiPassword: !isInvalid(parsedData.wifiPassword) ? String(parsedData.wifiPassword).trim() : '',
        macAddress: !isInvalid(parsedData.macAddress) ? String(parsedData.macAddress).trim() : '',
        serialNumber: !isInvalid(parsedData.serialNumber) ? String(parsedData.serialNumber).trim() : '',
        confidence: parsedData.confidence || 'alta',
        notes: parsedData.notes || '',
        cleanUrl: `http://${normalizedIp}`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao analisar etiqueta do modem na Vercel Function:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Falha ao processar a imagem da etiqueta do modem.',
    });
  }
}
