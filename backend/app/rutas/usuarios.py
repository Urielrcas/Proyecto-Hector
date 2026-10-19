"""CRUD de usuarios. Todas las rutas requieren rol de administrador.

  GET    /api/usuarios          → listar (con búsqueda y paginación)   [Read]
  GET    /api/usuarios/{id}     → obtener uno                           [Read]
  POST   /api/usuarios          → crear                                 [Create]
  PUT    /api/usuarios/{id}     → actualizar (regla a ∧ (y → (r ∧ t)))  [Update]
  DELETE /api/usuarios/{id}     → eliminar  (regla a ∧ ¬y)              [Delete]

Las llama el frontend desde src/services/usuarios.ts.
"""

# ▸ Desde Python, módulo re (expresiones regulares: buscar patrones en texto)
import re
# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
from datetime import UTC, datetime
# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Any → tipo: cualquier valor
from typing import Any

# ▸ Desde librería bson (incluida con PyMongo; tipos de MongoDB):
#     ObjectId → el tipo de identificador (_id) que usa MongoDB
from bson import ObjectId
# ▸ Desde FastAPI (framework para crear la API):
#     APIRouter → grupo de rutas de la API
#     Depends → pide a FastAPI ejecutar una función antes (seguridad, base de datos)
#     HTTPException → error que se devuelve al navegador con un código (401, 404...)
#     Query → parámetros de la dirección (?pagina=2)
#     Response → respuesta HTTP
#     status → códigos HTTP con nombre (HTTP_404_NOT_FOUND...)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
# ▸ Desde PyMongo (conexión con MongoDB):
#     ReturnDocument → indica devolver el documento ya modificado
from pymongo import ReturnDocument
# ▸ Desde PyMongo (tipo de la base de datos asíncrona):
#     AsyncDatabase → tipo: la base de datos
from pymongo.asynchronous.database import AsyncDatabase
# ▸ Desde PyMongo, errores de MongoDB:
#     DuplicateKeyError → error cuando se repite un valor único (el correo)
from pymongo.errors import DuplicateKeyError

# ▸ Desde nuestro proyecto (carpeta app/db):
#     get_db → entrega la base de datos a cada ruta (app/db.py)
from ..db import get_db
# ▸ Desde nuestro proyecto (carpeta app/dependencias):
#     requiere_admin → exige rol de administrador (app/dependencias.py)
from ..dependencias import requiere_admin
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     PaginaUsuarios → lista paginada (app/modelos.py)
#     UsuarioActualizar → datos para modificar (app/modelos.py)
#     UsuarioCrear → datos para crear (app/modelos.py)
#     UsuarioPublico → usuario sin contraseña, lo que se devuelve (app/modelos.py)
from ..modelos import PaginaUsuarios, UsuarioActualizar, UsuarioCrear, UsuarioPublico
# ▸ Desde nuestro proyecto (carpeta app/reglas):
#     PUEDE_ACTUALIZAR_USUARIO → regla a ∧ (y → (r ∧ t)) (app/reglas.py)
#     PUEDE_ELIMINAR_USUARIO → regla a ∧ ¬y (app/reglas.py)
from ..reglas import PUEDE_ACTUALIZAR_USUARIO, PUEDE_ELIMINAR_USUARIO
# ▸ Desde nuestro proyecto (carpeta app/seguridad):
#     hashear_contrasena → cifra una contraseña con bcrypt (app/seguridad.py)
from ..seguridad import hashear_contrasena

# Todas las rutas de este archivo empiezan con /api/usuarios y exigen ser administrador.
router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], dependencies=[Depends(requiere_admin)])

# Errores reutilizables (el mensaje es el que ve el usuario en la pantalla).
CORREO_DUPLICADO = HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo.")
NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")


# Convierte el id de texto de la dirección al tipo ObjectId que usa MongoDB.
def _object_id(id_usuario: str) -> ObjectId:
    if not ObjectId.is_valid(id_usuario):
        raise NO_ENCONTRADO
    return ObjectId(id_usuario)


# READ (lista) — GET /api/usuarios?buscar=ana&pagina=1&por_pagina=10
@router.get("", response_model=PaginaUsuarios)
async def listar(
    buscar: str = "",  # texto a buscar (vacío = todos)
    pagina: int = Query(1, ge=1),  # número de página (mínimo 1)
    por_pagina: int = Query(10, ge=1, le=100),  # usuarios por página (entre 1 y 100)
    db: AsyncDatabase = Depends(get_db),
):
    # Si hay búsqueda: el nombre O el correo deben contener el texto (sin importar mayúsculas: "i").
    filtro: dict[str, Any] = {}
    if buscar.strip():
        patron = {"$regex": re.escape(buscar.strip()), "$options": "i"}
        filtro = {"$or": [{"nombre": patron}, {"correo": patron}]}

    total = await db.usuarios.count_documents(filtro)
    # Paginación: ordenar por fecha de creación, saltar las páginas anteriores y tomar "por_pagina".
    cursor = db.usuarios.find(filtro).sort("creado_en", 1).skip((pagina - 1) * por_pagina).limit(por_pagina)
    # Convertir cada documento a UsuarioPublico (sin contraseña).
    items = [UsuarioPublico.desde_documento(doc) async for doc in cursor]
    return PaginaUsuarios(items=items, total=total, pagina=pagina, por_pagina=por_pagina)


# READ (uno) — GET /api/usuarios/{id}  ({id_usuario} es la parte variable de la dirección)
@router.get("/{id_usuario}", response_model=UsuarioPublico)
async def obtener(id_usuario: str, db: AsyncDatabase = Depends(get_db)):
    doc = await db.usuarios.find_one({"_id": _object_id(id_usuario)})
    if doc is None:
        raise NO_ENCONTRADO
    return UsuarioPublico.desde_documento(doc)


# CREATE — POST /api/usuarios (código 201 = creado)
@router.post("", response_model=UsuarioPublico, status_code=status.HTTP_201_CREATED)
async def crear(datos: UsuarioCrear, db: AsyncDatabase = Depends(get_db)):
    ahora = datetime.now(UTC)
    # Se guarda todo menos la contraseña en texto; en su lugar va su versión cifrada (hash).
    doc = datos.model_dump(exclude={"contrasena"})
    doc |= {"hash_contrasena": hashear_contrasena(datos.contrasena), "creado_en": ahora, "actualizado_en": ahora}
    try:
        resultado = await db.usuarios.insert_one(doc)
    except DuplicateKeyError:
        # El índice único del correo (db.py) rechazó el documento: ese correo ya existe.
        raise CORREO_DUPLICADO
    doc["_id"] = resultado.inserted_id
    return UsuarioPublico.desde_documento(doc)


# UPDATE — PUT /api/usuarios/{id}
@router.put("/{id_usuario}", response_model=UsuarioPublico)
async def actualizar(
    id_usuario: str,
    datos: UsuarioActualizar,
    db: AsyncDatabase = Depends(get_db),
    admin: dict[str, Any] = Depends(requiere_admin),  # el administrador que hace el cambio
):
    oid = _object_id(id_usuario)
    # Solo los campos que se enviaron (exclude_none quita los que vienen vacíos).
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

    # Si se envió una contraseña nueva, guardar su hash (nunca la contraseña en texto).
    if contrasena := cambios.pop("contrasena", None):
        cambios["hash_contrasena"] = hashear_contrasena(contrasena)
    cambios["actualizado_en"] = datetime.now(UTC)

    try:
        # "$set" cambia solo esos campos; ReturnDocument.AFTER devuelve el documento ya modificado.
        doc = await db.usuarios.find_one_and_update({"_id": oid}, {"$set": cambios}, return_document=ReturnDocument.AFTER)
    except DuplicateKeyError:
        raise CORREO_DUPLICADO
    if doc is None:
        raise NO_ENCONTRADO
    return UsuarioPublico.desde_documento(doc)


# DELETE — DELETE /api/usuarios/{id} (código 204 = eliminado, sin contenido)
@router.delete("/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar(id_usuario: str, db: AsyncDatabase = Depends(get_db), admin: dict[str, Any] = Depends(requiere_admin)):
    oid = _object_id(id_usuario)
    # Regla «eliminar usuario»: a ∧ ¬y
    if not PUEDE_ELIMINAR_USUARIO.cumple(a=admin["rol"] == "admin", y=oid == admin["_id"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta.")
    resultado = await db.usuarios.delete_one({"_id": oid})
    if resultado.deleted_count == 0:  # no se borró nada: ese id no existe
        raise NO_ENCONTRADO
    # Borrar también su progreso de aprendizaje (ya no debe contar en las estadísticas).
    await db.progreso.delete_many({"usuario_id": oid})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
