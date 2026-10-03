var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
var apiKey = process.env.GEMINI_API_KEY;
var ai = null;
if (apiKey) {
  ai = new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/scan-modem-label", async (req, res) => {
  try {
    const { image, mimeType: requestedMime = "image/jpeg", manualHint } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        error: "Nenhuma imagem foi enviada para an\xE1lise."
      });
    }
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Chave GEMINI_API_KEY n\xE3o configurada no servidor. Use os modelos pr\xE9-definidos ou digite manualmente.",
        fallbackAvailable: true
      });
    }
    let detectedMime = requestedMime;
    const mimeMatch = image.match(/^data:([^;]+);base64,/);
    if (mimeMatch && mimeMatch[1]) {
      detectedMime = mimeMatch[1];
    }
    const cleanBase64 = image.replace(/^data:[^;]+;base64,/, "").trim();
    const promptText = `
Voc\xEA \xE9 um leitor \xF3ptico especialista em etiquetas f\xEDsicas de modems e roteadores de telecomunica\xE7\xF5es.
Analise COM ATEN\xC7\xC3O M\xC1XIMA a imagem da etiqueta que o usu\xE1rio fotografou.

REGRAS CR\xCDTICAS:
1. Extraia EXCLUSIVAMENTE o que voc\xEA ler NESTA imagem espec\xEDfica do usu\xE1rio.
   NUNCA invente ou presuma dados de outras operadoras ou redes vizinhas.
2. Identifique a MARCA e MODELO EXATOS que aparecem no aparelho (ex: TP-Link, Intelbras, Claro, Huawei, ZTE, D-Link, MitraStar, Askey, Humax, Sagemcom, Nokia, etc.).
3. Endere\xE7o IP / Gateway de Acesso:
   - Procure por: "IP", "Default Access", "Acesso Web", "Endere\xE7o", "Gateway", "URL".
   - Geralmente \xE9: 192.168.1.1, 192.168.0.1, 192.168.15.1, 192.168.100.1, 10.0.0.1, ou "tplinkwifi.net", "routerlogin.net", "meuintelbras.local".
   - Se o IP n\xE3o estiver explicitamente escrito, use o IP padr\xE3o de f\xE1brica da MARCA identificada na foto.
4. Usu\xE1rio de Login Web:
   - Procure por: "Username", "Usu\xE1rio", "User", "Admin User", "Login". Geralmente "admin", "telecomadmin", "user", "root".
5. Senha de Acesso Web (Gerenciamento):
   - Procure por: "Password", "Senha", "Senha de Acesso", "Admin Password", "Web Password".
   - Se na etiqueta a senha de gerenciamento for a mesma do Wi-Fi ou estiver rotulada apenas como "Senha" ou "Password", extraia esse valor.
6. Nome da Rede Wi-Fi (SSID):
   - Se estiver impresso na etiqueta (ex: "SSID", "Rede Wi-Fi", "WLAN"), extraia O NOME EXATO.
   - Se N\xC3O estiver na etiqueta, retorne vazio (""). NUNCA invente nomes de redes vizinhas!
7. Senha do Wi-Fi:
   - Se estiver impressa (ex: "Wi-Fi Password", "Chave de Seguran\xE7a", "WPA Key", "PIN"), extraia o valor exato.
   - Se N\xC3O estiver, retorne vazio ("").
8. Endere\xE7o MAC e N\xFAmero de S\xE9rie se leg\xEDveis.

Retorne estritamente o objeto JSON conforme o schema.
${manualHint ? `Dica adicional: ${manualHint}` : ""}
`;
    const requestPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      config: {
        systemInstruction: "Voc\xEA \xE9 um leitor \xF3ptico especialista em etiquetas de roteadores. Extraia com precis\xE3o absoluta as informa\xE7\xF5es vis\xEDveis na foto. Se o usu\xE1rio ou senha n\xE3o estiverem expressos, use os padr\xF5es mais prov\xE1veis da marca.",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            ip: {
              type: import_genai.Type.STRING,
              description: "Endere\xE7o IP ou hostname de acesso \xE0 interface web"
            },
            username: {
              type: import_genai.Type.STRING,
              description: "Usu\xE1rio de login"
            },
            password: {
              type: import_genai.Type.STRING,
              description: "Senha da interface de gerenciamento web"
            },
            brand: {
              type: import_genai.Type.STRING,
              description: "Marca impressa na etiqueta do modem"
            },
            model: {
              type: import_genai.Type.STRING,
              description: "Modelo do modem/roteador"
            },
            wifiSsid: {
              type: import_genai.Type.STRING,
              description: "Nome da rede Wi-Fi padr\xE3o de f\xE1brica (SSID) se vis\xEDvel na etiqueta"
            },
            wifiPassword: {
              type: import_genai.Type.STRING,
              description: "Senha padr\xE3o do Wi-Fi se vis\xEDvel na etiqueta"
            },
            macAddress: {
              type: import_genai.Type.STRING,
              description: "Endere\xE7o MAC se vis\xEDvel"
            },
            serialNumber: {
              type: import_genai.Type.STRING,
              description: "N\xFAmero de s\xE9rie se vis\xEDvel"
            },
            confidence: {
              type: import_genai.Type.STRING,
              description: "Grau de certeza da leitura: alta, m\xE9dia ou baixa"
            },
            notes: {
              type: import_genai.Type.STRING,
              description: "Observa\xE7\xF5es espec\xEDficas do que foi lido na foto"
            }
          }
        }
      }
    };
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        ...requestPayload
      });
    } catch (modelErr) {
      console.warn("Tentativa com gemini-3.8-flash falhou/ocupado, usando gemini-3.1-flash-lite:", modelErr?.message || modelErr);
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        ...requestPayload
      });
    }
    const textOutput = response.text?.trim() || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      const cleaned = textOutput.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      try {
        parsedData = JSON.parse(cleaned);
      } catch {
        parsedData = {};
      }
    }
    const isInvalid = (val) => !val || val === "null" || val === "undefined" || val === "None";
    let normalizedIp = !isInvalid(parsedData.ip) ? String(parsedData.ip).trim() : "192.168.1.1";
    normalizedIp = normalizedIp.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
    if (!normalizedIp || normalizedIp === "null") {
      normalizedIp = "192.168.1.1";
    }
    return res.json({
      success: true,
      data: {
        ip: normalizedIp,
        username: !isInvalid(parsedData.username) ? String(parsedData.username).trim() : "admin",
        password: !isInvalid(parsedData.password) ? String(parsedData.password).trim() : "admin",
        brand: !isInvalid(parsedData.brand) ? String(parsedData.brand).trim() : "Roteador Identificado",
        model: !isInvalid(parsedData.model) ? String(parsedData.model).trim() : "",
        wifiSsid: !isInvalid(parsedData.wifiSsid) ? String(parsedData.wifiSsid).trim() : "",
        wifiPassword: !isInvalid(parsedData.wifiPassword) ? String(parsedData.wifiPassword).trim() : "",
        macAddress: !isInvalid(parsedData.macAddress) ? String(parsedData.macAddress).trim() : "",
        serialNumber: !isInvalid(parsedData.serialNumber) ? String(parsedData.serialNumber).trim() : "",
        confidence: parsedData.confidence || "alta",
        notes: parsedData.notes || "",
        cleanUrl: `http://${normalizedIp}`
      }
    });
  } catch (error) {
    console.error("Erro ao analisar etiqueta do modem:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Falha ao processar a imagem da etiqueta do modem."
    });
  }
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static(import_path.default.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ModemScanner server rodando na porta ${PORT}`);
  });
}
startServer();
