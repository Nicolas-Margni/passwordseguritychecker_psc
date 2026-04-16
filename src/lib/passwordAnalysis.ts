// Common password dictionaries
const UNIVERSAL_DICTIONARY = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password1',
  'admin', 'letmein', 'welcome', 'monkey', 'master', 'dragon',
  'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'access', 'hello', 'charlie', 'donald',
  '1234567', '12345678', '1234567890', '111111', '000000', '654321',
  'password123', 'admin123', 'root', 'toor', 'pass', 'test',
  'guest', 'master', 'changeme', 'qwerty123', 'passwd', '123123',
  'baseball', 'soccer', 'hockey', 'michael', 'robert', 'daniel',
  'andrew', 'joshua', 'jessica', 'jennifer', 'amanda', 'nicole',
  'samsung', 'computer', 'internet', 'security', 'superman', 'pokemon',
  'starwars', 'whatever', 'freedom', 'thunder', 'ginger', 'hammer',
  'silver', 'anthony', 'jordan', 'justin', 'killer', 'pepper',
  'zxcvbn', 'asdfgh', 'qazwsx', '121212', '696969', 'mustang',
  'love', 'secret', 'summer', 'flower', 'buster', 'matrix',
  'hola', 'contraseña', 'clave', 'usuario', 'nicolas', 'alejandro',
  'miguel', 'carlos', 'pedro', 'maria', 'juan', 'jose',
];

const PERSONAL_DICTIONARY = [
  'nicolas', 'nico', 'nico123', 'Nico123', 'nicolas123',
  'alejandro', 'alex', 'alex123', 'carlos', 'carlos123',
  'maria', 'maria123', 'juan', 'juan123', 'pedro', 'pedro123',
  'miguel', 'miguel123', 'user', 'user123', 'admin', 'admin123',
  'nombre123', 'nombre2024', 'empresa2024', 'test123', 'prueba',
  'prueba123', 'clave123', 'password2024', 'qwerty2024',
];

export type DictionaryType = 'universal' | 'personal' | 'all';
export type SecurityLevel = 'low' | 'medium' | 'high';

export interface AnalysisResult {
  securityLevel: SecurityLevel;
  foundInDictionary: boolean;
  dictionaryName: string;
  crackTime: {
    dictionary: string;
    bruteForce: string;
  };
  length: number;
  charTypes: string[];
  patterns: string[];
  entropy: number;
  similarPasswords: string[];
  recommendations: string[];
  improvedPasswords: string[];
  attackSimulation: boolean;
}

function getCharTypes(password: string): string[] {
  const types: string[] = [];
  if (/[a-z]/.test(password)) types.push('Letras minúsculas');
  if (/[A-Z]/.test(password)) types.push('Letras mayúsculas');
  if (/[0-9]/.test(password)) types.push('Números');
  if (/[^a-zA-Z0-9]/.test(password)) types.push('Símbolos especiales');
  return types;
}

function getCharsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 33;
  return size || 1;
}

function calculateEntropy(password: string): number {
  const charsetSize = getCharsetSize(password);
  return Math.round(password.length * Math.log2(charsetSize) * 100) / 100;
}

function detectPatterns(password: string): string[] {
  const patterns: string[] = [];
  if (/^[a-zA-Z]+\d+$/.test(password)) patterns.push('Nombre + números (patrón muy común)');
  if (/^[a-zA-Z]+[!@#$%^&*]+$/.test(password)) patterns.push('Palabra + símbolos al final');
  if (/(.)\1{2,}/.test(password)) patterns.push('Caracteres repetidos consecutivos');
  if (/123|234|345|456|567|678|789|890/.test(password)) patterns.push('Secuencia numérica detectada');
  if (/abc|bcd|cde|def|efg|qwe|wer|ert|asd|sdf/.test(password.toLowerCase())) patterns.push('Secuencia de teclado detectada');
  if (/^\d+$/.test(password)) patterns.push('Solo números (muy vulnerable)');
  if (/^[a-z]+$/i.test(password)) patterns.push('Solo letras sin variación');
  if (password.length <= 6) patterns.push('Longitud insuficiente (menos de 6 caracteres)');
  if (/^[A-Z][a-z]+\d+$/.test(password)) patterns.push('Capitalización predecible (solo primera letra)');
  if (/2024|2023|2025|2026/.test(password)) patterns.push('Año reciente detectado');
  if (patterns.length === 0) patterns.push('No se detectaron patrones comunes');
  return patterns;
}

function generateSimilarPasswords(password: string): string[] {
  const variations: string[] = [];
  variations.push(password.toLowerCase());
  variations.push(password.charAt(0).toUpperCase() + password.slice(1).toLowerCase());
  if (/\d/.test(password)) {
    variations.push(password.replace(/\d+/g, ''));
    variations.push(password.replace(/\d+$/, String(Math.floor(Math.random() * 999))));
  }
  variations.push(password + '!');
  variations.push(password.split('').reverse().join(''));
  return [...new Set(variations)].filter(v => v !== password && v.length > 0).slice(0, 5);
}

function getRecommendations(password: string, entropy: number): string[] {
  const recs: string[] = [];
  if (password.length < 12) recs.push('Aumenta la longitud a al menos 12 caracteres');
  if (!/[^a-zA-Z0-9]/.test(password)) recs.push('Agrega símbolos especiales (!@#$%&*)');
  if (!/[A-Z]/.test(password)) recs.push('Incluye letras mayúsculas');
  if (!/[0-9]/.test(password)) recs.push('Incluye números');
  if (/(.)\1{2,}/.test(password)) recs.push('Evita caracteres repetidos');
  if (/123|abc|qwe/i.test(password)) recs.push('Evita secuencias predecibles');
  recs.push('Considera usar una frase de contraseña (passphrase)');
  if (entropy < 40) recs.push('Tu entropía es baja, combina más tipos de caracteres');
  return recs;
}

function generateImprovedPasswords(password: string): string[] {
  const symbols = '!@#$%&*';
  const improved: string[] = [];
  
  let base = password;
  if (base.length < 8) base = base + 'X' + base;
  
  const v1 = base.charAt(0).toUpperCase() + base.slice(1) + symbols[Math.floor(Math.random() * symbols.length)] + Math.floor(Math.random() * 99);
  improved.push(v1);
  
  const v2 = base.split('').map((c, i) => i % 3 === 0 ? c.toUpperCase() : c).join('') + symbols[Math.floor(Math.random() * symbols.length)] + '!' + Math.floor(Math.random() * 999);
  improved.push(v2);
  
  return improved;
}

function formatBruteForceTime(entropy: number): string {
  // Assume 10 billion guesses/sec
  const seconds = Math.pow(2, entropy) / 10_000_000_000;
  if (seconds < 0.001) return 'Instantáneo';
  if (seconds < 1) return 'Menos de 1 segundo';
  if (seconds < 60) return `${Math.round(seconds)} segundos`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutos`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} horas`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} días`;
  const years = seconds / 31536000;
  if (years > 1e12) return 'Trillones de años';
  if (years > 1e9) return 'Miles de millones de años';
  if (years > 1e6) return 'Millones de años';
  if (years > 1000) return `${Math.round(years).toLocaleString()} años`;
  return `${Math.round(years)} años`;
}

export function analyzePassword(password: string, dictionaries: DictionaryType[], customDictionary?: string[]): AnalysisResult {
  const lower = password.toLowerCase();
  
  let foundInDictionary = false;
  let dictionaryName = '';
  
  const checkUniversal = dictionaries.includes('universal') || dictionaries.includes('all');
  const checkPersonal = dictionaries.includes('personal') || dictionaries.includes('all');
  
  if (checkUniversal && UNIVERSAL_DICTIONARY.some(w => w.toLowerCase() === lower)) {
    foundInDictionary = true;
    dictionaryName = 'diccionario universal';
  }
  if (!foundInDictionary && checkPersonal) {
    const personalList = customDictionary && customDictionary.length > 0 ? customDictionary : PERSONAL_DICTIONARY;
    if (personalList.some(w => w.toLowerCase() === lower)) {
      foundInDictionary = true;
      dictionaryName = 'diccionario personalizado';
    }
  }
  
  const entropy = calculateEntropy(password);
  const charTypes = getCharTypes(password);
  
  let securityLevel: SecurityLevel = 'high';
  if (foundInDictionary || entropy < 28 || password.length < 6) {
    securityLevel = 'low';
  } else if (entropy < 50 || password.length < 10 || charTypes.length < 3) {
    securityLevel = 'medium';
  }
  
  return {
    securityLevel,
    foundInDictionary,
    dictionaryName,
    crackTime: {
      dictionary: foundInDictionary ? 'Instantáneo' : 'No efectivo',
      bruteForce: formatBruteForceTime(entropy),
    },
    length: password.length,
    charTypes,
    patterns: detectPatterns(password),
    entropy,
    similarPasswords: generateSimilarPasswords(password),
    recommendations: getRecommendations(password, entropy),
    improvedPasswords: generateImprovedPasswords(password),
    attackSimulation: foundInDictionary,
  };
}
