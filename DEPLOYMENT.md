# Deployment Guide

## Step 1: Initial Server Setup

SSH into your server and run these commands:

```bash
ssh root@46.202.171.220

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create project directory
mkdir -p /var/www/lk-post-creator
cd /var/www/lk-post-creator
```

## Step 2: Clone Your Repository

First, push your local code to GitHub, then on your server:

```bash
# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/lk-post-creator.git .

# Or if you haven't created a GitHub repo yet, you can copy files manually
```

## Step 3: Install Dependencies and Configure

```bash
# Install dependencies
npm ci --production

# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=your-actual-api-key-here
EOF

# Set proper ownership
chown -R www-data:www-data /var/www/lk-post-creator
```

## Step 4: Setup Nginx

```bash
# Copy nginx configuration
cp /var/www/lk-post-creator/nginx.conf /etc/nginx/sites-available/lk.agence-digitalink.fr

# Enable the site
ln -sf /etc/nginx/sites-available/lk.agence-digitalink.fr /etc/nginx/sites-enabled/

# Remove default site (if exists)
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# If test passes, restart nginx
systemctl restart nginx
systemctl enable nginx
```

## Step 5: Setup PM2 and Start Application

```bash
cd /var/www/lk-post-creator

# Create log directory
mkdir -p /var/log/pm2
chown -R www-data:www-data /var/log/pm2

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you

# Check status
pm2 status
```

## Step 6: Setup SSL (Recommended)

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d lk.agence-digitalink.fr

# Test automatic renewal
certbot renew --dry-run
```

## Step 7: Setup Firewall

```bash
# Allow necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
```

## Step 8: Test Your Application

Visit: `https://lk.agence-digitalink.fr`

## GitHub Actions Setup

To enable automatic deployment, add these secrets to your GitHub repository:

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `HOST`: `46.202.171.220`
   - `USERNAME`: `root`
   - `SSH_KEY`: Your private SSH key content

## Troubleshooting Commands

```bash
# Check application logs
pm2 logs lk-post-creator

# Check nginx logs
tail -f /var/log/nginx/lk.agence-digitalink.fr.error.log

# Restart application
pm2 restart lk-post-creator

# Restart nginx
systemctl restart nginx

# Check if port 3001 is listening
netstat -tulpn | grep 3001
```

## Manual Deployment Process

If you want to deploy manually (without GitHub Actions):

```bash
# On your server
cd /var/www/lk-post-creator
git pull origin main
npm ci --production
pm2 restart lk-post-creator
```