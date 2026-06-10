import logging
import smtplib
from email.message import EmailMessage

from backend.app.core.settings import Settings

logger = logging.getLogger(__name__)


class EmailConfigurationError(RuntimeError):
    pass


def build_password_reset_link(settings: Settings, token: str) -> str:
    base_url = settings.public_app_url.rstrip("/")
    return f"{base_url}/?reset_token={token}"


def ensure_email_can_be_sent(settings: Settings) -> None:
    if settings.email_debug:
        return
    if not settings.smtp_configured:
        raise EmailConfigurationError("El servicio de email no está configurado.")


def send_password_reset_email(settings: Settings, recipient: str, reset_link: str) -> None:
    if settings.email_debug:
        logger.warning("Password reset link for %s: %s", recipient, reset_link)
        return

    ensure_email_can_be_sent(settings)

    message = EmailMessage()
    message["Subject"] = "Restablecer contraseña - Jandortiz's Task Tracker"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        "\n".join(
            [
                "Recibimos una solicitud para restablecer tu contraseña.",
                "",
                f"Abre este enlace para crear una nueva contraseña: {reset_link}",
                "",
                "El enlace caduca en 30 minutos. Si no solicitaste este cambio, ignora este correo.",
            ]
        )
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
