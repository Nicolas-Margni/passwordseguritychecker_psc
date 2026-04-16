from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class DictionaryType(str, Enum):
    # Diccionarios estáticos
    universal    = "universal"
    rockyou      = "rockyou"
    seclists     = "seclists"
    crackstation = "crackstation"
    weakpass     = "weakpass"
    probable     = "probable"
    hibp         = "hibp"
    # Diccionario personalizado CUPP
    personal     = "personal"
    # Todos
    all          = "all"


class SecurityLevel(str, Enum):
    low    = "low"
    medium = "medium"
    high   = "high"


class PersonalData(BaseModel):
    """Campos exactos de CUPP — todos opcionales."""
    nombre:            str = ""
    apellido:          str = ""
    apodo:             str = ""
    fechaNacimiento:   str = ""   # DD/MM/YYYY
    parejaFecha:       str = ""   # DD/MM/YYYY
    hijoNombre:        str = ""
    hijoApodo:         str = ""
    hijoFecha:         str = ""   # DD/MM/YYYY
    mascota:           str = ""
    empresa:           str = ""
    palabrasClave:     str = ""
    numerosEspeciales: str = ""


class AnalyzeRequest(BaseModel):
    password: str
    dictionaries: list[DictionaryType] = [DictionaryType.universal]
    customDictionary: Optional[list[str]] = None

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("La contraseña no puede estar vacía")
        if len(v) > 128:
            raise ValueError("Contraseña demasiado larga (máx 128 caracteres)")
        return v


class AnalyzeWithCustomRequest(BaseModel):
    password: str
    personalData: PersonalData

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("La contraseña no puede estar vacía")
        if len(v) > 128:
            raise ValueError("Contraseña demasiado larga (máx 128 caracteres)")
        return v


class CrackTime(BaseModel):
    dictionary: str
    bruteForce: str


class AnalysisResult(BaseModel):
    securityLevel:      SecurityLevel
    foundInDictionary:  bool
    dictionaryName:     str
    crackTime:          CrackTime
    length:             int
    charTypes:          list[str]
    patterns:           list[str]
    entropy:            float
    similarPasswords:   list[str]
    recommendations:    list[str]
    improvedPasswords:  list[str]
    attackSimulation:   bool


class GenerateCustomRequest(BaseModel):
    personalData: PersonalData


class GenerateCustomResponse(BaseModel):
    dictionary: list[str]
    count: int
