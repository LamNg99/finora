# Deployment Setup

## Prerequisites

- Debian/Ubuntu server with Docker, Docker Compose, and nginx installed
- SSH access to the server
- GitHub repository with Actions enabled
- Domain pointed at the server: `finoraquant.com`

## 1. GitHub Secrets

Add these to the repository (`Settings → Secrets and variables → Actions`):

| Secret | Value |
|---|---|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USER` | SSH login user |
| `SSH_PRIVATE_KEY` | Private key whose public key is in `~/.ssh/authorized_keys` on the server |

## 2. Server — one-time setup

SSH into your server and run:

```bash
# Frontend webroot
sudo mkdir -p /var/www/finora
sudo chown $USER:$USER /var/www/finora

# nginx config
sudo cp deployment/nginx/finora.conf /etc/nginx/sites-available/finora
sudo ln -s /etc/nginx/sites-available/finora /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Compose file + env
mkdir -p ~/finora
cp deployment/docker-compose.yml ~/finora/
cp backend/.env.example ~/finora/.env   # fill in all required values
touch ~/finora/finora.db                # empty file — SQLite creates schema on first run
```

## 3. HTTPS with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d finoraquant.com -d www.finoraquant.com
```

Certbot will edit the nginx config to add SSL and configure auto-renewal.

## 4. Deploy

Push to `main` — GitHub Actions handles the rest:

1. Builds the backend Docker image and pushes it to `ghcr.io`
2. Builds the React frontend with `npm run build`
3. Rsyncs `frontend/dist/` to `/var/www/finora/` on the server
4. SSHes in, pulls the new image, and restarts the container

The SQLite database (`~/finora/finora.db`) is bind-mounted into the container and persists across deploys.
