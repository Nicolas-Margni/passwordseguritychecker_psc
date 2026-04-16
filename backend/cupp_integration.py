"""
Integración de CUPP (Common User Passwords Profiler)
Replica fielmente la lógica de cupp.py para generar diccionarios
personalizados a partir de datos personales del target.
El diccionario se genera en memoria y nunca se escribe en disco.
"""
import re
from models import PersonalData

# ---------------------------------------------------------------------------
# Leet speak — igual que cupp.cfg
# ---------------------------------------------------------------------------
LEET = {
    'a': ['4', '@'],
    'e': ['3'],
    'i': ['1', '!'],
    'o': ['0'],
    's': ['5', '$'],
    't': ['7'],
    'g': ['9'],
    'b': ['8'],
}

SPECIAL_CHARS = ['!', '@', '#', '$', '%', '&', '*', '?', '.', '_', '-']
COMMON_SUFFIXES = ['1', '12', '123', '1234', '12345', '123456',
                   '69', '007', '777', '666', '101', '11', '00', '01', '99']


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> dict:
    """
    Parsea DD/MM/YYYY y devuelve variaciones útiles como usa CUPP.
    Retorna dict con: day, month, year, year2, ddmm, mmdd, ddmmyyyy, etc.
    """
    result = {}
    if not date_str or not date_str.strip():
        return result

    # Aceptar tanto DD/MM/YYYY como DDMMYYYY
    clean = date_str.replace('/', '').replace('-', '').replace('.', '')
    if len(clean) == 8:
        dd = clean[0:2]
        mm = clean[2:4]
        yyyy = clean[4:8]
        yy = yyyy[2:4]

        result['day'] = dd
        result['month'] = mm
        result['year'] = yyyy
        result['year2'] = yy
        result['ddmm'] = dd + mm
        result['mmdd'] = mm + dd
        result['ddmmyyyy'] = dd + mm + yyyy
        result['ddmmyy'] = dd + mm + yy
        result['yyyymmdd'] = yyyy + mm + dd
        result['yymmdd'] = yy + mm + dd

    return result


def _leet(word: str) -> list[str]:
    """Genera variaciones leet speak de una palabra."""
    results = set()
    w = word.lower()

    # Una sola sustitución
    for i, char in enumerate(w):
        if char in LEET:
            for rep in LEET[char]:
                leet_word = w[:i] + rep + w[i+1:]
                results.add(leet_word)
                results.add(leet_word.capitalize())

    # Sustitución completa
    full = w
    for char, reps in LEET.items():
        full = full.replace(char, reps[0])
    if full != w:
        results.add(full)
        results.add(full.capitalize())

    return list(results)


def _tokenize(text: str) -> list[str]:
    """Divide en tokens, mínimo 2 caracteres, sin números."""
    if not text or not text.strip():
        return []
    return [
        t.strip() for t in re.split(r'[\s,;/\-_]+', text)
        if t.strip() and len(t.strip()) >= 2 and not t.strip().isdigit()
    ]


def _expand_token(token: str, suffixes: list[str], specials: list[str], dates: list[dict]) -> set[str]:
    """
    Para un token dado genera todas las variaciones que hace CUPP:
    - Mayúsculas/minúsculas/capitalized/upper
    - + sufijos numéricos
    - + fechas y partes de fechas
    - + caracteres especiales
    - + leet speak
    - Combinaciones cruzadas
    """
    words: set[str] = set()
    lower = token.lower()
    cap = lower.capitalize()
    upper = token.upper()

    # Bases
    words.update([lower, cap, upper])

    # Con sufijos numéricos comunes
    for s in suffixes:
        words.update([lower + s, cap + s, upper + s, s + lower, s + cap])

    # Con partes de fechas
    for d in dates:
        for v in d.values():
            words.update([lower + v, cap + v, v + lower, v + cap])
            # Combinación con sufijos especiales
            words.update([cap + v + '!', lower + v + '!', cap + v + '@'])

    # Con caracteres especiales
    for sp in specials[:6]:
        words.update([lower + sp, cap + sp, upper + sp, sp + lower, sp + cap])

    # Sufijo + especial
    for s in suffixes[:8]:
        for sp in specials[:4]:
            words.update([cap + s + sp, lower + s + sp])

    # Leet speak
    for leet_word in _leet(lower):
        words.add(leet_word)
        for s in suffixes[:5]:
            words.add(leet_word + s)
        words.add(leet_word + '!')

    return words


def _cross_combine(tokens: list[str], suffixes: list[str]) -> set[str]:
    """Combina tokens entre sí como hace CUPP (nombre+mascota, nombre+empresa, etc.)"""
    words: set[str] = set()
    main = tokens[:5]

    for i, a in enumerate(main):
        for j, b in enumerate(main):
            if i == j:
                continue
            al, bl = a.lower(), b.lower()
            ac, bc = al.capitalize(), bl.capitalize()

            words.update([
                al + bl, ac + bl, al + bc, ac + bc,
                al + '_' + bl, ac + '_' + bc,
                al + '.' + bl, ac + '.' + bc,
            ])

            for s in suffixes[:6]:
                words.update([al + bl + s, ac + bl + s, ac + bc + s])

            words.update([ac + bl + '!', al + bl + '123', ac + bc + '@1'])

    return words


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------

def generate_cupp_dictionary(data: PersonalData) -> list[str]:
    """
    Genera un diccionario personalizado usando la lógica de CUPP.
    El diccionario se genera en RAM y NUNCA se escribe en disco.
    Se devuelve como lista y se descarta cuando termina el request.
    """

    # ── Recolectar tokens de texto ─────────────────────────────────────────
    text_fields = [
        data.nombre, data.apellido, data.apodo,
        data.hijoNombre, data.hijoApodo,
        data.mascota, data.empresa, data.palabrasClave,
    ]
    all_tokens: list[str] = []
    for field in text_fields:
        all_tokens.extend(_tokenize(field))

    # ── Parsear fechas ─────────────────────────────────────────────────────
    date_fields = [data.fechaNacimiento, data.parejaFecha, data.hijoFecha]
    all_dates = [_parse_date(d) for d in date_fields if d and d.strip()]

    # ── Recolectar números especiales ──────────────────────────────────────
    personal_numbers = list(COMMON_SUFFIXES)
    if data.numerosEspeciales.strip():
        for n in re.split(r'[\s,;]+', data.numerosEspeciales):
            n = n.strip()
            if n.isdigit() and n not in personal_numbers:
                personal_numbers.insert(0, n)

    # Agregar partes numéricas de fechas como sufijos también
    for d in all_dates:
        for key in ['year', 'year2', 'ddmm', 'mmdd', 'day', 'month']:
            v = d.get(key, '')
            if v and v not in personal_numbers:
                personal_numbers.insert(0, v)

    if not all_tokens and not all_dates:
        return []

    # ── Generar palabras ───────────────────────────────────────────────────
    words: set[str] = set()

    # Tokens individuales con todas las variaciones
    for token in all_tokens:
        words.update(_expand_token(token, personal_numbers, SPECIAL_CHARS, all_dates))

    # Fechas solas como contraseñas candidatas
    for d in all_dates:
        for v in d.values():
            words.add(v)
            words.update([v + '!', v + '@', v + '#'])

    # Combinaciones cruzadas entre tokens
    if len(all_tokens) >= 2:
        words.update(_cross_combine(all_tokens, personal_numbers))

    # ── Filtrar ────────────────────────────────────────────────────────────
    # CUPP filtra: mínimo 4 chars, máximo 24, no solo números
    filtered = {
        w for w in words
        if 4 <= len(w) <= 24 and not w.isdigit()
    }

    return list(filtered)
