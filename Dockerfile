FROM python:3.12-slim

# Copy AWS Lambda Web Adapter extension for serverless scale-to-zero execution
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app

# Install system dependencies for psycopg2 and building C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .
RUN chmod +x scripts/entrypoint_api.sh

# Environment variables for AWS Lambda Web Adapter & FastAPI
ENV PORT=8000
ENV AWS_LWA_PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/health

EXPOSE 8000
CMD ["sh", "scripts/entrypoint_api.sh"]
