import re
from models import PersonalData


SYMBOLS = ["!", "@", "#", "$", "*", ".", "_"]
BASE_YEARS = ["2023", "2024", "2025", "2026"]
BASE_NUMBERS = ["1", "12", "123", "1234", "321", "01", "007", "69", "77", "99"]


def _tokenize(text: str) -> list[str]:
    """Divide un string por espacios, comas, punto y coma, barras."""
    return [t.strip() for t in re.split(r"[\s,;/]+", text) if t.strip()]


def generate_custom_dictionary(data: PersonalData) -> list[str]:
    words: set[str] = set()

    # Recolectar todos los tokens
    fields = [
        data.nombre, data.fechaNacimiento, data.mascota,
        data.familiar, data.hobby, data.frase, data.numeros,
    ]
    tokens: list[str] = []
    for field in fields:
        tokens.extend(_tokenize(field))

    if not tokens:
        return []

    # Números personalizados extraídos
    extra_numbers: list[str] = []
    if data.numeros.strip():
        extra_numbers.extend(_tokenize(data.numeros))
    if data.fechaNacimiento.strip():
        parts = re.findall(r"\d+", data.fechaNacimiento)
        extra_numbers.extend(parts)

    all_numbers = list(dict.fromkeys(BASE_NUMBERS + extra_numbers))  # deduplica, mantiene orden

    for token in tokens:
        lower = token.lower()
        cap = lower[0].upper() + lower[1:] if lower else lower
        upper = token.upper()

        # Bases
        words.update([lower, cap, upper])

        # Con números
        for n in all_numbers:
            words.update([lower + n, cap + n, n + lower, upper + n])

        # Con años
        for y in BASE_YEARS:
            words.update([lower + y, cap + y, upper + y])

        # Con símbolos
        for s in SYMBOLS:
            words.update([lower + s, cap + s, s + lower, upper + s])

        # Combos número + símbolo
        for n in all_numbers[:5]:
            for s in SYMBOLS[:3]:
                words.update([cap + n + s, lower + s + n, cap + s + n])

    # Combinaciones cruzadas entre los primeros 3 tokens
    main_tokens = tokens[:3]
    for i, a in enumerate(main_tokens):
        for j, b in enumerate(main_tokens):
            if i == j:
                continue
            al, bl = a.lower(), b.lower()
            ac = al[0].upper() + al[1:] if al else al
            words.update([
                al + bl,
                ac + bl,
                al + bl + "123",
                al + "_" + bl,
                al + bl + "!",
                ac + bl + "2024",
                al + "." + bl,
            ])

    return list(words)
