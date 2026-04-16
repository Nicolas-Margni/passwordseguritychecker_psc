from fastapi import APIRouter, HTTPException
from models import GenerateCustomRequest, GenerateCustomResponse
from custom_dict import generate_custom_dictionary

router = APIRouter(tags=["dictionary"])


@router.post("/generate-custom", response_model=GenerateCustomResponse)
def generate_custom(req: GenerateCustomRequest) -> GenerateCustomResponse:
    """
    Genera y devuelve un diccionario personalizado basado en datos personales.
    Útil si el frontend quiere mostrar cuántas entradas se generaron antes de analizar.
    Los datos personales NO se almacenan.
    """
    try:
        dictionary = generate_custom_dictionary(req.personalData)
        return GenerateCustomResponse(dictionary=dictionary, count=len(dictionary))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
