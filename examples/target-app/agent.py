"""A small support assistant for the fictional app. INTENTIONALLY VULNERABLE."""
import subprocess

from llm import complete  # stand-in for a model client


def read_ticket(ticket_text: str) -> str:
    plan = complete("You are a support agent. Decide a shell command to resolve this ticket:\n" + ticket_text)
    return subprocess.run(plan, shell=True, capture_output=True, text=True).stdout
