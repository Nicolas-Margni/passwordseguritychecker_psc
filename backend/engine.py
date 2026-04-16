import math
import re
import random
from models import SecurityLevel, AnalysisResult, CrackTime
from dict_loader import is_in_dict, get_rockyou_stats, DICT_DISPLAY_NAMES

# Diccionario universal básico — siempre disponible sin archivos externos
UNIVERSAL_FALLBACK: set[str] = {
    "password", "123456", "123456789", "qwerty", "abc123", "password1",
    "admin", "letmein", "welcome", "monkey", "master", "dragon",
    "login", "princess", "football", "shadow", "sunshine", "trustno1",
    "iloveyou", "batman", "access", "hello", "charlie", "donald",
    "1234567", "12345678", "1234567890", "111111", "000000", "654321",
    "password123", "admin123", "root", "toor", "pass", "test",
    "guest", "changeme", "qwerty123", "passwd", "123123",
    "baseball", "soccer", "hockey", "michael", "robert", "daniel",
    "samsung", "computer", "internet", "security", "superman", "pokemon",
    "starwars", "whatever", "freedom", "thunder", "zxcvbn", "asdfgh",
    "121212", "696969", "mustang", "love", "secret", "summer",
    "hola", "contraseña", "clave", "usuario", "nicolas", "alejandro",
    "miguel", "carlos", "pedro", "maria", "juan", "jose",
    "1q2w3e", "1q2w3e4r", "qwertyuiop", "passw0rd", "p@ssword",
    "password2024", "password2023", "admin2024", "root123",
}

KEYBOARD_SEQUENCES = [
    "qwerty", "qwertyuiop", "asdfgh", "asdfghjkl", "zxcvbn",
    "qazwsx", "wsxedc", "edcrfv", "rfvtgb", "1qaz", "2wsx",
]

# IDs de diccionarios que usan archivos externos (dict_loader)
EXTERNAL_DICT_IDS = {"rockyou", "seclists", "crackstation", "weakpass", "probable", "hibp"}


# ---------------------------------------------------------------------------
# Análisis de caracteres
# ---------------------------------------------------------------------------

def get_char_types(password: str) -> list[str]:
    types = []
    if re.search(r"[a-z]", password): types.append("Letras minúsculas")
    if re.search(r"[A-Z]", password): types.append("Letras mayúsculas")
    if re.search(r"[0-9]", password): types.append("Números")
    if re.search(r"[^a-zA-Z0-9]", password): types.append("Símbolos especiales")
    return types


def get_charset_size(password: str) -> int:
    size = 0
    if re.search(r"[a-z]", password): size += 26
    if re.search(r"[A-Z]", password): size += 26
    if re.search(r"[0-9]", password): size += 10
    if re.search(r"[^a-zA-Z0-9]", password): size += 33
    return size or 1


def calculate_entropy(password: str) -> float:
    return round(len(password) * math.log2(get_charset_size(password)), 2)


# ---------------------------------------------------------------------------
# Detección de patrones
# ---------------------------------------------------------------------------

def detect_patterns(password: str) -> list[str]:
    patterns = []
    lower = password.lower()

    if re.match(r"^[a-zA-Z]+\d+$", password):
        patterns.append("Nombre + números (patrón muy común)")
    if re.match(r"^[a-zA-Z]+[!@#$%^&*]+$", password):
        patterns.append("Palabra + símbolos al final")
    if re.search(r"(.)\1{2,}", password):
        patterns.append("Caracteres repetidos consecutivos")
    if re.search(r"123|234|345|456|567|678|789|890", password):
        patterns.append("Secuencia numérica detectada")
    if re.search(r"987|876|765|654|543|432|321", password):
        patterns.append("Secuencia numérica inversa detectada")
    for seq in KEYBOARD_SEQUENCES:
        if seq in lower:
            patterns.append("Secuencia de teclado detectada")
            break
    if re.match(r"^\d+$", password):
        patterns.append("Solo números (muy vulnerable)")
    if re.match(r"^[a-zA-Z]+$", password):
        patterns.append("Solo letras sin variación")
    if len(password) <= 6:
        patterns.append("Longitud insuficiente (menos de 6 caracteres)")
    if re.match(r"^[A-Z][a-z]+\d+$", password):
        patterns.append("Capitalización predecible (solo primera letra)")
    if re.search(r"202[3-9]|2030", password):
        patterns.append("Año reciente detectado")
    if re.search(r"19[5-9]\d|200[0-9]|201[0-9]", password):
        patterns.append("Año de nacimiento probable detectado")
    if not patterns:
        patterns.append("No se detectaron patrones comunes")
    return patterns


# ---------------------------------------------------------------------------
# Estimación de tiempo de cracking
# ---------------------------------------------------------------------------

def format_brute_force_time(entropy: float) -> str:
    try:
        seconds = (2 ** entropy) / 10_000_000_000
    except OverflowError:
        return "Trillones de años"
    if seconds < 0.001: return "Instantáneo"
    if seconds < 1: return "Menos de 1 segundo"
    if seconds < 60: return f"{round(seconds)} segundos"
    if seconds < 3600: return f"{round(seconds / 60)} minutos"
    if seconds < 86400: return f"{round(seconds / 3600)} horas"
    if seconds < 31_536_000: return f"{round(seconds / 86400)} días"
    years = seconds / 31_536_000
    if years > 1e12: return "Trillones de años"
    if years > 1e9: return "Miles de millones de años"
    if years > 1e6: return "Millones de años"
    if years > 1000: return f"{round(years):,} años"
    return f"{round(years)} años"


# ---------------------------------------------------------------------------
# Sugerencias
# ---------------------------------------------------------------------------

def generate_similar_passwords(password: str) -> list[str]:
    variations = set()
    variations.add(password.lower())
    variations.add(password.upper())
    if len(password) > 1:
        variations.add(password[0].upper() + password[1:].lower())
    no_digits = re.sub(r"\d+", "", password)
    if no_digits and no_digits != password:
        variations.add(no_digits)
    variations.add(password + "!")
    variations.add(password + "123")
    variations.add(password[::-1])
    leet = password.lower().replace("a","@").replace("e","3").replace("i","1").replace("o","0").replace("s","$")
    variations.add(leet)
    return [v for v in variations if v != password and len(v) > 0][:5]


def generate_improved_passwords(password: str) -> list[str]:
    symbols = "!@#$%&*"
    base = password if len(password) >= 6 else password * 2
    improved = []
    s1 = symbols[random.randint(0, len(symbols)-1)]
    improved.append(base[0].upper() + base[1:] + s1 + str(random.randint(10, 99)))
    mixed = "".join(c.upper() if i % 2 == 0 else c.lower() for i, c in enumerate(base))
    improved.append(mixed + symbols[random.randint(0, len(symbols)-1)] + "!" + str(random.randint(100, 999)))
    extra = random.choice(["Sol", "Mar", "Rio", "Luz", "Oak", "Sky"])
    improved.append(base + extra + symbols[random.randint(0, len(symbols)-1)] + str(random.randint(1, 99)))
    return improved


def get_recommendations(password: str, entropy: float) -> list[str]:
    recs = []
    if len(password) < 12: recs.append("Aumenta la longitud a al menos 12 caracteres")
    if not re.search(r"[^a-zA-Z0-9]", password): recs.append("Agrega símbolos especiales (!@#$%&*)")
    if not re.search(r"[A-Z]", password): recs.append("Incluye al menos una letra mayúscula")
    if not re.search(r"[0-9]", password): recs.append("Incluye al menos un número")
    if re.search(r"(.)\1{2,}", password): recs.append("Evita caracteres repetidos consecutivos")
    if re.search(r"123|abc|qwe", password, re.IGNORECASE): recs.append("Evita secuencias predecibles")
    if entropy < 50: recs.append("Tu entropía es baja — combiná más tipos de caracteres")
    recs.append("Considera usar un gestor de contraseñas")
    recs.append("Nunca reutilices esta contraseña en otros sitios")
    return recs


# ---------------------------------------------------------------------------
# Nivel de seguridad estricto
#
# BAJA  → encontrada en diccionario, O solo letras sin variación,
#          O solo números, O longitud < 8, O sin ningún tipo de complejidad
# MEDIA → tiene letras + números (o letras + mayúsculas) pero sin símbolos,
#          O longitud < 12, O entropía < 55
# ALTA  → tiene letras minúsculas + mayúsculas + números + símbolos,
#          longitud >= 12, entropía >= 55
# ---------------------------------------------------------------------------

def calculate_security_level(
    password: str,
    found_in_dictionary: bool,
    entropy: float,
    char_types: list[str],
) -> SecurityLevel:
    has_lower   = "Letras minúsculas"  in char_types
    has_upper   = "Letras mayúsculas"  in char_types
    has_digits  = "Números"            in char_types
    has_symbols = "Símbolos especiales" in char_types
    length      = len(password)

    # BAJA — sin discusión
    if found_in_dictionary:
        return SecurityLevel.low
    if length < 8:
        return SecurityLevel.low
    if not has_lower and not has_upper:
        return SecurityLevel.low   # solo números o solo símbolos
    if (has_lower or has_upper) and not has_digits and not has_symbols:
        return SecurityLevel.low   # solo letras, sin nada más
    if not has_lower and not has_upper and has_digits:
        return SecurityLevel.low   # solo números

    # ALTA — requiere TODO
    if has_lower and has_upper and has_digits and has_symbols and length >= 12 and entropy >= 55:
        return SecurityLevel.high

    # MEDIA — todo lo demás
    return SecurityLevel.medium


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------

def analyze_password(
    password: str,
    dictionaries: list[str],
    custom_dictionary: list[str] | None = None,
) -> AnalysisResult:
    lower = password.lower()
    found_in_dictionary = False
    dictionary_name = ""

    static_dicts  = [d for d in dictionaries if d not in ("personal", "all")]
    check_personal = "personal" in dictionaries or "all" in dictionaries

    # Buscar en cada diccionario estático seleccionado individualmente
    for dict_id in static_dicts:
        if dict_id == "universal":
            if lower in UNIVERSAL_FALLBACK:
                found_in_dictionary = True
                dictionary_name = DICT_DISPLAY_NAMES.get("universal", "Diccionario universal")
                break
        elif dict_id in EXTERNAL_DICT_IDS:
            if is_in_dict(lower, dict_id):
                found_in_dictionary = True
                dictionary_name = DICT_DISPLAY_NAMES.get(dict_id, dict_id)
                break

    # Buscar en diccionario personalizado CUPP
    if not found_in_dictionary and check_personal and custom_dictionary:
        if any(w.lower() == lower for w in custom_dictionary):
            found_in_dictionary = True
            dictionary_name = "diccionario personalizado (CUPP)"

    entropy    = calculate_entropy(password)
    char_types = get_char_types(password)
    sec_level  = calculate_security_level(password, found_in_dictionary, entropy, char_types)

    return AnalysisResult(
        securityLevel=sec_level,
        foundInDictionary=found_in_dictionary,
        dictionaryName=dictionary_name,
        crackTime=CrackTime(
            dictionary="Instantáneo" if found_in_dictionary else "No efectivo",
            bruteForce=format_brute_force_time(entropy),
        ),
        length=len(password),
        charTypes=char_types,
        patterns=detect_patterns(password),
        entropy=entropy,
        similarPasswords=generate_similar_passwords(password),
        recommendations=get_recommendations(password, entropy),
        improvedPasswords=generate_improved_passwords(password),
        attackSimulation=found_in_dictionary,
    )
