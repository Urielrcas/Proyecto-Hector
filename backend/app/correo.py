"""Envío de correos (por ahora solo el de recuperar la contraseña).

Usa smtplib, que ya viene con Python. Funciona con cualquier servidor SMTP; con Gmail se
necesita una «contraseña de aplicación» (Cuenta de Google > Seguridad > Contraseñas de aplicaciones).
Si no hay SMTP configurado en el .env, el correo no se manda: el enlace se escribe en la consola
del servidor, para poder probar la recuperación sin cuenta de correo.
"""

# ▸ Desde Python, módulo logging (mensajes en la consola del servidor)
import logging
# ▸ Desde Python, módulo smtplib (enviar correos con el protocolo SMTP)
import smtplib
# ▸ Desde Python, módulo ssl (conexión cifrada con el servidor de correo)
import ssl
# ▸ Desde Python, módulo email (armar el mensaje con asunto, texto y HTML)
from email.message import EmailMessage

# ▸ Desde nuestro proyecto: la configuración (.env)
from .config import config

log = logging.getLogger("uvicorn.error")


def smtp_configurado() -> bool:
    return bool(config.smtp_servidor and config.smtp_usuario and config.smtp_contrasena)


def mensaje_recuperacion(nombre: str, correo: str, enlace: str) -> EmailMessage:
    """El correo con el enlace para crear una contraseña nueva."""
    m = EmailMessage()
    m["Subject"] = "Crea tu contraseña nueva · Intérprete de Señas"
    m["From"] = config.smtp_remitente or config.smtp_usuario
    m["To"] = correo
    minutos = config.minutos_restablecer
    m.set_content(
        f"Hola, {nombre}:\n\n"
        f"Alguien pidió cambiar la contraseña de tu cuenta. Si fuiste tú, abre este enlace (vence en {minutos} minutos):\n\n"
        f"{enlace}\n\n"
        "Si no lo pediste, ignora este correo: tu contraseña no cambia.\n"
    )
    m.add_alternative(
        f"""<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;color:#1c1917">
  <h2 style="color:#13695d">Crea tu contraseña nueva</h2>
  <p>Hola, {nombre}:</p>
  <p>Alguien pidió cambiar la contraseña de tu cuenta. Si fuiste tú, toca el botón. El enlace vence en {minutos} minutos y solo sirve una vez.</p>
  <p><a href="{enlace}" style="display:inline-block;background:#13695d;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Crear contraseña nueva</a></p>
  <p style="color:#78716c;font-size:14px">Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>
</div>""",
        subtype="html",
    )
    return m


def enviar(mensaje: EmailMessage, enlace_para_consola: str = "") -> bool:
    """Manda el correo. Sin SMTP configurado, escribe el enlace en la consola. Devuelve si se envió."""
    if not smtp_configurado():
        log.warning("SMTP sin configurar: no se envió el correo a %s. Enlace: %s", mensaje["To"], enlace_para_consola)
        return False
    contexto = ssl.create_default_context()
    try:
        if config.smtp_puerto == 465:
            with smtplib.SMTP_SSL(config.smtp_servidor, config.smtp_puerto, context=contexto, timeout=20) as s:
                s.login(config.smtp_usuario, config.smtp_contrasena)
                s.send_message(mensaje)
        else:
            with smtplib.SMTP(config.smtp_servidor, config.smtp_puerto, timeout=20) as s:
                s.starttls(context=contexto)
                s.login(config.smtp_usuario, config.smtp_contrasena)
                s.send_message(mensaje)
        return True
    except (smtplib.SMTPException, OSError) as error:
        # No se le dice nada distinto a la persona (no debe saber si el correo existe); queda en la consola.
        log.error("No se pudo enviar el correo a %s: %s", mensaje["To"], error)
        return False
