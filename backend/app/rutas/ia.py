"""Modelo de inteligencia artificial de cada usuario (lo que la IA aprendió de él).

  GET /api/ia/modelo?lengua=LSM  → su modelo (o null si todavía no tiene)
  PUT /api/ia/modelo             → guarda su modelo

El modelo lo calcula el frontend (src/lib/ia): dominio por letra (Bayesian Knowledge Tracing),
posturas de su mano, pesos de su red neuronal convolucional y lo que aprendió el autocorrector.
Aquí se guarda en la colección "modelos_ia" (uno por usuario y lengua) para que lo conserve en
cualquier equipo y para que el administrador vea estadísticas generales de la IA (sin ver datos
de nadie en particular).
La llama el frontend desde src/services/ia.ts (hook useModeloIA).
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from ..db import get_db
from ..dependencias import usuario_actual
from ..modelos import Lengua, ModeloIAEntrada, ModeloIASalida

router = APIRouter(prefix="/api/ia", tags=["inteligencia artificial"])


@router.get("/modelo", response_model=ModeloIASalida)
async def obtener(lengua: Lengua, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    doc = await db.modelos_ia.find_one({"usuario_id": usuario["_id"], "lengua": lengua})
    return ModeloIASalida(modelo=doc["modelo"] if doc else None)


@router.put("/modelo", status_code=status.HTTP_204_NO_CONTENT)
async def guardar(datos: ModeloIAEntrada, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    await db.modelos_ia.update_one(
        {"usuario_id": usuario["_id"], "lengua": datos.lengua},
        {"$set": {"modelo": datos.modelo.model_dump(), "actualizado_en": datetime.now(UTC)}},
        upsert=True,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
