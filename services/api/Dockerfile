FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY packages/ea-client /app/packages/ea-client
COPY packages/shared /app/packages/shared
COPY packages/ingest /app/packages/ingest
COPY services/api /app/services/api

RUN pip install --no-cache-dir \
    /app/packages/ea-client \
    /app/packages/shared \
    /app/packages/ingest \
    -r /app/services/api/requirements.txt

WORKDIR /app/services/api
ENV PYTHONPATH=/app/services/api:/app/packages/ea-client:/app/packages/shared:/app/packages/ingest

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
