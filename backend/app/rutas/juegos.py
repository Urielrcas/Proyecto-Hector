"""Partidas de los juegos de aprendizaje.

  POST /api/juegos/partidas  → registra una partida terminada

Se guardan en la colección "partidas" para las estadísticas del administrador
(qué juegos se usan, puntajes, letras que más se fallan). La pantalla de juegos del usuario
usa su propio registro en el navegador (niveles, insignias); esto es la copia para el servidor.
La llama el frontend desde src/services/juegos.ts (hook useRegistroJuegos).
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from ..db import get_db
from ..dependencias import usuario_actual
from ..modelos import PartidaEntrada

router = APIRouter(prefix="/api/juegos", tags=["juegos"])


@router.post("/partidas", status_code=status.HTTP_201_CREATED)
async def registrar(datos: PartidaEntrada, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    await db.partidas.insert_one(datos.model_dump() | {"usuario_id": usuario["_id"], "fecha": datetime.now(UTC)})
    return Response(status_code=status.HTTP_201_CREATED)
