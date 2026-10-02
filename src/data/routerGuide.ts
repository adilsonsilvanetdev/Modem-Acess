export interface RouterIpReference {
  brand: string;
  commonIps: string[];
  defaultUser: string;
  defaultPass: string;
  notes: string;
}

export const ROUTER_IP_REFERENCES: RouterIpReference[] = [
  {
    brand: 'Vivo Fibra (MitraStar / Askey)',
    commonIps: ['192.168.15.1'],
    defaultUser: 'admin',
    defaultPass: 'Senha na etiqueta (geralmente 8 a 10 dígitos com letras e símbolos)',
    notes: 'Acesse http://192.168.15.1 e utilize a senha impressa na etiqueta física na base do modem.',
  },
  {
    brand: 'Claro / NET (Humax / Sagemcom / Technicolor)',
    commonIps: ['192.168.0.1', '192.168.100.1'],
    defaultUser: 'admin',
    defaultPass: 'admin ou senha da etiqueta (ou deixe senha em branco em modelos antigos)',
    notes: 'Em alguns modelos Humax, o login é "admin" e a senha é a chave do Wi-Fi impressa.',
  },
  {
    brand: 'Oi Fibra (Huawei / ZTE / Nokia)',
    commonIps: ['192.168.1.1', '192.168.100.1'],
    defaultUser: 'admin ou telecomadmin',
    defaultPass: 'admintelecom ou senha na etiqueta',
    notes: 'Para acesso avançado em ONTs Huawei da Oi: user telecomadmin / pass admintelecom.',
  },
  {
    brand: 'TIM UltraFibra (Live TIM)',
    commonIps: ['192.168.1.1', '192.168.0.1'],
    defaultUser: 'admin',
    defaultPass: 'admin ou timadmin',
    notes: 'Geralmente roteadores SAGEMCOM ou ZTE.',
  },
  {
    brand: 'TP-Link',
    commonIps: ['192.168.0.1', '192.168.1.1', 'tplinkwifi.net'],
    defaultUser: 'admin',
    defaultPass: 'admin (ou senha configurada no primeiro acesso)',
    notes: 'Novos roteadores TP-Link solicitam criar uma nova senha no primeiro acesso.',
  },
  {
    brand: 'Intelbras',
    commonIps: ['192.168.1.1', '10.0.0.1', 'meuintelbras.local'],
    defaultUser: 'admin',
    defaultPass: 'admin',
    notes: 'Roteadores WiForce e Action usam 192.168.1.1 por padrão.',
  },
  {
    brand: 'Huawei',
    commonIps: ['192.168.100.1', '192.168.8.1', '192.168.3.1'],
    defaultUser: 'admin ou telecomadmin',
    defaultPass: 'admin ou admintelecom',
    notes: 'Em roteadores residenciais mesh (linha AX2, WS5200), o padrão é 192.168.3.1.',
  },
  {
    brand: 'D-Link',
    commonIps: ['192.168.0.1', '192.168.1.1'],
    defaultUser: 'admin',
    defaultPass: '(vazio / em branco) ou admin',
    notes: 'Em roteadores clássicos D-Link, a senha padrão de fábrica costuma ser vazia.',
  },
  {
    brand: 'MikroTik RouterOS',
    commonIps: ['192.168.88.1'],
    defaultUser: 'admin',
    defaultPass: '(vazio / sem senha)',
    notes: 'Acesso via WebFig pelo navegador na porta 80 ou via WinBox.',
  },
  {
    brand: 'ZTE',
    commonIps: ['192.168.1.1', '192.168.0.1'],
    defaultUser: 'user ou admin',
    defaultPass: 'user@zte ou senha da etiqueta',
    notes: 'Terminal óptico GPON comum em provedores regionais.',
  },
];
