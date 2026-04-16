"""
Integración del diccionario RockYou.
Carga el archivo rockyou.txt en memoria al iniciar el servidor
y provee búsqueda O(1) mediante un set.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Set global — se carga una sola vez al arrancar el servidor
_rockyou_set: set[str] = set()
_rockyou_loaded = False
_rockyou_count = 0


def load_rockyou() -> None:
    """
    Carga rockyou.txt en memoria como un set para búsqueda O(1).
    Se llama una sola vez al iniciar FastAPI.
    """
    global _rockyou_set, _rockyou_loaded, _rockyou_count

    if _rockyou_loaded:
        return

    rockyou_path = os.path.join(os.path.dirname(__file__), 'rockyou.txt')

    if not os.path.exists(rockyou_path):
        logger.warning(
            "rockyou.txt no encontrado en %s. "
            "Usando solo diccionario universal básico. "
            "Descargá rockyou.txt y colocalo en la carpeta backend/",
            rockyou_path
        )
        _rockyou_loaded = True
        return

    logger.info("Cargando rockyou.txt en memoria...")

    try:
        with open(rockyou_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                word = line.strip()
                if word:
                    _rockyou_set.add(word.lower())

        _rockyou_count = len(_rockyou_set)
        _rockyou_loaded = True
        logger.info("rockyou.txt cargado: %d contraseñas únicas", _rockyou_count)

    except Exception as e:
        logger.error("Error cargando rockyou.txt: %s", e)
        _rockyou_loaded = True


def is_in_rockyou(password: str) -> bool:
    """Busca una contraseña en el diccionario RockYou. O(1)."""
    if not _rockyou_loaded:
        load_rockyou()
    return password.lower() in _rockyou_set


def get_rockyou_stats() -> dict:
    """Devuelve estadísticas del diccionario cargado."""
    return {
        "loaded": _rockyou_loaded,
        "count": _rockyou_count,
        "available": _rockyou_count > 0,
    }
