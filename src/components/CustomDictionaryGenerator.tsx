import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, CheckCircle, User, Calendar, Heart,
  Dog, Building2, Hash, MessageSquare, Baby, AlertCircle
} from 'lucide-react';

export interface PersonalData {
  // Sobre el target
  nombre: string;
  apellido: string;
  apodo: string;
  fechaNacimiento: string;       // DD/MM/YYYY
  // Pareja
  parejaFecha: string;
  // Hijo/a
  hijoNombre: string;
  hijoApodo: string;
  hijoFecha: string;             // DD/MM/YYYY
  // Otros
  mascota: string;
  empresa: string;
  palabrasClave: string;
  numerosEspeciales: string;
}

// ---------------------------------------------------------------------------
// Definición de campos con validaciones exactas de CUPP
// ---------------------------------------------------------------------------
interface Field {
  key: keyof PersonalData;
  label: string;
  cuppQuestion: string;   // La pregunta exacta que hace CUPP
  placeholder: string;
  icon: React.ReactNode;
  validate: (v: string) => string | null;   // null = ok, string = error
  format?: (v: string) => string;           // formatea mientras escribe
  section: string;
}

const onlyLetters = (v: string): string | null => {
  if (!v) return null;
  if (/\d/.test(v)) return 'No puede contener números';
  if (/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']/.test(v)) return 'Solo letras y guiones';
  return null;
};

const dateFormat = (v: string): string | null => {
  if (!v) return null;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return 'Formato: DD/MM/YYYY (ej: 15/03/1995)';
  const [dd, mm, yyyy] = v.split('/').map(Number);
  if (mm < 1 || mm > 12) return 'Mes inválido (01-12)';
  if (dd < 1 || dd > 31) return 'Día inválido (01-31)';
  if (yyyy < 1900 || yyyy > new Date().getFullYear()) return 'Año inválido';
  return null;
};

const onlyNumbers = (v: string): string | null => {
  if (!v) return null;
  if (!/^[\d\s,]+$/.test(v)) return 'Solo números, separados por comas';
  return null;
};

const FIELDS: Field[] = [
  // ── Sobre el target ──────────────────────────────────────────────────────
  {
    key: 'nombre',
    section: 'Target',
    label: 'Nombre',
    cuppQuestion: '> First name:',
    placeholder: 'Ej: Nicolas',
    icon: <User className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'apellido',
    section: 'Target',
    label: 'Apellido',
    cuppQuestion: '> Surname:',
    placeholder: 'Ej: García',
    icon: <User className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'apodo',
    section: 'Target',
    label: 'Apodo / Nickname',
    cuppQuestion: '> Nickname:',
    placeholder: 'Ej: Nico, Nicho',
    icon: <User className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'fechaNacimiento',
    section: 'Target',
    label: 'Fecha de nacimiento',
    cuppQuestion: '> Birthdate (DDMMYYYY):',
    placeholder: 'DD/MM/YYYY — ej: 15/03/1995',
    icon: <Calendar className="h-4 w-4" />,
    validate: dateFormat,
    format: (v: string) => {
      // Auto-insertar "/" mientras escribe
      const digits = v.replace(/\D/g, '').slice(0, 8);
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
      return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    },
  },

  // ── Pareja ───────────────────────────────────────────────────────────────
  {
    key: 'parejaFecha',
    section: 'Pareja',
    label: 'Fecha de nacimiento de la pareja',
    cuppQuestion: '> Partner\'s birthdate (DDMMYYYY):',
    placeholder: 'DD/MM/YYYY — ej: 22/07/1993',
    icon: <Heart className="h-4 w-4" />,
    validate: dateFormat,
    format: (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 8);
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
      return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    },
  },

  // ── Hijo/a ───────────────────────────────────────────────────────────────
  {
    key: 'hijoNombre',
    section: 'Hijo/a',
    label: 'Nombre del hijo/a',
    cuppQuestion: '> Child\'s name:',
    placeholder: 'Ej: Sofia',
    icon: <Baby className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'hijoApodo',
    section: 'Hijo/a',
    label: 'Apodo del hijo/a',
    cuppQuestion: '> Child\'s nickname:',
    placeholder: 'Ej: Sofi',
    icon: <Baby className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'hijoFecha',
    section: 'Hijo/a',
    label: 'Fecha de nacimiento del hijo/a',
    cuppQuestion: '> Child\'s birthdate (DDMMYYYY):',
    placeholder: 'DD/MM/YYYY — ej: 10/11/2010',
    icon: <Baby className="h-4 w-4" />,
    validate: dateFormat,
    format: (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 8);
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
      return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    },
  },

  // ── Otros ─────────────────────────────────────────────────────────────────
  {
    key: 'mascota',
    section: 'Otros',
    label: 'Nombre de la mascota',
    cuppQuestion: '> Pet\'s name:',
    placeholder: 'Ej: Luna, Max',
    icon: <Dog className="h-4 w-4" />,
    validate: onlyLetters,
  },
  {
    key: 'empresa',
    section: 'Otros',
    label: 'Empresa donde trabaja',
    cuppQuestion: '> Company name:',
    placeholder: 'Ej: Google, Mercadolibre',
    icon: <Building2 className="h-4 w-4" />,
    validate: (v: string) => {
      if (!v) return null;
      if (/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_.]/.test(v)) return 'Caracteres inválidos';
      return null;
    },
  },
  {
    key: 'palabrasClave',
    section: 'Otros',
    label: 'Palabras clave importantes',
    cuppQuestion: '> Do you want to add some key words about the victim?',
    placeholder: 'Ej: river, boca, dios — separadas por comas',
    icon: <MessageSquare className="h-4 w-4" />,
    validate: (v: string) => {
      if (!v) return null;
      if (/\d/.test(v)) return 'Solo letras, sin números (usá el campo de abajo para números)';
      return null;
    },
  },
  {
    key: 'numerosEspeciales',
    section: 'Otros',
    label: 'Números especiales',
    cuppQuestion: '> Special numbers (e.g. 1337, 666):',
    placeholder: 'Ej: 10, 777, 2024 — separados por comas',
    icon: <Hash className="h-4 w-4" />,
    validate: onlyNumbers,
  },
];

const SECTIONS = ['Target', 'Pareja', 'Hijo/a', 'Otros'];

const GENERATION_STEPS = [
  'Procesando datos personales...',
  'Aplicando algoritmo CUPP...',
  'Generando combinaciones...',
  'Aplicando leet speak y variaciones...',
  'Finalizando diccionario...',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerated: (data: PersonalData) => void;
}

const EMPTY: PersonalData = {
  nombre: '', apellido: '', apodo: '', fechaNacimiento: '',
  parejaFecha: '',
  hijoNombre: '', hijoApodo: '', hijoFecha: '',
  mascota: '', empresa: '', palabrasClave: '', numerosEspeciales: '',
};

export default function CustomDictionaryGenerator({ open, onClose, onGenerated }: Props) {
  const [data, setData] = useState<PersonalData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalData, boolean>>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('Target');

  const hasAnyData = Object.values(data).some(v => v.trim().length > 0);

  const updateField = (key: keyof PersonalData, raw: string) => {
    const field = FIELDS.find(f => f.key === key)!;
    const value = field.format ? field.format(raw) : raw;
    setData(prev => ({ ...prev, [key]: value }));

    if (touched[key]) {
      const err = field.validate(value);
      setErrors(prev => ({ ...prev, [key]: err ?? undefined }));
    }
  };

  const blurField = (key: keyof PersonalData) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    const field = FIELDS.find(f => f.key === key)!;
    const err = field.validate(data[key]);
    setErrors(prev => ({ ...prev, [key]: err ?? undefined }));
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleGenerate = useCallback(async () => {
    if (!hasAnyData || hasErrors) return;

    // Validar todos los campos tocados antes de enviar
    const newErrors: Partial<Record<keyof PersonalData, string>> = {};
    let valid = true;
    for (const field of FIELDS) {
      const err = field.validate(data[field.key]);
      if (err) {
        newErrors[field.key] = err;
        valid = false;
      }
    }
    if (!valid) {
      setErrors(newErrors);
      setTouched(Object.fromEntries(FIELDS.map(f => [f.key, true])));
      return;
    }

    setIsGenerating(true);
    setGenStep(0);
    setProgress(0);

    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      setGenStep(i);
      const target = ((i + 1) / GENERATION_STEPS.length) * 100;
      const current = (i / GENERATION_STEPS.length) * 100;
      for (let s = 0; s <= 10; s++) {
        await new Promise(r => setTimeout(r, 70));
        setProgress(current + ((target - current) * s) / 10);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    setIsGenerating(false);
    // Resetear formulario para que no queden datos en memoria
    setData(EMPTY);
    setErrors({});
    setTouched({});
    onGenerated(data);
  }, [data, hasAnyData, hasErrors, onGenerated]);

  const sectionFields = FIELDS.filter(f => f.section === activeSection);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto cyber-panel border-primary/30 z-10 glow-border"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gradient-primary font-mono mb-1">
                Diccionario personalizado
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Basado en <span className="text-primary font-semibold">CUPP</span> — Common User Passwords Profiler.
                Simula cómo un atacante que te conoce generaría contraseñas para intentar acceder a tu cuenta.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Todos los campos son opcionales. Los datos se procesan en memoria y se descartan al terminar.
              </p>
            </div>

            {/* Generation animation */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 space-y-3"
                >
                  {GENERATION_STEPS.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: i <= genStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 font-mono text-sm ${
                        i < genStep ? 'text-success' : i === genStep ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {i < genStep ? (
                        <CheckCircle className="h-4 w-4 shrink-0" />
                      ) : i === genStep ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Zap className="h-4 w-4 shrink-0" />
                        </motion.div>
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                      )}
                      {step}
                    </motion.div>
                  ))}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                    <motion.div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            {!isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                {/* Section tabs */}
                <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
                  {SECTIONS.map(section => (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                        activeSection === section
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'text-muted-foreground hover:text-foreground border border-transparent'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>

                {/* Fields for active section */}
                <div className="space-y-4">
                  {sectionFields.map(field => {
                    const error = touched[field.key] ? errors[field.key] : undefined;
                    return (
                      <div key={field.key}>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span className="text-primary">{field.icon}</span>
                          <span>{field.label}</span>
                          <span className="text-muted-foreground/40 text-xs ml-auto font-mono">{field.cuppQuestion}</span>
                        </label>
                        <input
                          type="text"
                          value={data[field.key]}
                          onChange={e => updateField(field.key, e.target.value)}
                          onBlur={() => blurField(field.key)}
                          placeholder={field.placeholder}
                          className={`w-full rounded-md border px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none transition-all duration-200 bg-input ${
                            error
                              ? 'border-destructive/60 focus:border-destructive'
                              : 'border-border focus:border-primary/60'
                          }`}
                        />
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-1.5 mt-1 text-xs text-destructive"
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {error}
                          </motion.p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Section nav */}
                <div className="flex justify-between mt-5 mb-2">
                  <button
                    onClick={() => {
                      const idx = SECTIONS.indexOf(activeSection);
                      if (idx > 0) setActiveSection(SECTIONS[idx - 1]);
                    }}
                    disabled={activeSection === SECTIONS[0]}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors font-mono"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {SECTIONS.indexOf(activeSection) + 1} / {SECTIONS.length}
                  </span>
                  <button
                    onClick={() => {
                      const idx = SECTIONS.indexOf(activeSection);
                      if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1]);
                    }}
                    disabled={activeSection === SECTIONS[SECTIONS.length - 1]}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors font-mono"
                  >
                    Siguiente →
                  </button>
                </div>

                {/* Submit */}
                <button
                  onClick={handleGenerate}
                  disabled={!hasAnyData || hasErrors}
                  className="w-full bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed mt-3"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5" />
                    Generar diccionario y analizar
                  </span>
                </button>

                {hasErrors && (
                  <p className="text-xs text-destructive text-center mt-2">
                    Corregí los errores antes de continuar
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
