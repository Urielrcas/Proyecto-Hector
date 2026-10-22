"""Corrector de frases deletreadas con Ollama.

  POST /api/frase/corregir  {"texto": "HOLACOMO ESTAS", "lengua": "LSM"}  →  {"frase": "Hola, ¿cómo estás?", ...}

Es pública (no pide sesión) para que también la usen los invitados del traductor: no lee ni guarda
nada en la base de datos. Si Ollama está apagado responde 503 con un mensaje para el usuario.
La lógica (instrucciones, ejemplos y la revisión que evita que el modelo invente) está en app/corrector.py.
La llama el frontend desde src/services/frase.ts (pantalla «Señas → Texto y voz»).
"""

# ▸ Desde FastAPI (framework para crear la API):
#     APIRouter → grupo de rutas de la API
#     HTTPException → error que se devuelve al navegador con un código (422, 503...)
#     status → códigos HTTP con nombre (HTTP_503_SERVICE_UNAVAILABLE...)
from fastapi import APIRouter, HTTPException, status

# ▸ Desde nuestro proyecto (carpeta app/config):
#     config → la configuración ya cargada (app/config.py)
from ..config import config
# ▸ Desde nuestro proyecto (carpeta app/corrector):
#     corregir → pide la corrección a Ollama y la revisa (app/corrector.py)
#     OllamaNoDisponible → error: Ollama apagado, sin el modelo o muy lento (app/corrector.py)
from ..corrector import OllamaNoDisponible, corregir
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     FraseEntrada → texto deletreado y lengua (app/modelos.py)
#     FraseSalida → frase corregida (app/modelos.py)
from ..modelos import FraseEntrada, FraseSalida

router = APIRouter(prefix="/api/frase", tags=["frase"])


# POST /api/frase/corregir
@router.post("/corregir", response_model=FraseSalida)
async def corregir_frase(datos: FraseEntrada):
    texto = " ".join(datos.texto.split())  # sin espacios repetidos ni a los lados
    if not texto:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No hay texto para corregir.")
    try:
        frase, corregida = await corregir(texto, datos.lengua)
    except OllamaNoDisponible as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from e
    return FraseSalida(frase=frase, corregida=corregida, modelo=config.ollama_modelo)
