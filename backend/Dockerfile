# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for building extensions (e.g. ChromaDB/hnswlib compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the working directory
COPY backend/requirements.txt /app/backend/requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest of the application code
COPY backend/ /app/backend/

# Expose port 8000
EXPOSE 8000

# Run uvicorn server from the parent folder of backend/ package
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
