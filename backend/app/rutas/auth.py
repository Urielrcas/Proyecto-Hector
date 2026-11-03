# RUTAS DE AUTENTICACIÓN  (/api/auth/...)
#   POST /login      → inicia sesión (regla lógica e ∧ k ∧ v) y devuelve un token JWT
#   POST /registro   → crea una cuenta nueva con rol "usuario"
#   GET  /yo         → devuelve los datos del usuario de la sesión actual
#   PUT  /yo         → el usuario cambia su nombre, lengua o contraseña (regla n → k)
#   POST /recuperar  → manda un correo con el enlace para crear una contraseña nueva
#   POST /restablecer → crea la contraseña nueva con el token del enlace (regla t ∧ u ∧ a)
# Las llama el frontend desde src/services/auth.ts.

# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
from datetime import UTC, datetime
# ▸ Desde Python, módulo typing (anotaciones de tipos):
#     Any → tipo: cualquier valor
from typing import Any

# ▸ Desde Starlette (base de FastAPI): correr una función lenta (mandar el correo) sin trabar el servidor
from starlette.concurrency import run_in_threadpool

# ▸ Desde bson (viene con PyMongo):
#     ObjectId → el tipo de identificador (_id) que usa MongoDB
from bson import ObjectId
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
from ..modelos import LoginEntrada, PerfilActualizar, RecuperarEntrada, RegistroEntrada, RestablecerEntrada, SesionSalida, UsuarioPublico
# ▸ Desde nuestro proyecto: envío de correos (app/correo.py)
from .. import correo as correos
from ..config import config
# ▸ Desde nuestro proyecto (carpeta app/reglas):
#     PUEDE_INICIAR_SESION → regla e ∧ k ∧ v (app/reglas.py)
from ..reglas import PUEDE_CAMBIAR_PERFIL, PUEDE_INICIAR_SESION, PUEDE_RESTABLECER
# ▸ Desde nuestro proyecto (carpeta app/seguridad):
#     crear_token → crea el token de sesión (app/seguridad.py)
#     hashear_contrasena → cifra una contraseña con bcrypt (app/seguridad.py)
#     verificar_contrasena → compara una contraseña con su hash (app/seguridad.py)
from ..seguridad import crear_token, crear_token_restablecer, hashear_contrasena, huella, leer_token_restablecer, verificar_contrasena

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


MENSAJE_RECUPERAR = "Si el correo está registrado, recibirás un enlace para crear una contraseña nueva."


@router.post("/recuperar", status_code=status.HTTP_202_ACCEPTED)
async def recuperar(datos: RecuperarEntrada, db: AsyncDatabase = Depends(get_db)):
    """Manda el enlace por correo. La respuesta es igual exista o no la cuenta (no revela qué correos hay)."""
    usuario = await db.usuarios.find_one({"correo": datos.correo})
    if usuario and usuario.get("estado") == "activo":
        token = crear_token_restablecer(str(usuario["_id"]), usuario["hash_contrasena"])
        enlace = f"{config.url_app.rstrip('/')}/restablecer?token={token}"
        mensaje = correos.mensaje_recuperacion(usuario["nombre"], usuario["correo"], enlace)
        # Mandar el correo puede tardar unos segundos: se hace en otro hilo para no trabar al servidor.
        await run_in_threadpool(correos.enviar, mensaje, enlace)
    return {"mensaje": MENSAJE_RECUPERAR}


@router.post("/restablecer")
async def restablecer(datos: RestablecerEntrada, db: AsyncDatabase = Depends(get_db)):
    """Crea la contraseña nueva con el token del correo (regla t ∧ u ∧ a)."""
    contenido = leer_token_restablecer(datos.token)
    t = contenido is not None  # t: firma correcta, no venció y es de restablecer
    usuario = None
    if t and ObjectId.is_valid(contenido["sub"]):
        usuario = await db.usuarios.find_one({"_id": ObjectId(contenido["sub"])})
    a = usuario is not None and usuario.get("estado") == "activo"  # a: la cuenta existe y está activa
    u = a and huella(usuario["hash_contrasena"]) == contenido["h"]  # u: el enlace no se ha usado
    if not PUEDE_RESTABLECER.cumple(t=t, u=u, a=a):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El enlace no es válido o ya venció. Pide uno nuevo.")
    await db.usuarios.update_one(
        {"_id": usuario["_id"]},
        {"$set": {"hash_contrasena": hashear_contrasena(datos.contrasena), "actualizado_en": datetime.now(UTC)}},
    )
    return {"mensaje": "Listo: tu contraseña cambió. Ya puedes iniciar sesión."}
