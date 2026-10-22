# CONFIGURACIÓN DEL SERVIDOR
# Lee las variables del archivo backend/.env (o usa los valores por defecto de abajo).
# Aquí se define: a qué base de datos conectarse, la clave para firmar los tokens de sesión,
# cuánto dura la sesión y los datos del administrador que se crea automáticamente.
# Se usa desde: main.py, seguridad.py y las pruebas.

# ▸ Desde Pydantic Settings (leer la configuración del archivo .env):
#     BaseSettings → clase base de la configuración
#     SettingsConfigDict → opciones de la configuración (archivo .env)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """Configuración leída de variables de entorno o del archivo .env."""

    # Leer el archivo .env de la carpeta backend; ignorar variables que no estén definidas aquí.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Cada atributo se llena con la variable del .env del mismo nombre en MAYÚSCULAS
    # (mongodb_uri ← MONGODB_URI). Si no existe en el .env, se usa el valor de aquí.

    # Dirección de la base de datos.
    # Local: mongodb://localhost:27017 — Atlas: mongodb+srv://usuario:clave@cluster.xxxxx.mongodb.net
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "traductor_senas"  # nombre de la base (la que ves en Compass)

    jwt_secreto: str = "cambia-esto-en-produccion"  # clave secreta para firmar los tokens (en .env va una aleatoria)
    jwt_minutos: int = 60 * 24  # duración de la sesión: 1440 minutos = 24 horas

    # Administrador que se crea automáticamente si la base no tiene ninguno
    admin_nombre: str = "Administrador"
    admin_correo: str = "admin@senas.app"
    admin_contrasena: str = "Admin12345"

    # Ollama (modelo de lenguaje local) para corregir las frases deletreadas (app/corrector.py).
    # Se instala aparte (ollama.com) y se descarga el modelo con: ollama pull llama3.2
    ollama_url: str = "http://localhost:11434"
    ollama_modelo: str = "llama3.2"
    ollama_segundos: float = 60  # tiempo máximo de espera (la primera frase tarda más: carga el modelo)

    # Direcciones desde las que el navegador puede llamar a esta API (la del frontend).
    cors_origenes: list[str] = ["http://localhost:5173"]


# Objeto único con la configuración ya cargada; los demás archivos hacen "from .config import config".
config = Config()
