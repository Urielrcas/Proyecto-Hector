# SEGURIDAD: CONTRASEÑAS Y TOKENS
#   - hashear_contrasena / verificar_contrasena: cifran y comprueban contraseñas con bcrypt.
#     En la base de datos solo se guarda el "hash" (texto cifrado), nunca la contraseña real.
#   - crear_token / leer_token: crean y leen el token JWT que identifica la sesión.
#     El token está firmado con JWT_SECRETO, así nadie puede falsificarlo.

# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
#     timedelta → duración (para calcular cuándo vence el token)
# ▸ Desde Python, módulo hashlib (resúmenes sha256, para la huella de la contraseña)
import hashlib
from datetime import UTC, datetime, timedelta

# ▸ Desde librería bcrypt (cifrado de contraseñas)
import bcrypt
# ▸ Desde librería PyJWT (tokens de sesión JWT)
import jwt

# ▸ Desde nuestro proyecto (carpeta app/config):
#     config → la configuración ya cargada (app/config.py)
from .config import config

ALGORITMO = "HS256"  # algoritmo de firma del token


def hashear_contrasena(contrasena: str) -> str:
    # gensalt() agrega un valor aleatorio ("sal"): la misma contraseña produce hashes distintos.
    return bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt()).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    # Compara la contraseña escrita con el hash guardado, sin necesidad de "descifrarlo".
    return bcrypt.checkpw(contrasena.encode(), hash_guardado.encode())


def huella(hash_contrasena: str) -> str:
    """Un resumen corto del hash actual: si la contraseña cambia, la huella cambia y el enlace ya no sirve."""
    return hashlib.sha256(hash_contrasena.encode()).hexdigest()[:16]


def crear_token_restablecer(id_usuario: str, hash_contrasena: str) -> str:
    """Token para crear contraseña nueva: dura poco y lleva la huella de la contraseña actual (un solo uso)."""
    expira = datetime.now(UTC) + timedelta(minutes=config.minutos_restablecer)
    datos = {"sub": id_usuario, "exp": expira, "uso": "restablecer", "h": huella(hash_contrasena)}
    return jwt.encode(datos, config.jwt_secreto, algorithm=ALGORITMO)


def leer_token_restablecer(token: str) -> dict | None:
    """Los datos del token si la firma es válida, no venció y es de restablecer; si no, None."""
    try:
        datos = jwt.decode(token, config.jwt_secreto, algorithms=[ALGORITMO])
    except jwt.PyJWTError:
        return None
    return datos if datos.get("uso") == "restablecer" else None


def crear_token(id_usuario: str) -> str:
    # El token guarda el id del usuario ("sub") y cuándo vence ("exp", 24 h por defecto).
    expira = datetime.now(UTC) + timedelta(minutes=config.jwt_minutos)
    return jwt.encode({"sub": id_usuario, "exp": expira}, config.jwt_secreto, algorithm=ALGORITMO)


def leer_token(token: str) -> str:
    """Devuelve el id del usuario. Lanza jwt.PyJWTError si el token es inválido o expiró."""
    return jwt.decode(token, config.jwt_secreto, algorithms=[ALGORITMO])["sub"]
