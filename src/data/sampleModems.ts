import { RouterBrandPreset } from '../types';

export const SAMPLE_MODEMS: RouterBrandPreset[] = [
  {
    id: 'vivo-mitrastar',
    brand: 'MitraStar (Vivo Fibra)',
    model: 'GPT-2741GNAC',
    provider: 'Vivo Fibra',
    defaultIp: '192.168.15.1',
    defaultUser: 'admin',
    defaultPass: '8aF#29vK',
    wifiSsid: 'Vivo-Fibra-5G-92A1',
    wifiPassword: 'vivo88776655',
    macAddress: 'C4:EA:1D:8B:92:A1',
    serialNumber: 'MSTG1928014820',
    themeColor: '#660099',
    logoText: 'VIVO FIBRA',
    sampleLabelText: `VIVO FIBRA ÓPTICA
Modelo: GPT-2741GNAC MitraStar
Endereço IP: 192.168.15.1
Usuário de Acesso: admin
Senha Padrão: 8aF#29vK
Rede Wi-Fi (SSID): Vivo-Fibra-5G-92A1
Chave Wi-Fi: vivo88776655
MAC: C4:EA:1D:8B:92:A1 | S/N: MSTG1928014820`,
    description: 'Padrão dos modems ONT da Vivo Fibra óptica residencial e empresarial.',
  },
  {
    id: 'claro-sagemcom',
    brand: 'Sagemcom (Claro NET)',
    model: 'Fast 3890 DOCSIS 3.1',
    provider: 'Claro / NET',
    defaultIp: '192.168.0.1',
    defaultUser: 'admin',
    defaultPass: 'Claro#9841',
    wifiSsid: 'CLARO-WIFI-5G-7B42',
    wifiPassword: 'claro92837461',
    macAddress: 'E0:B9:E5:4A:7B:42',
    serialNumber: 'SCM198302194',
    themeColor: '#e11d48',
    logoText: 'CLARO',
    sampleLabelText: `CLARO WI-FI PLUS
Modelo: Sagemcom Fast 3890 V3
IP de Acesso Web: 192.168.0.1
Login Administrador: admin
Senha de Acesso: Claro#9841
Wi-Fi SSID: CLARO-WIFI-5G-7B42
Senha Wi-Fi: claro92837461
MAC Cable: E0:B9:E5:4A:7B:42`,
    description: 'Modem DOCSIS 3.1 / Fibra da Claro para velocidades até 1 Giga.',
  },
  {
    id: 'tplink-archer',
    brand: 'TP-Link',
    model: 'Archer C6 AC1200',
    provider: 'Varejo / Universal',
    defaultIp: '192.168.0.1',
    defaultUser: 'admin',
    defaultPass: 'admin',
    wifiSsid: 'TP-Link_5G_C6A4',
    wifiPassword: 'tplink49201948',
    macAddress: '98:48:27:11:C6:A4',
    serialNumber: '221B849001394',
    themeColor: '#0ea5e9',
    logoText: 'tp-link',
    sampleLabelText: `TP-LINK TECHNOLOGIES
Model: Archer C6 (BR) Ver: 3.2
Default Access: http://tplinkwifi.net ou 192.168.0.1
Username: admin
Password: admin
Wireless SSID: TP-Link_5G_C6A4
Wireless Password/PIN: tplink49201948
MAC: 98:48:27:11:C6:A4`,
    description: 'Roteador Gigabit dual band muito popular em residências e pequenos escritórios.',
  },
  {
    id: 'intelbras-wiforce',
    brand: 'Intelbras',
    model: 'WiForce W5-1200F',
    provider: 'Provedores Locais / FTTH',
    defaultIp: '192.168.1.1',
    defaultUser: 'admin',
    defaultPass: 'admin',
    wifiSsid: 'Intelbras_WiForce_5G',
    wifiPassword: 'intelbras1234',
    macAddress: '80:7A:BF:55:12:00',
    serialNumber: 'ITB2023910842',
    themeColor: '#10b981',
    logoText: 'intelbras',
    sampleLabelText: `INTELBRAS - TECNOLOGIA BRASILEIRA
Roteador WiForce W5-1200F Dual Band AC
Acesso à Configuração: 192.168.1.1 ou meuintelbras.local
Usuário: admin
Senha: admin
Rede Wi-Fi: Intelbras_WiForce_5G
Senha do Wi-Fi: intelbras1234
MAC: 80:7A:BF:55:12:00`,
    description: 'Roteador de alta compatibilidade com IPv6 e protocolo TR-069 de provedores.',
  },
  {
    id: 'huawei-echolife',
    brand: 'Huawei',
    model: 'EchoLife HG8145V5',
    provider: 'Oi Fibra / Provedores Regionais',
    defaultIp: '192.168.100.1',
    defaultUser: 'telecomadmin',
    defaultPass: 'admintelecom',
    wifiSsid: 'HUAWEI-5G-9F2B',
    wifiPassword: 'epongpon2024',
    macAddress: '70:72:0D:33:9F:2B',
    serialNumber: '485754432194AA',
    themeColor: '#ef4444',
    logoText: 'HUAWEI',
    sampleLabelText: `HUAWEI GPON Terminal
Model: EchoLife HG8145V5
Default IP: 192.168.100.1
User Name: telecomadmin
Password: admintelecom
SSID: HUAWEI-5G-9F2B
WPA/WPA2 PreSharedKey: epongpon2024
PON SN: 485754432194AA`,
    description: 'ONT GPON robusta muito utilizada em redes de fibra óptica FTTH.',
  },
  {
    id: 'zte-zxhn',
    brand: 'ZTE',
    model: 'ZXHN F670L',
    provider: 'Algar / TIM / Provedores',
    defaultIp: '192.168.1.1',
    defaultUser: 'user',
    defaultPass: 'user@zte',
    wifiSsid: 'ZTE-Home-5G',
    wifiPassword: 'ztefibra2024',
    macAddress: 'D4:76:EA:44:88:99',
    serialNumber: 'ZTEGC9102488',
    themeColor: '#3b82f6',
    logoText: 'ZTE',
    sampleLabelText: `ZTE Corporation - GPON ONT
Model: ZXHN F670L
Web Access IP: 192.168.1.1
Username: user
Password: user@zte
Wi-Fi SSID: ZTE-Home-5G
Password: ztefibra2024
MAC: D4:76:EA:44:88:99`,
    description: 'Terminal ONT com portas Gigabit e Wi-Fi AC1200.',
  },
];
