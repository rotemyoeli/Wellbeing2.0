FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV FLASK_APP=app:create_app()

# Install Python dependencies from backend/
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    which gunicorn && gunicorn --version

# Copy backend source into /app
COPY backend/ .

EXPOSE 8000

CMD ["sh", "-c", "python -m flask db upgrade && python -m gunicorn 'app:create_app()' --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
