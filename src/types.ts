export interface ScannedModem {
  id: string;
  ip: string;
  username: string;
  password: string;
  brand: string;
  model: string;
  wifiSsid?: string;
  wifiPassword?: string;
  macAddress?: string;
  serialNumber?: string;
  scannedAt: string;
  confidence?: 'alta' | 'média' | 'baixa' | string;
  notes?: string;
  sourceImage?: string;
}

export interface RouterBrandPreset {
  id: string;
  brand: string;
  model: string;
  provider?: string;
  defaultIp: string;
  defaultUser: string;
  defaultPass: string;
  wifiSsid: string;
  wifiPassword: string;
  macAddress: string;
  serialNumber: string;
  themeColor: string;
  logoText: string;
  sampleLabelText: string;
  description: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: 'phone' | 'tv' | 'pc' | 'iot' | 'console';
  band: '2.4GHz' | '5GHz' | 'Ethernet';
  signal: number; // 0-100%
  downloadSpeed: string;
  uploadSpeed: string;
  blocked?: boolean;
}
