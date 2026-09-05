#!/usr/bin/env bash
# BitFlow 2.0 — Automated Server Setup & Deployment Script

set -e

echo "=================================================="
echo "🚀 BitFlow 2.0 — Production Server Deployment"
echo "=================================================="

# Update apt package lists
sudo apt-get update -y

# Install Docker & Docker Compose if not installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER || true
    rm get-docker.sh
fi

# Install Git if missing
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
fi

# Clone or pull repo
if [ ! -d "BitFlow_2.0" ]; then
    echo "📥 Cloning BitFlow 2.0 Repository..."
    git clone https://github.com/abhilashjoyealuppalaguptha-netizen/BitFlow_2.0.git
    cd BitFlow_2.0
else
    echo "🔄 Pulling latest BitFlow 2.0 updates from main branch..."
    cd BitFlow_2.0
    git pull origin main
fi

# Build and start services via Docker Compose
echo "🐳 Building and launching containers..."
docker compose up -d --build

echo ""
echo "=================================================="
echo "🎉 BitFlow 2.0 is successfully running on your server!"
echo "=================================================="
echo "🌐 BitFlow Web App:  http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP'):3000"
echo "⚡ Verilog API:      http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP'):8000"
echo "=================================================="
