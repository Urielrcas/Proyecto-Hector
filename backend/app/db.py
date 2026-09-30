from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase


class _Conexion:
    cliente: AsyncMongoClient | None = None
    db: AsyncDatabase | None = None


_conexion = _Conexion()


async def conectar(uri: str, nombre_db: str) -> AsyncDatabase:
    _conexion.cliente = AsyncMongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    _conexion.db = _conexion.cliente[nombre_db]
    await _conexion.db.command("ping")  # falla pronto si MongoDB no está disponible
    await _conexion.db.usuarios.create_index("correo", unique=True)
    return _conexion.db


async def desconectar() -> None:
    if _conexion.cliente is not None:
        await _conexion.cliente.close()
        _conexion.cliente = None
        _conexion.db = None


def get_db() -> AsyncDatabase:
    if _conexion.db is None:
        raise RuntimeError("La base de datos no está conectada")
    return _conexion.db
