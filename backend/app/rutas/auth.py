from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..dependencias import usuario_actual
from ..modelos import LoginEntrada, RecuperarEntrada, RegistroEntrada, SesionSalida, UsuarioPublico
from ..reglas import PUEDE_INICIAR_SESION
from ..seguridad import crear_token, hashear_contrasena, verificar_contrasena

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=SesionSalida)
async def login(datos: LoginEntrada, db: AsyncDatabase = Depends(get_db)):
    doc = await db.usuarios.find_one({"correo": datos.correo})
    e = doc is not None
    k = e and verificar_contrasena(datos.contrasena, doc["hash_contrasena"])
    v = e and doc["estado"] == "activo"

    # Regla «inicio de sesión»: e ∧ k ∧ v
    if not PUEDE_INICIAR_SESION.cumple(e=e, k=k, v=v):
        if not (e and k):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está desactivada. Contacta a un administrador.")
    return SesionSalida(token=crear_token(str(doc["_id"])), usuario=UsuarioPublico.desde_documento(doc))


@router.post("/registro", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
async def registro(datos: RegistroEntrada, db: AsyncDatabase = Depends(get_db)):
    ahora = datetime.now(UTC)
    doc = datos.model_dump(exclude={"contrasena"}) | {
        "hash_contrasena": hashear_contrasena(datos.contrasena),
        "rol": "usuario",  # el registro público nunca crea administradores
        "estado": "activo",
        "creado_en": ahora,
        "actualizado_en": ahora,
    }
    try:
        resultado = await db.usuarios.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.")
    doc["_id"] = resultado.inserted_id
    return SesionSalida(token=crear_token(str(doc["_id"])), usuario=UsuarioPublico.desde_documento(doc))


@router.get("/yo", response_model=UsuarioPublico)
async def yo(usuario: dict[str, Any] = Depends(usuario_actual)):
    return UsuarioPublico.desde_documento(usuario)


@router.post("/recuperar", status_code=status.HTTP_202_ACCEPTED)
async def recuperar(datos: RecuperarEntrada):
    # TODO: generar un enlace temporal y enviarlo por correo (requiere un servicio SMTP).
    # La respuesta es igual exista o no la cuenta, para no revelar qué correos están registrados.
    return {"mensaje": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}
