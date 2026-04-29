FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run Alembic migrations then start gunicorn
CMD ["sh", "-c", "flask db upgrade && gunicorn 'app:create_app()' --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
