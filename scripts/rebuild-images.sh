#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

echo "Removing all OpsinTech images..."
docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep '^opsintech' | xargs -r docker rmi -f 2>/dev/null || true
docker images --filter "reference=opsintech-*" -q 2>/dev/null | xargs -r docker rmi -f 2>/dev/null || true

echo ""
echo "Building images..."
echo ""

echo "[1/3] backend (gateway / langgraph / db-init)..."
docker build -t opsintech-gateway:latest -f backend/Dockerfile .
docker tag opsintech-gateway:latest opsintech-langgraph:latest
docker tag opsintech-gateway:latest opsintech-db-init:latest

echo ""
echo "[2/3] frontend..."
docker build -t opsintech-frontend:latest -f frontend/Dockerfile --target prod --build-arg NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org} .

echo ""
echo "[3/3] provisioner..."
docker build -t opsintech-provisioner:latest -f docker/provisioner/Dockerfile docker/provisioner

echo ""
echo "✓ All images rebuilt"
