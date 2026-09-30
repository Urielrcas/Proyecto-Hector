from typing import Any

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase

from .db import get_db
from .reglas import ES_ADMINISTRADOR
from .seguridad import leer_token

_bearer = HTTPBearer(auto_error=False)


async def usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncDatabase = Depends(get_db),
) -> dict[str, Any]:
    no_autorizado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")
    if credenciales is None:
        raise no_autorizado
    try:
        id_usuario = leer_token(credenciales.credentials)
    except jwt.PyJWTError:
        raise no_autorizado
    if not ObjectId.is_valid(id_usuario):
        raise no_autorizado
    usuario = await db.usuarios.find_one({"_id": ObjectId(id_usuario)})
    if usuario is None or usuario["estado"] != "activo":
        raise no_autorizado
    return usuario


async def requiere_admin(usuario: dict[str, Any] = Depends(usuario_actual)) -> dict[str, Any]:
    # Regla «administrar usuarios»: c ∧ a (usuario_actual ya garantizó una sesión válida).
    if not ES_ADMINISTRADOR.cumple(c=True, a=usuario["rol"] == "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un administrador puede hacer esto.")
    return usuario
