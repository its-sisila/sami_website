import logging
from pathlib import Path
from typing import Any

import resend
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Jinja2 environment
template_dir = Path(__file__).parent.parent / "templates" / "email"
# Ensure the directory exists
template_dir.mkdir(parents=True, exist_ok=True)
env = Environment(loader=FileSystemLoader(str(template_dir)))


def send_email(to_emails: list[str], subject: str, html_body: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY is not set. Skipping email sending.")
        return False
        
    resend.api_key = settings.resend_api_key
    
    try:
        response = resend.Emails.send({
            "from": "SAMI Shift Reports <reports@getsami.app>",
            "to": to_emails,
            "subject": subject,
            "html": html_body
        })
        logger.info(f"Email sent successfully to {to_emails}. ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False


def send_shift_report_email(
    to_emails: list[str],
    station_name: str,
    shift_date: str,
    shift_type: str,
    report_data: dict[str, Any]
):
    """
    Sends the end-of-shift report email.
    """
    if not to_emails:
        logger.info("No recipients configured for shift report. Skipping.")
        return

    # Render template
    try:
        template = env.get_template("shift_report.html")
        html_body = template.render(
            station_name=station_name,
            shift_date=shift_date,
            shift_type=shift_type,
            **report_data
        )
    except Exception as e:
        logger.error(f"Failed to render shift report template: {str(e)}")
        return

    subject = f"Shift Report: {station_name} - {shift_date} ({shift_type.capitalize()})"
    send_email(to_emails, subject, html_body)
