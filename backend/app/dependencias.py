# DEPENDENCIAS DE SEGURIDAD (quién hace la petición y si tiene permiso)
# FastAPI ejecuta estas funciones antes de cada ruta que las pide con Depends(...):
#   - usuario_actual: lee el token JWT del encabezado "Authorization" y busca al usuario.
#                     Si no hay token, es inválido o la cuenta está inactiva → error 401.
#   - requiere_admin: además exige rol de administrador (regla lógica c ∧ a) → si no, error 403.

# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Any → tipo: cualquier valor
from typing import Any

# ▸ Desde librería PyJWT (tokens de sesión JWT)
import jwt
# ▸ Desde librería bson (incluida con PyMongo; tipos de MongoDB):
#     ObjectId → el tipo de identificador (_id) que usa MongoDB
from bson import ObjectId
# ▸ Desde FastAPI (framework para crear la API):
#     Depends → pide a FastAPI ejecutar una función antes (seguridad, base de datos)
#     HTTPException → error que se devuelve al navegador con un código (401, 404...)
#     status → códigos HTTP con nombre (HTTP_404_NOT_FOUND...)
from fastapi import Depends, HTTPException, status
# ▸ Desde FastAPI, seguridad (leer el token del encabezado):
#     HTTPAuthorizationCredentials → el token leído
#     HTTPBearer → lee el token del encabezado Authorization: Bearer ...
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# ▸ Desde PyMongo (tipo de la base de datos asíncrona):
#     AsyncDatabase → tipo: la base de datos
from pymongo.asynchronous.database import AsyncDatabase

# ▸ Desde nuestro proyecto (carpeta app/db):
#     get_db → entrega la base de datos a cada ruta (app/db.py)
from .db import get_db
# ▸ Desde nuestro proyecto (carpeta app/reglas):
#     ES_ADMINISTRADOR → regla c ∧ a (app/reglas.py)
from .reglas import ES_ADMINISTRADOR
# ▸ Desde nuestro proyecto (carpeta app/seguridad):
#     leer_token → lee el token de sesión (app/seguridad.py)
from .seguridad import leer_token

# Lee el encabezado "Authorization: Bearer <token>" de cada petición.
# auto_error=False: si no viene, no falla aquí; lo decidimos nosotros abajo (error 401 con mensaje en español).
_bearer = HTTPBearer(auto_error=False)


# ¿Quién hace la petición? Devuelve el documento del usuario desde MongoDB.
async def usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncDatabase = Depends(get_db),
) -> dict[str, Any]:
    no_autorizado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")
    # 1) ¿Mandó token?
    if credenciales is None:
        raise no_autorizado
    # 2) ¿El token es válido y no ha vencido? (si alguien lo modificó, la firma no coincide)
    try:
        id_usuario = leer_token(credenciales.credentials)
    except jwt.PyJWTError:
        raise no_autorizado
    if not ObjectId.is_valid(id_usuario):
        raise no_autorizado
    # 3) ¿El usuario sigue existiendo y está activo? (un admin pudo eliminarlo o desactivarlo)
    usuario = await db.usuarios.find_one({"_id": ObjectId(id_usuario)})
    if usuario is None or usuario["estado"] != "activo":
        raise no_autorizado
    return usuario


# Además de tener sesión, exige ser administrador. Se usa en todas las rutas de usuarios.py.
async def requiere_admin(usuario: dict[str, Any] = Depends(usuario_actual)) -> dict[str, Any]:
    # Regla «administrar usuarios»: c ∧ a (usuario_actual ya garantizó una sesión válida).
    if not ES_ADMINISTRADOR.cumple(c=True, a=usuario["rol"] == "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un administrador puede hacer esto.")
    return usuario
