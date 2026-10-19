"""Progreso de aprendizaje: qué letras logró el usuario de la sesión.

  GET  /api/progreso?lengua=LSM  → letras logradas en esa lengua
  POST /api/progreso             → agrega letras logradas (si ya estaban, no pasa nada)

Se guarda en la colección "progreso" de MongoDB, un documento por letra lograda:
    {usuario_id, lengua, letra, logrado_en}
Así el administrador puede ver el avance de todos en «Estadísticas» (rutas/estadisticas.py).
La llama el frontend desde src/services/progreso.ts (hook useProgresoAprendizaje).
"""

# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
from datetime import UTC, datetime
# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Any → tipo: cualquier valor
from typing import Any

# ▸ Desde FastAPI (framework para crear la API):
#     APIRouter → grupo de rutas de la API
#     Depends → pide a FastAPI ejecutar una función antes (seguridad, base de datos)
#     HTTPException → error que se devuelve al navegador con un código (401, 404...)
#     status → códigos HTTP con nombre (HTTP_404_NOT_FOUND...)
from fastapi import APIRouter, Depends, HTTPException, status
# ▸ Desde PyMongo (tipo de la base de datos asíncrona):
#     AsyncDatabase → tipo: la base de datos
from pymongo.asynchronous.database import AsyncDatabase

# ▸ Desde nuestro proyecto (carpeta app/alfabeto):
#     LETRAS → letras que existen en LSM y en ASL (app/alfabeto.py)
from ..alfabeto import LETRAS
# ▸ Desde nuestro proyecto (carpeta app/db):
#     get_db → entrega la base de datos a cada ruta (app/db.py)
from ..db import get_db
# ▸ Desde nuestro proyecto (carpeta app/dependencias):
#     usuario_actual → obtiene el usuario de la sesión (app/dependencias.py)
from ..dependencias import usuario_actual
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     Lengua → tipo: 'LSM' o 'ASL' (app/modelos.py)
#     ProgresoEntrada → lengua y letras logradas (app/modelos.py)
#     ProgresoSalida → letras logradas de una lengua (app/modelos.py)
from ..modelos import Lengua, ProgresoEntrada, ProgresoSalida

router = APIRouter(prefix="/api/progreso", tags=["progreso"])


# Letras logradas por un usuario en una lengua, en el orden del alfabeto.
async def _letras_logradas(db: AsyncDatabase, usuario_id: Any, lengua: str) -> list[str]:
    logradas = set(await db.progreso.distinct("letra", {"usuario_id": usuario_id, "lengua": lengua}))
    return [letra for letra in LETRAS[lengua] if letra in logradas]


# GET /api/progreso?lengua=LSM
@router.get("", response_model=ProgresoSalida)
async def obtener(lengua: Lengua, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    return ProgresoSalida(lengua=lengua, letras=await _letras_logradas(db, usuario["_id"], lengua))


# POST /api/progreso  {"lengua": "LSM", "letras": ["A", "B"]}
@router.post("", response_model=ProgresoSalida)
async def agregar(datos: ProgresoEntrada, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    letras = [letra.upper() for letra in datos.letras]
    if invalidas := [letra for letra in letras if letra not in LETRAS[datos.lengua]]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Letras que no existen en {datos.lengua}: {', '.join(invalidas)}.")

    ahora = datetime.now(UTC)
    for letra in set(letras):
        # "upsert" + "$setOnInsert": si la letra ya estaba lograda, se conserva su fecha original;
        # si no, se crea con la fecha de hoy (así se sabe cuándo la logró).
        await db.progreso.update_one(
            {"usuario_id": usuario["_id"], "lengua": datos.lengua, "letra": letra},
            {"$setOnInsert": {"logrado_en": ahora}},
            upsert=True,
        )
    return ProgresoSalida(lengua=datos.lengua, letras=await _letras_logradas(db, usuario["_id"], datos.lengua))
