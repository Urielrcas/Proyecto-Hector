"""Historial de traducciones y conversaciones del usuario de la sesión.

  GET    /api/historial            → listar (búsqueda por texto, filtro por tipo y paginación)
  GET    /api/historial/{id}       → un registro con todos sus mensajes
  POST   /api/historial            → crear un registro
  PUT    /api/historial/{id}       → reemplazar sus mensajes (la conversación siguió creciendo)
  DELETE /api/historial/{id}       → borrar un registro
  DELETE /api/historial            → borrar todo el historial del usuario

Se guarda en la colección "historial" de MongoDB:
    {usuario_id, tipo, lengua, titulo, mensajes: [{autor, texto, hora}], creado_en, actualizado_en}
Regla «usar un registro»: x ∧ p — debe existir y ser de quien lo pide. Las conversaciones son
privadas: ni un administrador puede ver las de otra persona.
La llama el frontend desde src/services/historial.ts.
"""

import re
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from ..db import get_db
from ..dependencias import usuario_actual
from ..modelos import HistorialEntrada, HistorialResumen, HistorialSalida, PaginaHistorial, TipoHistorial
from ..reglas import PUEDE_USAR_REGISTRO

router = APIRouter(prefix="/api/historial", tags=["historial"])

NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Registro no encontrado.")
LARGO_TITULO = 80


def _titulo(datos: HistorialEntrada) -> str:
    """El primer mensaje, recortado. Ej.: «Hola, ¿cómo estás?»."""
    texto = " ".join(datos.mensajes[0].texto.split())
    return texto if len(texto) <= LARGO_TITULO else texto[: LARGO_TITULO - 1].rstrip() + "…"


def _resumen(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "tipo": doc["tipo"],
        "lengua": doc["lengua"],
        "titulo": doc["titulo"],
        "total_mensajes": len(doc["mensajes"]),
        "creado_en": doc["creado_en"],
        "actualizado_en": doc["actualizado_en"],
    }


async def _registro_propio(db: AsyncDatabase, id_registro: str, usuario: dict[str, Any]) -> dict[str, Any]:
    """Busca el registro y aplica la regla x ∧ p. Si no se cumple responde 404
    (también si es de otra persona, para no revelar que existe)."""
    doc = await db.historial.find_one({"_id": ObjectId(id_registro)}) if ObjectId.is_valid(id_registro) else None
    x = doc is not None  # x: el registro existe
    p = x and doc["usuario_id"] == usuario["_id"]  # p: pertenece a quien lo pide
    if not PUEDE_USAR_REGISTRO.cumple(x=x, p=p):
        raise NO_ENCONTRADO
    return doc


@router.get("", response_model=PaginaHistorial)
async def listar(
    buscar: str = "",
    tipo: TipoHistorial | None = None,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
    usuario: dict[str, Any] = Depends(usuario_actual),
    db: AsyncDatabase = Depends(get_db),
):
    filtro: dict[str, Any] = {"usuario_id": usuario["_id"]}
    if tipo:
        filtro["tipo"] = tipo
    if buscar.strip():
        # Busca dentro del texto de cualquier mensaje, sin importar mayúsculas.
        filtro["mensajes.texto"] = {"$regex": re.escape(buscar.strip()), "$options": "i"}
    total = await db.historial.count_documents(filtro)
    cursor = db.historial.find(filtro).sort("actualizado_en", -1).skip((pagina - 1) * por_pagina).limit(por_pagina)
    items = [HistorialResumen(**_resumen(doc)) async for doc in cursor]
    return PaginaHistorial(items=items, total=total, pagina=pagina, por_pagina=por_pagina)


@router.get("/{id_registro}", response_model=HistorialSalida)
async def obtener(id_registro: str, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    doc = await _registro_propio(db, id_registro, usuario)
    return HistorialSalida(**_resumen(doc), mensajes=doc["mensajes"])


@router.post("", response_model=HistorialSalida, status_code=status.HTTP_201_CREATED)
async def crear(datos: HistorialEntrada, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    ahora = datetime.now(UTC)
    doc = {
        "usuario_id": usuario["_id"],
        "tipo": datos.tipo,
        "lengua": datos.lengua,
        "titulo": _titulo(datos),
        "mensajes": [m.model_dump() for m in datos.mensajes],
        "creado_en": ahora,
        "actualizado_en": ahora,
    }
    doc["_id"] = (await db.historial.insert_one(doc)).inserted_id
    return HistorialSalida(**_resumen(doc), mensajes=doc["mensajes"])


@router.put("/{id_registro}", response_model=HistorialSalida)
async def actualizar(
    id_registro: str,
    datos: HistorialEntrada,
    usuario: dict[str, Any] = Depends(usuario_actual),
    db: AsyncDatabase = Depends(get_db),
):
    doc = await _registro_propio(db, id_registro, usuario)
    cambios = {
        "tipo": datos.tipo,
        "lengua": datos.lengua,
        "titulo": _titulo(datos),
        "mensajes": [m.model_dump() for m in datos.mensajes],
        "actualizado_en": datetime.now(UTC),
    }
    await db.historial.update_one({"_id": doc["_id"]}, {"$set": cambios})
    doc |= cambios
    return HistorialSalida(**_resumen(doc), mensajes=doc["mensajes"])


@router.delete("/{id_registro}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar(id_registro: str, usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    doc = await _registro_propio(db, id_registro, usuario)
    await db.historial.delete_one({"_id": doc["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_todo(usuario: dict[str, Any] = Depends(usuario_actual), db: AsyncDatabase = Depends(get_db)):
    await db.historial.delete_many({"usuario_id": usuario["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
