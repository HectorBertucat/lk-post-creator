#!/bin/bash

# Deployment script for LinkedIn Post Creator
# Run this script on your server to set up the application

set -e

echo "🚀 Starting deployment of LinkedIn Post Creator..."

# Configuration
PROJECT_DIR="/var/www/lk-post-creator"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
DOMAIN="lk.agence-digitalink.fr"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js (if not already installed)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Install PM2 globally (if not already installed)
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Create project directory
print_status "Setting up project directory..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone or update the repository
if [ -d ".git" ]; then
    print_status "Updating existing repository..."
    git pull origin main
else
    print_status "Cloning repository..."
    # You'll need to replace this with your actual repository URL
    print_warning "Please clone your repository manually to $PROJECT_DIR"
    print_warning "Run: git clone <your-repo-url> $PROJECT_DIR"
    exit 1
fi

# Install dependencies
print_status "Installing Node.js dependencies..."
npm ci --production

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=your-api-key-here
EOF
    print_warning "Please edit $PROJECT_DIR/.env and add your Anthropic API key"
fi

# Set proper ownership
chown -R www-data:www-data $PROJECT_DIR

# Setup nginx configuration
print_status "Setting up nginx configuration..."
cp nginx.conf $NGINX_SITES/$DOMAIN

# Enable the site
ln -sf $NGINX_SITES/$DOMAIN $NGINX_ENABLED/

# Remove default nginx site if it exists
if [ -f "$NGINX_ENABLED/default" ]; then
    rm $NGINX_ENABLED/default
fi

# Test nginx configuration
nginx -t

# Create PM2 ecosystem file in the correct location
print_status "Setting up PM2 configuration..."
cp ecosystem.config.js $PROJECT_DIR/

# Create log directories
mkdir -p /var/log/pm2
chown -R www-data:www-data /var/log/pm2

# Start the application with PM2
print_status "Starting application with PM2..."
cd $PROJECT_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Restart nginx
print_status "Restarting nginx..."
systemctl restart nginx
systemctl enable nginx

# Setup SSL with Let's Encrypt (optional)
print_warning "To enable SSL, run the following command:"
print_warning "certbot --nginx -d $DOMAIN"

# Setup firewall (optional)
print_status "Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

print_status "✅ Deployment completed successfully!"
print_status "Your application should be accessible at: http://$DOMAIN"
print_warning "Don't forget to:"
print_warning "1. Edit $PROJECT_DIR/.env with your Anthropic API key"
print_warning "2. Setup SSL with: certbot --nginx -d $DOMAIN"
print_warning "3. Configure your GitHub secrets for CI/CD"

echo ""
print_status "GitHub Secrets needed:"
echo "HOST: 46.202.171.220"
echo "USERNAME: root"  
echo "SSH_KEY: <your-private-ssh-key>"