import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Lock, Eye, EyeOff, Zap, AlertTriangle, CheckCircle,
  Info, Sparkles, BookOpen, ChevronLeft, ChevronRight,
  FolderPlus, Terminal, X, Plus, Database
} from 'lucide-react';
import type { AnalysisResult, DictionaryType } from '@/lib/passwordAnalysis';
import CustomDictionaryGenerator from './CustomDictionaryGenerator';
import { analyzePasswordApi, generateCustomDictApi, ApiError } from '@/lib/apiClient';
import type { PersonalData } from './CustomDictionaryGenerator';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface StaticDictCard {
  id: string;
  label: string;
  type: 'static';
  description: string;
}

interface CustomDictCard {
  id: string;
  label: string;
  type: 'custom';
  words: string[];
  createdAt: Date;
}

type DictCard = StaticDictCard | CustomDictCard;

// ---------------------------------------------------------------------------
// Diccionarios estáticos (pre-cargados en el backend)
// ---------------------------------------------------------------------------
const STATIC_DICTS: StaticDictCard[] = [
  { id: 'universal', label: 'Diccionario universal',  type: 'static', description: 'Lista básica de contraseñas comunes' },
  { id: 'rockyou',   label: 'RockYou',                type: 'static', description: '14M contraseñas filtradas reales' },
  { id: 'seclists',  label: 'SecLists',               type: 'static', description: 'Colección de seguridad ofensiva' },
  { id: 'crackstation', label: 'CrackStation',        type: 'static', description: 'Diccionario de cracking masivo' },
  { id: 'weakpass',  label: 'Weakpass',               type: 'static', description: 'Contraseñas débiles conocidas' },
  { id: 'probable',  label: 'Probable Wordlists',     type: 'static', description: 'Wordlists por probabilidad' },
  { id: 'hibp',      label: 'Have I Been Pwned',      type: 'static', description: 'Contraseñas de brechas reales' },
];

const ANALYSIS_STEPS = [
  'Inicializando análisis...',
  'Cargando diccionario...',
  'Comparando patrones...',
  'Buscando coincidencias...',
  'Generando informe...',
];

// ---------------------------------------------------------------------------
// Componente visor de diccionario personalizado
// ---------------------------------------------------------------------------
function DictViewer({ dict, onClose }: { dict: CustomDictCard; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? dict.words.filter(w => w.toLowerCase().includes(search.toLowerCase()))
    : dict.words;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col cyber-panel border-primary/30 z-10 glow-border"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-gradient-primary font-mono">{dict.label}</h2>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {dict.words.length.toLocaleString()} entradas generadas con CUPP
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en el diccionario..."
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 mb-3"
        />

        <div className="flex-1 overflow-y-auto rounded-md border border-border bg-black/40 p-2">
          <div className="grid grid-cols-2 gap-1">
            {filtered.slice(0, 500).map((word, i) => (
              <span key={i} className="font-mono text-xs text-primary/80 px-2 py-0.5 rounded bg-primary/5 truncate">
                {word}
              </span>
            ))}
          </div>
          {filtered.length > 500 && (
            <p className="text-xs text-muted-foreground text-center mt-3 font-mono">
              ... y {(filtered.length - 500).toLocaleString()} entradas más
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 font-mono">Sin resultados</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function PasswordChecker() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDicts, setSelectedDicts] = useState<string[]>(['universal']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showCustomGen, setShowCustomGen] = useState(false);
  const [customDictMatch, setCustomDictMatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customDicts, setCustomDicts] = useState<CustomDictCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [viewingDict, setViewingDict] = useState<CustomDictCard | null>(null);
  const [isGeneratingDict, setIsGeneratingDict] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Todos los diccionarios en el carrusel
  const allDictCards: DictCard[] = [...STATIC_DICTS, ...customDicts];

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // Selección de diccionarios
  // ---------------------------------------------------------------------------
  const toggleDict = (id: string) => {
    // El botón "Diccionario personalizado" abre el generador, no selecciona
    if (id === '__create__') {
      setShowCustomGen(true);
      return;
    }
    setSelectedDicts(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // ---------------------------------------------------------------------------
  // Scroll del carrusel
  // ---------------------------------------------------------------------------
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  // ---------------------------------------------------------------------------
  // Animación de progreso
  // ---------------------------------------------------------------------------
  const runProgressAnimation = async () => {
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      setAnalysisStep(i);
      const targetProgress = ((i + 1) / ANALYSIS_STEPS.length) * 100;
      const currentProg = (i / ANALYSIS_STEPS.length) * 100;
      for (let s = 0; s <= 10; s++) {
        await new Promise(r => setTimeout(r, 60));
        setProgress(currentProg + ((targetProgress - currentProg) * s) / 10);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  };

  // ---------------------------------------------------------------------------
  // Callback: diccionario personalizado generado
  // Ahora NO lanza el análisis — solo guarda en memoria y agrega al carrusel
  // ---------------------------------------------------------------------------
  const handleCustomDictGenerated = useCallback(async (personalData: PersonalData) => {
    setShowCustomGen(false);
    setIsGeneratingDict(true);
    setError(null);

    const dictNumber = customDicts.length + 1;
    const label = `Personalizado ${dictNumber}`;

    try {
      // Sin timeout — CUPP puede tardar lo que necesite según los datos ingresados
      const response = await generateCustomDictApi(personalData);
      const words: string[] = response.dictionary;

      const newDict: CustomDictCard = {
        id: `custom-${Date.now()}`,
        label,
        type: 'custom',
        words,
        createdAt: new Date(),
      };

      setCustomDicts(prev => [...prev, newDict]);
      showToast(`✓ ${label} creado — ${words.length.toLocaleString()} entradas`);

    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor';
      setError(`Error al generar diccionario CUPP: ${msg}`);
    } finally {
      setIsGeneratingDict(false);
    }
  }, [customDicts.length]);

  // ---------------------------------------------------------------------------
  // Análisis principal
  // ---------------------------------------------------------------------------
  const runAnalysis = useCallback(async () => {
    if (!password.trim() || selectedDicts.length === 0) return;

    setResult(null);
    setCustomDictMatch(null);
    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setProgress(0);

    try {
      // Separar dicts estáticos de personalizados seleccionados
      const staticSelected = selectedDicts.filter(id =>
        STATIC_DICTS.some(d => d.id === id)
      );
      const customSelected = selectedDicts
        .map(id => customDicts.find(d => d.id === id))
        .filter(Boolean) as CustomDictCard[];

      // Combinar todas las palabras de dicts personalizados seleccionados
      const allCustomWords = customSelected.flatMap(d => d.words);

      // Mapear IDs estáticos a tipos del backend
      // Pasar los IDs exactos al backend — cada uno busca en su propio diccionario
      const dictTypes: DictionaryType[] = staticSelected.map(id => id as DictionaryType);
      if (allCustomWords.length > 0) dictTypes.push('personal' as DictionaryType);
      const uniqueTypes = [...new Set(dictTypes)];

      const [analysisResult] = await Promise.all([
        analyzePasswordApi(password, uniqueTypes, allCustomWords.length > 0 ? allCustomWords : undefined),
        runProgressAnimation(),
      ]);

      setCustomDictMatch(analysisResult.attackSimulation && allCustomWords.length > 0);
      setResult(analysisResult);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error del servidor: ${err.message}`);
      } else {
        setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [password, selectedDicts, customDicts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runAnalysis();
  };

  const securityColor = (level: string) => {
    if (level === 'low') return 'text-destructive';
    if (level === 'medium') return 'text-warning';
    return 'text-success';
  };

  const securityLabel = (level: string) => {
    if (level === 'low') return 'Baja';
    if (level === 'medium') return 'Media';
    return 'Alta';
  };

  const securityBg = (level: string) => {
    if (level === 'low') return 'border-destructive/50 bg-destructive/5';
    if (level === 'medium') return 'border-warning/50 bg-warning/5';
    return 'border-success/50 bg-success/5';
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-dark">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -40, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[100] rounded-lg border border-primary/40 bg-primary/10 backdrop-blur-sm px-5 py-3 text-sm font-mono text-primary shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-gradient-primary font-mono tracking-tight">
              Verificador de contraseñas
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Simula ataques reales para evaluar la fortaleza de tu contraseña
          </p>
        </motion.div>

        {/* Password Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="cyber-panel mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground font-mono">Ingresa tu contraseña</h2>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu contraseña aquí..."
              className="w-full rounded-lg border border-border bg-input px-4 py-3 pr-12 text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>

        {/* Dictionary Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="cyber-panel mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground font-mono">Diccionarios</h2>
            </div>
            {selectedDicts.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {selectedDicts.length} seleccionado{selectedDicts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <button onClick={() => scroll('left')} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div
              ref={scrollRef}
              onWheel={handleWheel}
              className="flex gap-2 overflow-x-auto py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Botón crear diccionario personalizado — siempre primero */}
              <button
                onClick={() => setShowCustomGen(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-primary/50 bg-primary/5 text-primary font-mono text-sm transition-all duration-200 hover:border-primary hover:bg-primary/10"
              >
                <FolderPlus className="h-4 w-4" />
                + Diccionario personalizado
              </button>

              {/* Diccionarios estáticos */}
              {STATIC_DICTS.map(card => {
                const isSelected = selectedDicts.includes(card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => toggleDict(card.id)}
                    title={card.description}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border font-mono text-sm transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {card.label}
                  </button>
                );
              })}

              {/* Diccionarios personalizados generados */}
              <AnimatePresence>
                {customDicts.map(card => {
                  const isSelected = selectedDicts.includes(card.id);
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="shrink-0 flex items-center gap-1"
                    >
                      <button
                        onClick={() => toggleDict(card.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-l-lg border-y border-l font-mono text-sm transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        <Terminal className="h-4 w-4" />
                        {card.label}
                        <span className="text-xs opacity-60">({card.words.length.toLocaleString()})</span>
                      </button>
                      {/* Botón visor */}
                      <button
                        onClick={() => setViewingDict(card)}
                        title="Ver contenido del diccionario"
                        className={`flex items-center justify-center px-2 py-2.5 rounded-r-lg border font-mono text-sm transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        <Terminal className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <button onClick={() => scroll('right')} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Hint si no hay nada seleccionado */}
          {selectedDicts.length === 0 && (
            <p className="text-xs text-muted-foreground/60 font-mono mt-2">
              Seleccioná al menos un diccionario para analizar
            </p>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUPP Generation Spinner */}
        <AnimatePresence>
          {isGeneratingDict && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-mono text-primary flex items-center gap-3"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Zap className="h-4 w-4 shrink-0" />
              </motion.div>
              <span>Generando diccionario con CUPP... esto puede tardar unos segundos</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <button
            onClick={runAnalysis}
            disabled={!password.trim() || selectedDicts.length === 0 || isAnalyzing || isGeneratingDict}
            className="w-full bg-gradient-primary text-primary-foreground py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed animate-glow-pulse"
          >
            <span className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5" />
              {isAnalyzing ? 'Analizando...' : 'Analizar contraseña'}
            </span>
          </button>
        </motion.div>

        {/* Analysis Progress */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="cyber-panel mb-8 space-y-3"
            >
              {ANALYSIS_STEPS.map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i <= analysisStep ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 font-mono text-sm ${
                    i < analysisStep ? 'text-success' : i === analysisStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {i < analysisStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : i === analysisStep ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Zap className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                  )}
                  {step}
                </motion.div>
              ))}
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                <motion.div className="h-full bg-gradient-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Custom dict attack alert */}
              {customDictMatch && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="cyber-panel border-2 border-destructive/60 bg-destructive/8"
                >
                  <h3 className="text-lg font-semibold text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Simulación de ataque personalizada exitosa
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tu contraseña fue encontrada usando datos personales. Un atacante que te conozca podría acceder fácilmente.
                  </p>
                </motion.div>
              )}

              {/* Security Level */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className={`cyber-panel border-2 ${securityBg(result.securityLevel)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Nivel de Seguridad
                  </h3>
                  <span className={`text-2xl font-bold font-mono ${securityColor(result.securityLevel)}`}>
                    {securityLabel(result.securityLevel)}
                  </span>
                </div>
                {result.foundInDictionary && (
                  <p className="text-sm text-muted-foreground">
                    Encontrada en: <span className="text-destructive font-semibold">{result.dictionaryName}</span>
                  </p>
                )}
              </motion.div>

              {/* Crack Time */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="cyber-panel">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Tiempo estimado de cracking</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ataque de diccionario</p>
                    <p className="font-mono font-semibold text-foreground">{result.crackTime.dictionary}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Fuerza bruta</p>
                    <p className="font-mono font-semibold text-foreground">{result.crackTime.bruteForce}</p>
                  </div>
                </div>
              </motion.div>

              {/* Technical Analysis */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="cyber-panel">
                <div className="flex items-center gap-3 mb-3">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Análisis Técnico</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">▸</span>
                    <span className="text-secondary-foreground"><span className="text-muted-foreground">Longitud:</span> {result.length} caracteres</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">▸</span>
                    <span className="text-secondary-foreground"><span className="text-muted-foreground">Tipos de caracteres:</span> {result.charTypes.join(', ')}</span>
                  </li>
                  {result.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">▸</span>
                      <span className="text-secondary-foreground"><span className="text-muted-foreground">Patrón:</span> {p}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">▸</span>
                    <span className="text-secondary-foreground"><span className="text-muted-foreground">Entropía:</span> {result.entropy} bits</span>
                  </li>
                </ul>
              </motion.div>

              {/* Similar Passwords */}
              {result.similarPasswords.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="cyber-panel">
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Contraseñas Similares
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.similarPasswords.map((sp, i) => (
                      <span key={i} className="rounded-md border border-border bg-muted/40 px-3 py-1.5 font-mono text-sm text-foreground">
                        {sp}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recommendations */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="cyber-panel">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  💡 Recomendaciones
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-secondary-foreground">{rec}</span>
                    </li>
                  ))}
                  {customDictMatch && (
                    <>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-secondary-foreground">Evitar usar nombres propios o datos personales</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-secondary-foreground">No usar fechas importantes como parte de la contraseña</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-secondary-foreground">Evitar combinaciones predecibles (nombre + número)</span>
                      </li>
                    </>
                  )}
                </ul>
              </motion.div>

              {/* Improved Passwords */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="cyber-panel glow-border">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  🚀 Contraseñas Mejoradas
                </h3>
                <div className="space-y-2">
                  {result.improvedPasswords.map((ip, i) => (
                    <div key={i} className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 font-mono text-primary text-sm">
                      {ip}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Attack Simulation */}
              {result.attackSimulation && !customDictMatch && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="cyber-panel border-2 border-destructive/40 bg-destructive/5"
                >
                  <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Simulación de Ataque Exitosa
                  </h3>
                  <div className="space-y-3">
                    {['Cargar diccionario', 'Buscar coincidencia', 'Contraseña encontrada'].map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.2 }}
                        className="flex items-center gap-3 font-mono text-sm"
                      >
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 2 ? 'bg-destructive text-destructive-foreground' : 'bg-primary/20 text-primary'
                        }`}>{i + 1}</span>
                        <span className={i === 2 ? 'text-destructive font-semibold' : 'text-secondary-foreground'}>
                          Paso {i + 1}: {step}
                        </span>
                        <CheckCircle className={`h-4 w-4 ml-auto ${i === 2 ? 'text-destructive' : 'text-success'}`} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Privacy Notice */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-center py-6 border-t border-border"
              >
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Lock className="h-3 w-3" />
                  Tu contraseña es procesada en el servidor y descartada inmediatamente. No se almacena nada.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy notice when no results */}
        {!result && !isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-center mt-16"
          >
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Lock className="h-3 w-3" />
              Tu contraseña es procesada en el servidor y descartada inmediatamente. No se almacena nada.
            </p>
          </motion.div>
        )}
      </div>

      {/* Custom Dictionary Generator Modal */}
      <CustomDictionaryGenerator
        open={showCustomGen}
        onClose={() => setShowCustomGen(false)}
        onGenerated={handleCustomDictGenerated}
      />

      {/* Dictionary Viewer Modal */}
      <AnimatePresence>
        {viewingDict && (
          <DictViewer dict={viewingDict} onClose={() => setViewingDict(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
