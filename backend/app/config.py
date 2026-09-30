from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """Configuración leída de variables de entorno o del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Local: mongodb://localhost:27017 — Atlas: mongodb+srv://usuario:clave@cluster.xxxxx.mongodb.net
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "traductor_senas"

    jwt_secreto: str = "cambia-esto-en-produccion"
    jwt_minutos: int = 60 * 24

    # Administrador que se crea automáticamente si la base no tiene ninguno
    admin_nombre: str = "Administrador"
    admin_correo: str = "admin@senas.app"
    admin_contrasena: str = "Admin12345"

    cors_origenes: list[str] = ["http://localhost:5173"]


config = Config()
