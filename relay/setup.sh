#!/bin/bash
# Bootstraps the relay on a fresh Ubuntu 24.04 server (used as Lightsail
# launch script). Expects RELAY_SECRET and RELAY_DOMAIN to be filled in below
# when the instance is created; never commit real values.
set -euo pipefail  # run with bash: Lightsail runs launch scripts with sh, so copy it over and `sudo bash setup.sh`

RELAY_SECRET="__RELAY_SECRET__"
RELAY_DOMAIN="__RELAY_DOMAIN__"  # e.g. 16-178-82-51.sslip.io (no DNS needed) or relay.example.com

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg debian-keyring debian-archive-keyring apt-transport-https ufw

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Caddy (automatic HTTPS)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

# Relay app
useradd --system --home /opt/relay --shell /usr/sbin/nologin relay || true
mkdir -p /opt/relay
cat > /etc/relay.env <<EOF
RELAY_SECRET=${RELAY_SECRET}
PORT=8080
EOF
chmod 600 /etc/relay.env

cat > /etc/systemd/system/relay.service <<'EOF'
[Unit]
Description=India Post / Easebuzz fixed-IP relay
After=network-online.target

[Service]
User=relay
EnvironmentFile=/etc/relay.env
ExecStart=/usr/bin/node /opt/relay/server.mjs
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/caddy/Caddyfile <<EOF
${RELAY_DOMAIN} {
  reverse_proxy 127.0.0.1:8080
}
EOF

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl daemon-reload
systemctl enable relay
systemctl reload caddy || systemctl restart caddy
# server.mjs is copied to /opt/relay afterwards; the service starts then.
