FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install fastapi==0.115.6 "uvicorn[standard]==0.32.1" sqlalchemy==2.0.36 alembic==1.14.0 psycopg2-binary==2.9.10 pydantic-settings==2.7.0 bcrypt==4.2.0 PyJWT==2.9.0 groq chromadb pypdf python-multipart
COPY . .

EXPOSE 8000
