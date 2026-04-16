import type { AnalysisResult, DictionaryType } from './passwordAnalysis';
import type { PersonalData } from '@/components/CustomDictionaryGenerator';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new ApiError(res.status, err.detail || 'Error del servidor');
  }

  return res.json();
}

export async function analyzePasswordApi(
  password: string,
  dictionaries: string[],
  customDictionary?: string[],
): Promise<AnalysisResult> {
  return post<AnalysisResult>('/api/analyze', {
    password,
    dictionaries,
    customDictionary: customDictionary ?? null,
  });
}

export async function analyzeWithCustomApi(
  password: string,
  personalData: PersonalData,
): Promise<AnalysisResult> {
  return post<AnalysisResult>('/api/analyze-with-custom', {
    password,
    personalData,
  });
}

export async function generateCustomDictApi(
  personalData: PersonalData,
): Promise<{ dictionary: string[]; count: number }> {
  return post('/api/generate-custom', { personalData });
}
