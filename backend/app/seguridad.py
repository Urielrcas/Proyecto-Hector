# SEGURIDAD: CONTRASEÑAS Y TOKENS
#   - hashear_contrasena / verificar_contrasena: cifran y comprueban contraseñas con bcrypt.
#     En la base de datos solo se guarda el "hash" (texto cifrado), nunca la contraseña real.
#   - crear_token / leer_token: crean y leen el token JWT que identifica la sesión.
#     El token está firmado con JWT_SECRETO, así nadie puede falsificarlo.

# ▸ Desde Python, módulo datetime (fechas y horas):
#     UTC → zona horaria universal
#     datetime → fecha y hora
#     timedelta → duración (para calcular cuándo vence el token)
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


def crear_token(id_usuario: str) -> str:
    # El token guarda el id del usuario ("sub") y cuándo vence ("exp", 24 h por defecto).
    expira = datetime.now(UTC) + timedelta(minutes=config.jwt_minutos)
    return jwt.encode({"sub": id_usuario, "exp": expira}, config.jwt_secreto, algorithm=ALGORITMO)


def leer_token(token: str) -> str:
    """Devuelve el id del usuario. Lanza jwt.PyJWTError si el token es inválido o expiró."""
    return jwt.decode(token, config.jwt_secreto, algorithms=[ALGORITMO])["sub"]
