"""
Carga cada diccionario en memoria como un set para búsqueda O(1).
Cada diccionario se carga de su propio archivo .txt.
Se llaman al iniciar el servidor — una sola vez.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Mapa: ID del frontend → archivo local
DICT_FILES = {
    "rockyou":      "rockyou.txt",
    "seclists":     "seclists.txt",
    "crackstation": "crackstation.txt",
    "weakpass":     "weakpass.txt",
    "probable":     "probable.txt",
    "hibp":         "hibp.txt",
}

DICT_DISPLAY_NAMES = {
    "universal":    "Diccionario universal",
    "rockyou":      "RockYou",
    "seclists":     "SecLists",
    "crackstation": "CrackStation",
    "weakpass":     "Weakpass",
    "probable":     "Probable Wordlists",
    "hibp":         "Have I Been Pwned",
}

# Sets en memoria — se llenan al arrancar
_dicts: dict[str, set[str]] = {}
_loaded: set[str] = set()


def _load_one(dict_id: str) -> None:
    filename = DICT_FILES.get(dict_id)
    if not filename:
        return

    path = os.path.join(os.path.dirname(__file__), filename)

    if not os.path.exists(path):
        logger.warning(
            "Diccionario '%s' no encontrado en %s. "
            "Ejecutá download_dicts.py para descargarlo.",
            dict_id, path
        )
        _dicts[dict_id] = set()
        _loaded.add(dict_id)
        return

    logger.info("Cargando %s...", filename)
    words: set[str] = set()

    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                w = line.strip()
                if w:
                    words.add(w.lower())

        _dicts[dict_id] = words
        _loaded.add(dict_id)
        logger.info("✓ %s: %d contraseñas únicas", filename, len(words))

    except Exception as e:
        logger.error("Error cargando %s: %s", filename, e)
        _dicts[dict_id] = set()
        _loaded.add(dict_id)


def load_all_dicts() -> None:
    """Carga todos los diccionarios al arrancar el servidor."""
    for dict_id in DICT_FILES:
        if dict_id not in _loaded:
            _load_one(dict_id)


def is_in_dict(password_lower: str, dict_id: str) -> bool:
    """Busca una contraseña en el diccionario indicado. O(1)."""
    if dict_id not in _loaded:
        _load_one(dict_id)
    return password_lower in _dicts.get(dict_id, set())


def get_dict_stats() -> dict:
    """Devuelve estadísticas de todos los diccionarios."""
    return {
        dict_id: {
            "loaded": dict_id in _loaded,
            "count": len(_dicts.get(dict_id, set())),
            "available": len(_dicts.get(dict_id, set())) > 0,
        }
        for dict_id in DICT_FILES
    }


# Mantener compatibilidad con rockyou_loader.py existente
def is_in_rockyou(password_lower: str) -> bool:
    return is_in_dict(password_lower, "rockyou")

def get_rockyou_stats() -> dict:
    stats = get_dict_stats()
    rockyou = stats.get("rockyou", {})
    return {
        "loaded": rockyou.get("loaded", False),
        "count": rockyou.get("count", 0),
        "available": rockyou.get("available", False),
    }
