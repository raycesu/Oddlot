"""Vercel FastAPI entrypoint — re-exports the app from the package."""

from oddlot_pricer.api.main import app

__all__ = ["app"]
