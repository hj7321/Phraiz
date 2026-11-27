FROM python:3.11-slim
RUN pip install --no-cache-dir "litellm[proxy]" "langfuse>=4.7,<5"
WORKDIR /app
EXPOSE 4000
CMD ["litellm", "--config", "/app/config.yaml", "--port", "4000"]