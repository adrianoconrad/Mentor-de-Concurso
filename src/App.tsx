import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Send, 
  BrainCircuit, 
  History, 
  Trash2, 
  Maximize2, 
  AlertCircle,
  Loader2,
  Paperclip,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Save,
  Download,
  X,
  LogOut,
  LogIn,
  CheckCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MindMap } from './components/MindMap';
import { analyzeStudyMaterialStream } from './services/geminiService';
import { extractTextFromFile } from './lib/fileParser';
import { Message, Folder, SavedMap, MapStyle } from './types';
import { cn } from './lib/utils';
import { auth, signIn, signOut } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  subscribeToFolders, 
  addFolder, 
  removeFolder, 
  addMapToFolder, 
  removeMapFromFolder 
} from './services/folderService';
import {
  subscribeToWallpapers,
  subscribeToAppearance,
  addWallpaper,
  removeWallpaper,
  updateAppearance
} from './services/wallpaperService';
import { AppearanceSettings, Wallpaper } from './types';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('bg-[#E4E3E0]');
  const [glassEffect, setGlassEffect] = useState(true);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    activeWallpaperId: null,
    blur: 0,
    opacity: 100
  });
  const [savingMapIndex, setSavingMapIndex] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '1': true });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingMap, setDeletingMap] = useState<{ folderId: string, mapId: string } | null>(null);
  const [showNewMapConfirm, setShowNewMapConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('default');
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const lastFileName = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setFolders([]);
      return;
    }
    const unsubscribe = subscribeToFolders(user.uid, (data) => {
      setFolders(data);
      if (data.length > 0 && !selectedFolderId) {
        setSelectedFolderId(data[0].id);
      }
    });
    const unsubscribeWallpapers = subscribeToWallpapers(user.uid, (data) => {
      setWallpapers(data);
    });
    const unsubscribeAppearance = subscribeToAppearance(user.uid, (data) => {
      setAppearance(data);
    });
    return () => {
      unsubscribe();
      unsubscribeWallpapers();
      unsubscribeAppearance();
    };
  }, [user]);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (wallpapers.length >= 10) {
      alert('Limite de 10 imagens atingido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await addWallpaper(user.uid, base64, file.name);
      } catch (err: any) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveMap = async (folderId: string, name: string, content: string, chatMessages?: Message[]) => {
    if (!user) {
      alert('Faça login para salvar seus mapas.');
      return;
    }
    const newMap: SavedMap = {
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      name: name || 'Sem Título',
      content,
      messages: chatMessages,
      createdAt: Date.now(),
      style: mapStyle
    };

    try {
      await addMapToFolder(user.uid, folderId, newMap);
      setSavingMapIndex(null);
      setSaveStatus({ type: 'success', message: `Mapa "${newMap.name}" salvo com sucesso em "${folders.find(f => f.id === folderId)?.name}"` });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: `Erro ao salvar: ${err.message}` });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    if (!user) {
      alert('Faça login para criar pastas.');
      return;
    }
    await addFolder(user.uid, newFolderName);
    setNewFolderName('');
  };

  const deleteSavedMap = async (folderId: string, mapId: string) => {
    if (!user) return;
    try {
      await removeMapFromFolder(user.uid, folderId, mapId);
      setSaveStatus({ type: 'success', message: 'Mapa removido com sucesso' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error: any) {
      console.error("Erro ao deletar mapa:", error);
      setSaveStatus({ type: 'error', message: `Erro ao deletar: ${error.message}` });
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setDeletingMap(null);
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const loadSavedMap = (map: SavedMap) => {
    setMapStyle(map.style || 'default');
    if (map.messages && map.messages.length > 0) {
      setMessages(map.messages);
    } else {
      // Fallback if no history was saved
      setMessages([{
        role: 'model',
        content: `Mapa carregado: **${map.name}**`,
        mermaidCode: map.content,
        isMapReady: true
      }]);
    }
    setShowLibrary(false);
  };

  const deleteFolder = async (id: string) => {
    if (!user) return;
    console.log(`App: Deleting folder ${id}`);
    try {
      await removeFolder(user.uid, id);
      setDeletingFolderId(null);
    } catch (error: any) {
      console.error("Erro ao deletar pasta:", error);
      alert(`Erro: ${error.message}`);
    }
  };

  const startNewMap = () => {
    setMessages([]);
    setError(null);
    setInput('');
    setIsLoading(false);
    setIsExtracting(false);
    setShowNewMapConfirm(false);
  };

  const processContent = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Display a short snippet in UI
    const userMessage: Message = { role: 'user', content: content.substring(0, 300) + (content.length > 300 ? '...' : '') };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);
    setError(null);

    const modelMessageIndex = currentMessages.length;
    const initialModelMessage: Message = {
      role: 'model',
      content: '',
      mermaidCode: '',
      isMapReady: false
    };

    setMessages(prev => [...prev, initialModelMessage]);

    try {
      const stream = analyzeStudyMaterialStream(content);
      
      for await (const chunk of stream) {
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[modelMessageIndex]) {
            newMessages[modelMessageIndex] = {
              ...newMessages[modelMessageIndex],
              content: chunk.explanation,
              mermaidCode: chunk.mermaidCode,
              isMapReady: chunk.isComplete && !!chunk.mermaidCode
            };
          }
          return newMessages;
        });

        if (chunk.isComplete && chunk.mermaidCode && user) {
          const folderToSave = selectedFolderId || (folders.length > 0 ? folders[0].id : null);
          if (folderToSave) {
            saveMap(folderToSave, lastFileName.current || 'Estudo IA', chunk.mermaidCode, [
              ...currentMessages,
              {
                role: 'model',
                content: chunk.explanation,
                mermaidCode: chunk.mermaidCode,
                isMapReady: true
              }
            ]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao processar o material. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    if (user && !selectedFolderId && folders.length > 0) {
      alert('Selecione uma pasta para salvar seu estudo.');
      setShowLibrary(true);
      return;
    }

    const currentInput = input;
    setInput('');
    await processContent(currentInput);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtracting(true);
    setError(null);

    try {
      let combinedText = '';
      const filesArray = Array.from(files);

      for (const file of filesArray) {
        try {
          lastFileName.current = file.name.split('.')[0];
          const text = await extractTextFromFile(file);
          if (text.trim().length > 0) {
            combinedText += (combinedText ? '\n\n' : '') + `[Documento: ${file.name}]\n${text}`;
          }
        } catch (fileErr) {
          console.error(`Erro ao ler ${file.name}:`, fileErr);
        }
      }

      if (combinedText.trim().length === 0) {
        throw new Error('Nenhum dos arquivos pôde ser lido ou estão vazios.');
      }

      // Auto-submit after extraction
      await processContent(combinedText);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao ler os arquivos.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearHistory = () => {
    setMessages([]);
    setShowClearHistoryConfirm(false);
  };

  const bgOptions = [
    { name: 'Gelo Polar', value: 'bg-[#E4E3E0]', dark: false },
    { name: 'Noite Profunda', value: 'bg-[#0f172a]', dark: true },
    { name: 'Céu de Outono', value: 'bg-[#f0f9ff]', dark: false },
    { name: 'Pétalas de Rosa', value: 'bg-[#fff1f2]', dark: false },
    { name: 'Esmeralda Suave', value: 'bg-[#f0fdf4]', dark: false },
    { name: 'Violeta Místico', value: 'bg-[#faf5ff]', dark: false },
    { name: 'Carvão Moderno', value: 'bg-[#121212]', dark: true },
    { name: 'Areia do Deserto', value: 'bg-[#fefce8]', dark: false },
    { name: 'Menta Fresca', value: 'bg-[#ecfdf5]', dark: false },
    { name: 'Azul Cobalto', value: 'bg-[#eff6ff]', dark: false },
    { name: 'Cinza Executivo', value: 'bg-[#f8fafc]', dark: false },
  ];

  return (
    <div 
      className={cn("min-h-screen transition-all duration-700 font-sans selection:bg-[#4A5D23] selection:text-white relative overflow-x-hidden", bgColor)}
      onClick={() => { if (showLibrary) setShowLibrary(false); }}
    >
      {appearance.activeWallpaperId && wallpapers.find(w => w.id === appearance.activeWallpaperId) && (
        <div 
          className="fixed inset-0 pointer-events-none transition-all duration-700" 
          style={{ 
            backgroundImage: `url(${wallpapers.find(w => w.id === appearance.activeWallpaperId)?.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `blur(${appearance.blur}px)`,
            opacity: appearance.opacity / 100,
            zIndex: 0
          }}
        />
      )}
      <div className="relative z-10 min-h-screen flex flex-col">
      {/* Background Selector Modal ... */}

      {/* Library Overlay */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-y-0 right-0 z-[120] w-full max-w-md bg-white/80 backdrop-blur-3xl border-l border-black/5 shadow-[-32px_0_64px_-16px_rgba(0,0,0,0.2)] p-8 flex flex-col gap-8"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-3 rounded-2xl shadow-lg">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Biblioteca</h2>
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Mapas Mental de Elite</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLibrary(false)}
                className="p-3 hover:bg-black/5 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                  <div className="bg-[#4A5D23]/10 p-6 rounded-[2.5rem]">
                    <LogIn size={48} className="text-[#4A5D23]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Acesse sua biblioteca</h3>
                    <p className="text-xs opacity-50 font-bold uppercase tracking-tight mt-2 leading-relaxed">
                      Faça login para salvar seus mapas mentais e organizá-los em pastas.
                    </p>
                  </div>
                  <button 
                    onClick={() => signIn()}
                    className="w-full py-4 bg-[#4A5D23] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                  >
                    Entrar com Google
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nova pasta..."
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      className="flex-1 bg-black/5 border-none px-6 py-4 rounded-2xl text-sm font-bold placeholder:opacity-30 focus:ring-2 focus:ring-black/10 transition-all"
                    />
                    <button 
                      onClick={createFolder}
                      className="p-4 bg-black text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <FolderPlus size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-6">
                    {folders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                        <FolderPlus size={32} />
                        <p className="text-[10px] font-mono uppercase tracking-[0.4em] mt-4">Nenhuma pasta criada</p>
                      </div>
                    ) : (
                      folders.map(folder => (
                          <div key={folder.id} className="space-y-1 relative">
                            <div className="group flex items-center gap-2">
                              <button 
                                onClick={() => toggleFolder(folder.id)}
                                className="flex-1 flex items-center justify-between p-2.5 bg-white/50 border border-black/5 rounded-xl hover:bg-white transition-all shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  <span className="font-black uppercase tracking-tighter text-[10px] text-[#141414] truncate max-w-[150px]">{folder.name}</span>
                                </div>
                                <span className="px-2 py-0.5 bg-black text-white rounded-full text-[8px] font-black">{folder.maps.length}</span>
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingFolderId(folder.id);
                                }}
                                className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm shrink-0 flex items-center justify-center cursor-pointer"
                                title="Excluir Pasta"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {deletingFolderId === folder.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 z-30 bg-red-600 rounded-xl flex items-center justify-between px-4 text-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest">Excluir pasta?</span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} 
                                    className="px-3 py-1 bg-white text-red-600 rounded-lg text-[9px] font-black uppercase"
                                  >
                                    Sim
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeletingFolderId(null); }} 
                                    className="px-3 py-1 bg-black/20 text-white rounded-lg text-[9px] font-black uppercase"
                                  >
                                    Não
                                  </button>
                                </div>
                              </motion.div>
                            )}

                          <AnimatePresence>
                            {expandedFolders[folder.id] && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pl-6 space-y-2 overflow-hidden"
                              >
                                {folder.maps.length === 0 ? (
                                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest p-4 italic">Nenhum mapa salvo nesta pasta.</p>
                                ) : (
                                  folder.maps.map(map => (
                                    <div 
                                      key={map.id}
                                      className="group relative flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all overflow-hidden"
                                    >
                                      {/* Translucent Delete Button positioned above the title */}
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDeletingMap({ folderId: folder.id, mapId: map.id });
                                        }}
                                        className="absolute top-1.5 left-4 p-1 text-red-500/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-10"
                                        title="Deletar Mapa"
                                      >
                                        <Trash2 size={10} />
                                      </button>

                                      <button 
                                        onClick={() => {
                                          setExpandedMap(map.content);
                                          setMapStyle(map.style || 'default');
                                        }}
                                        className="flex-1 text-left mt-1"
                                      >
                                        <p className="text-xs font-black uppercase tracking-tight truncate pr-8">{map.name}</p>
                                        <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest leading-none mt-1">
                                          {new Date(map.createdAt).toLocaleDateString()}
                                        </p>
                                      </button>
                                      <div className="flex gap-1">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedMap(map.content);
                                            setMapStyle(map.style || 'default');
                                          }}
                                          className="p-3 text-[#4A5D23] hover:bg-[#4A5D23] hover:text-white rounded-xl transition-all cursor-pointer shadow-sm border border-black/5 bg-white"
                                          title="Expandir"
                                        >
                                          <Maximize2 size={16} />
                                        </button>
                                      </div>

                                      {deletingMap?.folderId === folder.id && deletingMap?.mapId === map.id && (
                                        <motion.div 
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          className="absolute inset-0 z-30 bg-red-600/95 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-4 text-white"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <span className="text-[10px] font-black uppercase tracking-widest">Excluir?</span>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteSavedMap(folder.id, map.id);
                                            }} 
                                            className="bg-white text-red-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-lg"
                                          >
                                            Sim
                                          </button>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingMap(null);
                                            }} 
                                            className="bg-black/20 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase"
                                          >
                                            Não
                                          </button>
                                        </motion.div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBgModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowBgModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#E4E3E0]/95 backdrop-blur-2xl p-8 rounded-[2.5rem] max-w-sm w-full shadow-[0_64px_128px_-32px_rgba(0,0,0,0.5)] border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-[#141414] opacity-70">PLANO DE FUNDO</h3>
                  <p className="text-[10px] font-mono uppercase opacity-40 tracking-widest font-black">{wallpapers.length}/10 ARQUIVOS</p>
                </div>
                <button 
                  onClick={() => document.getElementById('wallpaper-upload')?.click()}
                  className="flex items-center gap-2 text-[#4A5D23] font-black uppercase text-xs tracking-tighter hover:scale-105 transition-transform"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-[#4A5D23] flex items-center justify-center">
                    <span className="text-sm leading-none">+</span>
                  </div>
                  Adicionar
                </button>
                <input 
                  id="wallpaper-upload"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleWallpaperUpload}
                />
              </div>

              <div className="bg-black/5 rounded-[2rem] p-6 space-y-6 mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>DESFOQUE</span>
                    <span>{appearance.blur}PX</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="40" 
                    value={appearance.blur}
                    onChange={(e) => updateAppearance(user?.uid || '', { blur: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>OPACIDADE</span>
                    <span>{appearance.opacity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={appearance.opacity}
                    onChange={(e) => updateAppearance(user?.uid || '', { opacity: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateAppearance(user?.uid || '', { activeWallpaperId: null })}
                  className={cn(
                    "h-24 rounded-2xl border-2 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all",
                    !appearance.activeWallpaperId ? "border-[#4A5D23] bg-white shadow-lg" : "border-transparent bg-white/40 opacity-40 hover:opacity-100"
                  )}
                >
                  NENHUM
                </button>
                {wallpapers.map((wp) => (
                  <div key={wp.id} className="relative group">
                    <button
                      onClick={() => updateAppearance(user?.uid || '', { activeWallpaperId: wp.id })}
                      style={{ backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      className={cn(
                        "w-full h-24 rounded-2xl border-2 transition-all overflow-hidden",
                        appearance.activeWallpaperId === wp.id ? "border-[#4A5D23] scale-105 shadow-xl" : "border-transparent"
                      )}
                    >
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                        <span className="text-[8px] font-black text-white uppercase truncate drop-shadow-md max-w-[80%]">{wp.name}</span>
                      </div>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Deletar este papel de parede?')) removeWallpaper(user?.uid || '', wp.id);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mind Map Overlay (Full Screen) */}
      <AnimatePresence>
        {expandedMap && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl p-4 md:p-6 flex flex-col items-center justify-center overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full relative flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white shadow-2xl px-8 py-4 rounded-[2rem] md:rounded-[4rem] border border-black/5">
                <div className="flex items-center gap-4">
                  <div className="bg-[#4A5D23] p-3 rounded-full text-white">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-bold uppercase tracking-widest text-lg text-[#141414]">Revisão Imersiva</h2>
                    <p className="font-mono text-[9px] opacity-40 uppercase tracking-[0.3em] text-[#141414]">LAYOUT PERSONALIZADO</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-black/5 p-1 rounded-full border border-black/5">
                  {(['default', 'handmade'] as MapStyle[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setMapStyle(s)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all",
                        mapStyle === s ? "bg-[#4A5D23] text-white shadow-lg" : "text-black/40 hover:text-black"
                      )}
                    >
                      {s === 'default' ? 'Padrão' : 'Manual'}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setExpandedMap(null)}
                  className="bg-[#141414] text-white px-10 py-3 rounded-full font-black uppercase text-sm transition-all hover:bg-[#4A5D23] active:scale-95 shadow-xl"
                >
                  Fechar
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative group">
                <MindMap markdown={expandedMap} style={mapStyle} className="bg-white/50" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-xl border-b border-black/5 px-8 py-4 flex justify-between items-center transition-all">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-[#141414] p-3 rounded-2xl shadow-xl"
          >
            <BrainCircuit className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-[#141414]">Mentor INSS</h1>
            <p className="font-mono text-[9px] uppercase font-bold opacity-40 tracking-[0.4em] mt-1">High Performance AI</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNewMapConfirm(true)}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 bg-[#4A5D23] text-white rounded-full hover:scale-105 active:scale-95 transition-all text-xs md:text-sm font-black uppercase tracking-tighter shadow-xl"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Novo Mapa</span>
          </button>

          <button 
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#141414] text-white rounded-full hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-tighter shadow-xl"
          >
            <LayoutGrid size={18} />
            Biblioteca
          </button>
          
          <div className="hidden lg:flex bg-white/20 backdrop-blur-xl border border-white/40 rounded-full p-2 gap-3 shadow-xl">
            <button 
              onClick={() => setGlassEffect(!glassEffect)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                glassEffect ? "bg-white text-black shadow-lg" : "text-black/40 hover:text-black"
              )}
            >
              Vidro: {glassEffect ? 'ON' : 'OFF'}
            </button>
            <div className="w-[1px] bg-black/10 my-1" />
            <button 
              onClick={() => setShowBgModal(true)}
              className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all bg-black/5 hover:bg-black/10"
            >
              Trocar Fundo
            </button>
          </div>
          <button 
            onClick={() => setShowClearHistoryConfirm(true)}
            className="p-3 bg-white/40 backdrop-blur-md border border-black/5 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
            title="Limpar Histórico"
          >
            <Trash2 size={20} />
          </button>
          
          <div className="w-[1px] bg-black/10 my-2 h-8" />

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-tighter text-[#141414] leading-none">{user.displayName || 'Usuário'}</p>
                <p className="text-[8px] font-mono opacity-40 uppercase tracking-widest mt-1">Sincronizado</p>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-3 bg-white/40 border border-black/5 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => signIn()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4A5D23] text-white rounded-full hover:scale-105 active:scale-95 transition-all text-sm font-black uppercase tracking-tighter shadow-xl"
            >
              <LogIn size={18} />
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main 
        id="main-workspace" 
        className="max-w-6xl mx-auto px-8 flex flex-col items-center justify-start pt-16 min-h-[calc(100vh-120px)] transition-all cursor-default"
      >
        {messages.length === 0 && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center space-y-3 text-center mt-0"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-[#4A5D23]/10 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
              <div className="relative w-20 h-20 bg-white/40 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/60">
                <BookOpen className="w-10 h-10 text-[#141414]" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-serif italic max-w-3xl leading-tight text-[#141414]">
                Transforme editais complexos em <span className="text-[#4A5D23] px-1 not-italic font-sans font-black uppercase tracking-tighter decoration-[#4A5D23]/20 underline underline-offset-4 decoration-2">mapas visuais</span> estratégicos.
              </h2>
              <p 
                className="max-w-md mx-auto opacity-40 text-center"
                style={{ 
                  fontFamily: 'Arial',
                  fontStyle: 'italic',
                  fontWeight: 'normal',
                  fontSize: '19px',
                  lineHeight: '34.25px'
                }}
              >
                Plataforma de mentoria baseada em neurociência.
              </p>
            </div>

            {user && folders.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl border border-black/5 flex flex-col gap-2 items-center"
              >
                <p className="text-[10px] font-black uppercase tracking-tighter opacity-40">Salvar estudo em:</p>
                <div className="relative">
                  <button 
                    onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                    className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-black/5 hover:bg-white/60 transition-all min-w-[200px] justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutGrid size={16} className="text-[#4A5D23]" />
                      <span className="text-xs font-black uppercase tracking-tighter text-[#4A5D23]">
                        {folders.find(f => f.id === selectedFolderId)?.name || 'Selecionar Pasta'}
                      </span>
                    </div>
                    <ChevronDown size={14} className={cn("text-[#4A5D23] transition-transform", showFolderDropdown && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {showFolderDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowFolderDropdown(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-white/20 backdrop-blur-2xl border border-white/40 rounded-3xl overflow-hidden shadow-2xl p-1"
                        >
                          {folders.map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setSelectedFolderId(f.id);
                                setShowFolderDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                selectedFolderId === f.id 
                                  ? "bg-[#4A5D23] text-white shadow-lg shadow-[#4A5D23]/20" 
                                  : "text-[#4A5D23] hover:bg-white/40"
                              )}
                            >
                              {f.name}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-6">
              {[
                { id: '01', title: 'Neuro-Mapas', desc: 'Estrutura horizontal periférica.' },
                { id: '02', title: 'Filtro de Elite', desc: 'Prazos e rasteiras imediatas.' },
                { id: '03', title: 'Auto-Process', desc: 'Documento para mapa em segundos.' }
              ].map((item) => (
                <div key={item.id} className="p-6 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] text-left space-y-3 shadow-sm hover:shadow-md hover:translate-y-[-4px] transition-all duration-300">
                  <div className="w-10 h-10 bg-[#4A5D23] text-white rounded-xl flex items-center justify-center font-black italic shadow-lg text-sm">
                    {item.id}
                  </div>
                  <p className="text-sm font-black uppercase tracking-tighter text-[#141414] leading-tight">{item.title}</p>
                  <p className="text-[10px] opacity-50 leading-tight font-bold uppercase tracking-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message List */}
        <div className="space-y-24">
          {messages.map((msg, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className={cn(
                "flex items-start gap-6",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}>
                <div className={cn(
                  "p-4 rounded-3xl shrink-0 shadow-2xl",
                  msg.role === 'user' ? "bg-[#141414] text-white" : "bg-white border border-black/5"
                )}>
                  {msg.role === 'user' ? <BookOpen size={24} /> : <BrainCircuit size={24} />}
                </div>
                
                <div className={cn(
                  "max-w-[90%] space-y-8",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  <div className={cn(
                    "p-10 border border-white/60 relative rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]",
                    glassEffect ? "bg-white/20 backdrop-blur-md" : "bg-white/80"
                  )}>
                    <div className={cn(
                      "flex items-center gap-3 mb-6 opacity-30 font-mono text-[10px] font-black uppercase tracking-[0.4em]",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}>
                      {msg.role === 'user' ? 'Input Data' : 'Expert Mentor AI'}
                    </div>
                    
                    {msg.role === 'user' ? (
                      <p className="text-lg font-serif italic text-[#141414] leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="prose prose-lg max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:leading-relaxed text-[#141414]">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {msg.mermaidCode && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className={cn(
                        "flex items-center justify-between",
                        msg.role === 'user' ? "flex-row-reverse" : "px-6"
                      )}>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setExpandedMap(msg.mermaidCode || null)}
                            className="group flex items-center gap-3 px-8 py-4 bg-[#141414] text-white rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all text-xs uppercase font-black tracking-widest shadow-2xl"
                          >
                            <Maximize2 size={16} className="group-hover:rotate-12 transition-transform" />
                            Expandir Visão Imersiva
                          </button>
                          <button 
                            onClick={() => setSavingMapIndex(index)}
                            className="p-4 bg-white border border-black/5 rounded-[1.5rem] hover:bg-green-50 hover:text-green-600 transition-all shadow-sm"
                            title="Salvar na Biblioteca"
                          >
                            <Save size={20} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 opacity-30 font-mono text-[10px] font-bold uppercase tracking-widest">
                          <RefreshCw size={12} />
                          Rendering SVG
                        </div>
                      </div>

                      {savingMapIndex === index && (
                        <div className="mx-6 p-5 bg-white/90 backdrop-blur-xl rounded-3xl border border-black/5 shadow-2xl space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <h4 className="font-black uppercase tracking-tighter text-xs">Salvar em qual pasta?</h4>
                            <button onClick={() => setSavingMapIndex(null)} className="p-1 hover:bg-black/5 rounded-full"><X size={14} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {folders.map(f => (
                              <button 
                                key={f.id}
                                onClick={() => saveMap(f.id, lastFileName.current, msg.mermaidCode || '', messages)}
                                className="px-3 py-2 bg-black/5 hover:bg-black text-black hover:text-white rounded-xl text-[9px] uppercase font-black tracking-tight transition-all text-left truncate"
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-white/20 backdrop-blur-xl p-4 rounded-[4rem] border border-white/60 shadow-inner h-[400px] overflow-hidden">
                        <MindMap markdown={msg.mermaidCode} />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-center gap-6 py-20">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-[#141414]" />
                <div className="absolute inset-0 blur-2xl bg-[#4A5D23]/30 animate-pulse rounded-full" />
              </div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.6em] animate-pulse">Sintetizando Conhecimento...</p>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="p-8 bg-red-500 text-white rounded-[2rem] flex items-center gap-6 shadow-2xl"
            >
              <AlertCircle size={32} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-1">System Error</p>
                <p className="text-lg font-bold">{error}</p>
              </div>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-black uppercase tracking-tighter text-sm min-w-[300px]",
              saveStatus.type === 'success' ? "bg-[#4A5D23]" : "bg-red-600"
            )}
          >
            {saveStatus.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="flex-1">{saveStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Map Confirmation Modal */}
      <AnimatePresence>
        {showNewMapConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowNewMapConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[2rem] max-w-sm w-full shadow-2xl border border-white/20 text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-[#4A5D23]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw size={32} className="text-[#4A5D23]" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Novo Mapa Mental?</h3>
                <p className="text-xs opacity-50 font-bold uppercase tracking-tight mt-2">Isso limpará a conversa atual. Os mapas na biblioteca não serão afetados.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={startNewMap}
                  className="flex-1 py-4 bg-[#4A5D23] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setShowNewMapConfirm(false)}
                  className="flex-1 py-4 bg-black/5 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear History Confirmation Modal */}
      <AnimatePresence>
        {showClearHistoryConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setShowClearHistoryConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[2rem] max-w-sm w-full shadow-2xl border border-white/20 text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-red-600">Limpar Histórico?</h3>
                <p className="text-xs opacity-50 font-bold uppercase tracking-tight mt-2">Deseja realmente limpar toda a conversa de estudos atual?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={clearHistory}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  Limpar
                </button>
                <button 
                  onClick={() => setShowClearHistoryConfirm(false)}
                  className="flex-1 py-4 bg-black/5 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Fixed Input Bar */}
      <AnimatePresence>
        {messages.length === 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 w-full px-4 z-[80] transition-all duration-500"
          >
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
              <AnimatePresence>
                {isExtracting && (
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    className="flex items-center gap-3 bg-white/95 backdrop-blur-2xl px-5 py-2 rounded-full border border-black/5 shadow-xl w-fit ml-auto"
                  >
                    <div className="w-1.5 h-1.5 bg-[#4A5D23] rounded-full animate-ping" />
                    <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#4A5D23]">Processando Ficheiros...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <form 
                onSubmit={handleSubmit}
                className="w-full"
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.txt,.md"
                  multiple
                  className="hidden"
                />
                
                <div className={cn(
                  "border border-white/60 p-2 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] flex flex-col gap-1 transition-all focus-within:shadow-[0_48px_96px_-24px_rgba(0,0,0,0.2)]",
                  glassEffect ? "bg-white/40 backdrop-blur-3xl" : "bg-white"
                )}>
                  <div className="flex items-center justify-between">
                    {/* Folder selection removed as it was redundant */}
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      disabled={isLoading || isExtracting}
                      className="p-4 text-[#141414] hover:bg-black/5 rounded-[1.8rem] transition-all disabled:opacity-30 shrink-0"
                    >
                      <Paperclip size={24} />
                    </button>
                    
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading || isExtracting}
                      placeholder={isExtracting ? "Extraindo dados..." : "Tema ou ficheiros..."}
                      className="flex-1 bg-transparent border-none p-4 min-h-[56px] max-h-[150px] text-base font-medium focus:outline-none focus:ring-0 placeholder:opacity-30 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-[0.2em] resize-none transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    
                    <button
                      type="submit"
                      disabled={isLoading || isExtracting || !input.trim()}
                      className="bg-[#141414] text-white p-4 rounded-[1.8rem] disabled:opacity-30 transition-all hover:scale-105 active:scale-95 shadow-xl shrink-0"
                    >
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send size={24} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
