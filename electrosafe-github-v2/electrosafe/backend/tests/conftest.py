import os
import sys
import tempfile

# Que las pruebas encuentren los módulos del backend y usen una base temporal
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
for var in ("DATABASE_URL", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "LLM_PROVIDER"):
    os.environ.pop(var, None)  # las pruebas no usan Neon ni llaman a ningún modelo real
