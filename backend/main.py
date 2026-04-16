from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, dictionary
from dict_loader import load_all_dicts, get_dict_stats
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando servidor — cargando diccionarios...")
    load_all_dicts()
    stats = get_dict_stats()
    for dict_id, info in stats.items():
        if info["available"]:
            logger.info("  ✓ %-15s %d contraseñas", dict_id, info["count"])
        else:
            logger.warning("  ✗ %-15s no disponible (ejecutá download_dicts.py)", dict_id)
    yield


app = FastAPI(
    title="Verificador de Contraseñas API",
    description="Backend para análisis de seguridad de contraseñas. Sin almacenamiento de datos.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(dictionary.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "message": "Verificador de contraseñas API v3"}


@app.get("/health")
def health():
    from dict_loader import get_dict_stats
    return {"status": "healthy", "dictionaries": get_dict_stats()}
