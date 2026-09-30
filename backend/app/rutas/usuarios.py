"""CRUD de usuarios. Todas las rutas requieren rol de administrador."""

import re
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..dependencias import requiere_admin
from ..modelos import PaginaUsuarios, UsuarioActualizar, UsuarioCrear, UsuarioPublico
from ..reglas import PUEDE_ACTUALIZAR_USUARIO, PUEDE_ELIMINAR_USUARIO
from ..seguridad import hashear_contrasena

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], dependencies=[Depends(requiere_admin)])

CORREO_DUPLICADO = HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo.")
NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")


def _object_id(id_usuario: str) -> ObjectId:
    if not ObjectId.is_valid(id_usuario):
        raise NO_ENCONTRADO
    return ObjectId(id_usuario)


@router.get("", response_model=PaginaUsuarios)
async def listar(
    buscar: str = "",
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(10, ge=1, le=100),
    db: AsyncDatabase = Depends(get_db),
):
    filtro: dict[str, Any] = {}
    if buscar.strip():
        patron = {"$regex": re.escape(buscar.strip()), "$options": "i"}
        filtro = {"$or": [{"nombre": patron}, {"correo": patron}]}

    total = await db.usuarios.count_documents(filtro)
    cursor = db.usuarios.find(filtro).sort("creado_en", 1).skip((pagina - 1) * por_pagina).limit(por_pagina)
    items = [UsuarioPublico.desde_documento(doc) async for doc in cursor]
    return PaginaUsuarios(items=items, total=total, pagina=pagina, por_pagina=por_pagina)


@router.get("/{id_usuario}", response_model=UsuarioPublico)
async def obtener(id_usuario: str, db: AsyncDatabase = Depends(get_db)):
    doc = await db.usuarios.find_one({"_id": _object_id(id_usuario)})
    if doc is None:
        raise NO_ENCONTRADO
    return UsuarioPublico.desde_documento(doc)


@router.post("", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
async def crear(datos: UsuarioCrear, db: AsyncDatabase = Depends(get_db)):
    ahora = datetime.now(UTC)
    doc = datos.model_dump(exclude={"contrasena"})
    doc |= {"hash_contrasena": hashear_contrasena(datos.contrasena), "creado_en": ahora, "actualizado_en": ahora}
    try:
        resultado = await db.usuarios.insert_one(doc)
    except DuplicateKeyError:
        raise CORREO_DUPLICADO
    doc["_id"] = resultado.inserted_id
    return UsuarioPublico.desde_documento(doc)


@router.put("/{id_usuario}", response_model=UsuarioPublico)
async def actualizar(
    id_usuario: str,
    datos: UsuarioActualizar,
    db: AsyncDatabase = Depends(get_db),
    admin: dict[str, Any] = Depends(requiere_admin),
):
    oid = _object_id(id_usuario)
    cambios = datos.model_dump(exclude_none=True)

    # Regla «actualizar usuario»: a ∧ (y → (r ∧ t)). Evita que un administrador se bloquee a sí mismo.
    # Si no se envía rol o estado, se conservan los actuales (quien edita es admin y está activo).
    permitido = PUEDE_ACTUALIZAR_USUARIO.cumple(
        a=admin["rol"] == "admin",
        y=oid == admin["_id"],
        r=cambios.get("rol", "admin") == "admin",
        t=cambios.get("estado", "activo") == "activo",
    )
    if not permitido:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.")

    if contrasena := cambios.pop("contrasena", None):
        cambios["hash_contrasena"] = hashear_contrasena(contrasena)
    cambios["actualizado_en"] = datetime.now(UTC)

    try:
        doc = await db.usuarios.find_one_and_update({"_id": oid}, {"$set": cambios}, return_document=ReturnDocument.AFTER)
    except DuplicateKeyError:
        raise CORREO_DUPLICADO
    if doc is None:
        raise NO_ENCONTRADO
    return UsuarioPublico.desde_documento(doc)


@router.delete("/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar(id_usuario: str, db: AsyncDatabase = Depends(get_db), admin: dict[str, Any] = Depends(requiere_admin)):
    oid = _object_id(id_usuario)
    # Regla «eliminar usuario»: a ∧ ¬y
    if not PUEDE_ELIMINAR_USUARIO.cumple(a=admin["rol"] == "admin", y=oid == admin["_id"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta.")
    resultado = await db.usuarios.delete_one({"_id": oid})
    if resultado.deleted_count == 0:
        raise NO_ENCONTRADO
    return Response(status_code=status.HTTP_204_NO_CONTENT)
