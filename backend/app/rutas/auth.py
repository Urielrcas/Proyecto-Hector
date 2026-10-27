# RUTAS DE AUTENTICACIÓN  (/api/auth/...)
#   POST /login      → inicia sesión (regla lógica e ∧ k ∧ v) y devuelve un token JWT
#   POST /registro   → crea una cuenta nueva con rol "usuario"
#   GET  /yo         → devuelve los datos del usuario de la sesión actual
#   PUT  /yo         → el usuario cambia su nombre, lengua o contraseña (regla n → k)
#   POST /recuperar  → solicitud de recuperación de contraseña (el envío de correo está pendiente)
# Las llama el frontend desde src/services/auth.ts.

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
# ▸ Desde PyMongo, errores de MongoDB:
#     DuplicateKeyError → error cuando se repite un valor único (el correo)
from pymongo.errors import DuplicateKeyError

# ▸ Desde nuestro proyecto (carpeta app/db):
#     get_db → entrega la base de datos a cada ruta (app/db.py)
from ..db import get_db
# ▸ Desde nuestro proyecto (carpeta app/dependencias):
#     usuario_actual → obtiene el usuario de la sesión (app/dependencias.py)
from ..dependencias import usuario_actual
# ▸ Desde nuestro proyecto (carpeta app/modelos):
#     LoginEntrada → datos del login (app/modelos.py)
#     RecuperarEntrada → datos de recuperar contraseña (app/modelos.py)
#     RegistroEntrada → datos del registro (app/modelos.py)
#     SesionSalida → respuesta: token + usuario (app/modelos.py)
#     UsuarioPublico → usuario sin contraseña, lo que se devuelve (app/modelos.py)
from ..modelos import LoginEntrada, PerfilActualizar, RecuperarEntrada, RegistroEntrada, SesionSalida, UsuarioPublico
# ▸ Desde nuestro proyecto (carpeta app/reglas):
#     PUEDE_INICIAR_SESION → regla e ∧ k ∧ v (app/reglas.py)
from ..reglas import PUEDE_CAMBIAR_PERFIL, PUEDE_INICIAR_SESION
# ▸ Desde nuestro proyecto (carpeta app/seguridad):
#     crear_token → crea el token de sesión (app/seguridad.py)
#     hashear_contrasena → cifra una contraseña con bcrypt (app/seguridad.py)
#     verificar_contrasena → compara una contraseña con su hash (app/seguridad.py)
from ..seguridad import crear_token, hashear_contrasena, verificar_contrasena

# Todas las rutas de este archivo empiezan con /api/auth.
router = APIRouter(prefix="/api/auth", tags=["auth"])


# @router.post("/login") = esta función responde a POST /api/auth/login.
# "datos: LoginEntrada" = FastAPI valida el JSON recibido con ese modelo (modelos.py).
# response_model = la forma de la respuesta.
@router.post("/login", response_model=SesionSalida)
async def login(datos: LoginEntrada, db: AsyncDatabase = Depends(get_db)):
    # Buscar el usuario por su correo en la colección "usuarios".
    doc = await db.usuarios.find_one({"correo": datos.correo})
    # Calcular las proposiciones de la regla:
    e = doc is not None  # e: el correo está registrado
    k = e and verificar_contrasena(datos.contrasena, doc["hash_contrasena"])  # k: la contraseña es correcta
    v = e and doc["estado"] == "activo"  # v: la cuenta está activa

    # Regla «inicio de sesión»: e ∧ k ∧ v
    if not PUEDE_INICIAR_SESION.cumple(e=e, k=k, v=v):
        # Mismo mensaje si el correo no existe o la contraseña está mal (no revelar cuál de las dos falló).
        if not (e and k):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está desactivada. Contacta a un administrador.")
    # Todo correcto: crear el token y devolverlo con los datos públicos del usuario.
    return SesionSalida(token=crear_token(str(doc["_id"])), usuario=UsuarioPublico.desde_documento(doc))


# POST /api/auth/registro → crea la cuenta y devuelve la sesión ya iniciada (código 201 = creado).
@router.post("/registro", response_model=SesionSalida, status_code=status.HTTP_201_CREATED)
async def registro(datos: RegistroEntrada, db: AsyncDatabase = Depends(get_db)):
    ahora = datetime.now(UTC)
    # Documento a guardar: los datos recibidos (sin la contraseña en texto) + hash, rol, estado y fechas.
    # "|" une dos diccionarios.
    doc = datos.model_dump(exclude={"contrasena"}) | {
        "hash_contrasena": hashear_contrasena(datos.contrasena),
        "rol": "usuario",  # el registro público nunca crea administradores
        "estado": "activo",
        "creado_en": ahora,
        "actualizado_en": ahora,
    }
    try:
        resultado = await db.usuarios.insert_one(doc)  # guardar en MongoDB
    except DuplicateKeyError:
        # El índice único del correo lo rechazó: ya hay una cuenta con ese correo.
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.")
    doc["_id"] = resultado.inserted_id  # el id que le asignó MongoDB
    return SesionSalida(token=crear_token(str(doc["_id"])), usuario=UsuarioPublico.desde_documento(doc))


# GET /api/auth/yo → datos del usuario de la sesión. usuario_actual (dependencias.py) ya validó el token.
@router.get("/yo", response_model=UsuarioPublico)
async def yo(usuario: dict[str, Any] = Depends(usuario_actual)):
    return UsuarioPublico.desde_documento(usuario)


# POST /api/auth/recuperar → código 202 = "solicitud aceptada".
@router.put("/yo", response_model=UsuarioPublico)
async def actualizar_perfil(
    datos: PerfilActualizar,
    usuario: dict[str, Any] = Depends(usuario_actual),
    db: AsyncDatabase = Depends(get_db),
):
    """El propio usuario cambia su nombre, su lengua o su contraseña (pantalla Configuración)."""
    n = datos.contrasena_nueva is not None  # n: pide cambiar la contraseña
    k = n and verificar_contrasena(datos.contrasena_actual or "", usuario["hash_contrasena"])  # k: la actual es correcta
    # Regla «actualizar mi perfil»: n → k
    if not PUEDE_CAMBIAR_PERFIL.cumple(n=n, k=k):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña actual no es correcta.")

    cambios: dict[str, Any] = {"actualizado_en": datetime.now(UTC)}
    if datos.nombre is not None:
        cambios["nombre"] = datos.nombre
    if datos.lengua is not None:
        cambios["lengua"] = datos.lengua
    if n:
        cambios["hash_contrasena"] = hashear_contrasena(datos.contrasena_nueva)
    await db.usuarios.update_one({"_id": usuario["_id"]}, {"$set": cambios})
    return UsuarioPublico.desde_documento(usuario | cambios)


@router.post("/recuperar", status_code=status.HTTP_202_ACCEPTED)
async def recuperar(datos: RecuperarEntrada):
    # TODO: generar un enlace temporal y enviarlo por correo (requiere un servicio SMTP).
    # La respuesta es igual exista o no la cuenta, para no revelar qué correos están registrados.
    return {"mensaje": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."}
