# CONEXIÓN A MONGODB
# Abre la conexión con la base de datos al arrancar el servidor y la cierra al apagarlo.
# get_db() entrega la base de datos a las rutas que la necesitan (auth.py, usuarios.py).
# También crea el índice único del correo: MongoDB rechaza dos usuarios con el mismo correo.

# ▸ Desde PyMongo (conexión con MongoDB):
#     AsyncMongoClient → cliente asíncrono de MongoDB
from pymongo import AsyncMongoClient
# ▸ Desde PyMongo (tipo de la base de datos asíncrona):
#     AsyncDatabase → tipo: la base de datos
from pymongo.asynchronous.database import AsyncDatabase


# Guarda la conexión abierta para reutilizarla en todas las peticiones (no se abre una por petición).
class _Conexion:
    cliente: AsyncMongoClient | None = None  # conexión con el servidor de MongoDB
    db: AsyncDatabase | None = None  # la base de datos "traductor_senas"


_conexion = _Conexion()


# Se llama una vez al arrancar el servidor (main.py).
async def conectar(uri: str, nombre_db: str) -> AsyncDatabase:
    # serverSelectionTimeoutMS=5000: si MongoDB no responde en 5 segundos, da error.
    # tz_aware=True: las fechas se leen con zona horaria.
    _conexion.cliente = AsyncMongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    _conexion.db = _conexion.cliente[nombre_db]
    await _conexion.db.command("ping")  # falla pronto si MongoDB no está disponible
    # Índice único: MongoDB no permitirá dos documentos con el mismo correo en "usuarios".
    await _conexion.db.usuarios.create_index("correo", unique=True)
    return _conexion.db


# Se llama al apagar el servidor.
async def desconectar() -> None:
    if _conexion.cliente is not None:
        await _conexion.cliente.close()
        _conexion.cliente = None
        _conexion.db = None


# Las rutas lo piden con "db: AsyncDatabase = Depends(get_db)" y usan db.usuarios para la colección.
def get_db() -> AsyncDatabase:
    if _conexion.db is None:
        raise RuntimeError("La base de datos no está conectada")
    return _conexion.db
