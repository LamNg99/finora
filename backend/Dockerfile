# Stage 1: install Python deps
FROM python:3.13-slim AS deps

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: build cx_Freeze executable
FROM deps AS builder

WORKDIR /build
RUN pip install --no-cache-dir cx_Freeze
COPY . .
RUN python setup.py build && mv build/exe.linux-* build/dist

# Stage 3: minimal runtime — no Python needed
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /build/build/dist/ .

EXPOSE 8000

CMD ["./finora"]
