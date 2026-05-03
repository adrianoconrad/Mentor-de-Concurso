export type Message = {
  role: 'user' | 'model';
  content: string;
  isMapReady?: boolean;
  mermaidCode?: string;
};

export type GeminiAnalysisResult = {
  mermaidCode: string;
  explanation: string;
  isComplete: boolean;
};

export type MapStyle = 'default' | 'handmade';

export type SavedMap = {
  id: string;
  name: string;
  content: string;
  messages?: Message[];
  createdAt: number;
  style?: MapStyle;
};

export type Folder = {
  id: string;
  name: string;
  maps: SavedMap[];
};

export type Wallpaper = {
  id: string;
  url: string;
  name?: string;
  createdAt: number;
};

export type AppearanceSettings = {
  activeWallpaperId: string | null;
  blur: number;
  opacity: number;
};
