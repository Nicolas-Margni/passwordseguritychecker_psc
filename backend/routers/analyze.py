from fastapi import APIRouter, HTTPException
from models import AnalyzeRequest, AnalyzeWithCustomRequest, AnalysisResult, GenerateCustomRequest, GenerateCustomResponse
from engine import analyze_password
from cupp_integration import generate_cupp_dictionary
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=AnalysisResult)
def analyze(req: AnalyzeRequest) -> AnalysisResult:
    """
    Analiza una contraseña contra los diccionarios seleccionados.
    Se respeta exactamente qué diccionarios eligió el usuario.
    La contraseña NO se almacena ni se registra.
    """
    try:
        # Pasar los IDs exactos que eligió el usuario (universal, rockyou, seclists, etc.)
        dict_ids = [d.value for d in req.dictionaries]
        logger.info("Analizando con diccionarios: %s", dict_ids)
        return analyze_password(
            password=req.password,
            dictionaries=dict_ids,
            custom_dictionary=req.customDictionary,
        )
    except Exception as e:
        logger.error("Error en /analyze: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-with-custom", response_model=AnalysisResult)
def analyze_with_custom(req: AnalyzeWithCustomRequest) -> AnalysisResult:
    """
    Genera un diccionario personalizado con CUPP y analiza la contraseña.
    Los datos personales y la contraseña NO se almacenan.
    """
    try:
        cupp_dict = generate_cupp_dictionary(req.personalData)
        logger.info("CUPP generó %d palabras", len(cupp_dict))
        return analyze_password(
            password=req.password,
            dictionaries=["personal"],
            custom_dictionary=cupp_dict,
        )
    except Exception as e:
        logger.error("Error en /analyze-with-custom: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-custom", response_model=GenerateCustomResponse)
def generate_custom(req: GenerateCustomRequest) -> GenerateCustomResponse:
    """
    Genera y devuelve el diccionario personalizado CUPP sin analizar.
    Los datos personales NO se almacenan.
    """
    try:
        dictionary = generate_cupp_dictionary(req.personalData)
        logger.info("CUPP generó %d palabras para diccionario", len(dictionary))

        if len(dictionary) == 0:
            raise HTTPException(
                status_code=400,
                detail="No se pudieron generar palabras. Completá al menos un campo del formulario."
            )

        return GenerateCustomResponse(dictionary=dictionary, count=len(dictionary))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en /generate-custom: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
