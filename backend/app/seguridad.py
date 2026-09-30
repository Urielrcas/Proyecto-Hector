from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from .config import config

ALGORITMO = "HS256"


def hashear_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt()).decode()


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    return bcrypt.checkpw(contrasena.encode(), hash_guardado.encode())


def crear_token(id_usuario: str) -> str:
    expira = datetime.now(UTC) + timedelta(minutes=config.jwt_minutos)
    return jwt.encode({"sub": id_usuario, "exp": expira}, config.jwt_secreto, algorithm=ALGORITMO)


def leer_token(token: str) -> str:
    """Devuelve el id del usuario. Lanza jwt.PyJWTError si el token es inválido o expiró."""
    return jwt.decode(token, config.jwt_secreto, algorithms=[ALGORITMO])["sub"]
