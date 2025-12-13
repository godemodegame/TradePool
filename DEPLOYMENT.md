# TradePool - Production Deployment Guide

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Telegram bot token from @BotFather
- TradePool contracts deployed to Sui

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required settings:**
- `TELEGRAM_BOT_TOKEN` - Your bot token from @BotFather
- `ENCRYPTION_KEY` - 32-character encryption key (generate with `openssl rand -base64 24`)
- `SUI_PACKAGE_ID` - Deployed package ID
- `SUI_REGISTRY_ID` - Registry object ID
- `DB_PASSWORD` - Strong database password

### 2. Start Services

```bash
# Using the quick start script
./start-bot.sh

# Or manually with docker-compose
docker-compose up -d
```

### 3. Verify Deployment

```bash
# Check service status
docker-compose ps

# View bot logs
docker-compose logs -f tradepool-bot

# Check database
docker-compose logs postgres
```

### 4. Test the Bot

1. Open Telegram
2. Search for your bot
3. Send `/start`
4. Create a wallet and test functionality

---

## Architecture

```
┌─────────────────────────────────────┐
│       Docker Compose Stack          │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │   tradepool-bot (Node.js)    │   │
│  │   - Telegram Bot API         │   │
│  │   - Sui Blockchain Client    │   │
│  │   Port: 3000 (health check)  │   │
│  └──────────────────────────────┘   │
│               ↓                      │
│  ┌──────────────────────────────┐   │
│  │   postgres (PostgreSQL)      │   │
│  │   - User data                │   │
│  │   - Transactions             │   │
│  │   Port: 5432                 │   │
│  └──────────────────────────────┘   │
│               ↓                      │
│  ┌──────────────────────────────┐   │
│  │   redis (Cache)              │   │
│  │   - Session management       │   │
│  │   Port: 6379                 │   │
│  └──────────────────────────────┘   │
│               ↓                      │
│  ┌──────────────────────────────┐   │
│  │   pgadmin (Optional)         │   │
│  │   - Database UI              │   │
│  │   Port: 5050                 │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Services

### tradepool-bot
- **Image**: Built from Dockerfile
- **Port**: 3000 (internal health check)
- **Volumes**: `./apps/telegramBot/logs:/app/apps/telegramBot/logs`
- **Health Check**: HTTP GET to /health every 30s

### postgres
- **Image**: postgres:14-alpine
- **Port**: 5432 (exposed to host)
- **Volume**: postgres-data (persistent)
- **Health Check**: pg_isready

### redis
- **Image**: redis:7-alpine
- **Port**: 6379 (exposed to host)
- **Volume**: redis-data (persistent)
- **Health Check**: redis-cli ping

### pgadmin (optional)
- **Image**: dpage/pgadmin4
- **Port**: 5050 (web UI)
- **Profile**: tools (start with `--profile tools`)

---

## Common Operations

### Start Services

```bash
# Start all services
docker-compose up -d

# Start with pgAdmin
docker-compose --profile tools up -d

# Start in foreground (see logs)
docker-compose up
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f tradepool-bot
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 tradepool-bot
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart tradepool-bot
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Access Database

```bash
# Using psql
docker-compose exec postgres psql -U tradepool -d tradepool

# Using pgAdmin
# Navigate to http://localhost:5050
# Login with credentials from .env
```

### Check Service Health

```bash
# Check status
docker-compose ps

# Check health
docker inspect --format='{{json .State.Health}}' tradepool-bot | jq
```

---

## Monitoring

### Log Files

Logs are stored in `./apps/telegramBot/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only

```bash
# View logs
tail -f apps/telegramBot/logs/combined.log
tail -f apps/telegramBot/logs/error.log

# Search logs
grep ERROR apps/telegramBot/logs/combined.log
```

### Docker Stats

```bash
# Real-time resource usage
docker stats tradepool-bot tradepool-db tradepool-redis
```

### Health Checks

```bash
# Bot health
curl http://localhost:3000/health

# Database
docker-compose exec postgres pg_isready

# Redis
docker-compose exec redis redis-cli ping
```

---

## Database Backup

### Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U tradepool tradepool > backup.sql

# Or with timestamp
docker-compose exec postgres pg_dump -U tradepool tradepool > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
# Restore from backup
cat backup.sql | docker-compose exec -T postgres psql -U tradepool -d tradepool
```

---

## Scaling

### Horizontal Scaling

```bash
# Run multiple bot instances
docker-compose up -d --scale tradepool-bot=3
```

Note: Requires load balancer and shared Redis for sessions.

---

## Troubleshooting

### Bot Not Starting

```bash
# Check logs
docker-compose logs tradepool-bot

# Check environment
docker-compose exec tradepool-bot env | grep -E "TELEGRAM|SUI|DATABASE"

# Verify .env file
cat .env
```

### Database Connection Issues

```bash
# Check if postgres is running
docker-compose ps postgres

# Check health
docker-compose exec postgres pg_isready

# Test connection
docker-compose exec tradepool-bot node -e "const {Pool}=require('pg'); new Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(()=>console.log('OK')).catch(console.error)"
```

### Permission Issues

```bash
# Fix log directory permissions
sudo chown -R 1001:1001 apps/telegramBot/logs

# Fix volume permissions
docker-compose down -v
docker volume prune
docker-compose up -d
```

---

## Security Checklist

- [ ] Strong `DB_PASSWORD` set
- [ ] Unique `ENCRYPTION_KEY` (32 chars)
- [ ] Secure `JWT_SECRET`
- [ ] `.env` file permissions restricted (`chmod 600 .env`)
- [ ] Firewall configured (only necessary ports open)
- [ ] SSL/TLS for external connections
- [ ] Regular backups configured
- [ ] Logs monitored for errors
- [ ] Services running as non-root user

---

## Production Recommendations

### Resource Limits

Add to docker-compose.yml:

```yaml
services:
  tradepool-bot:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Auto-Restart Policy

Already configured with `restart: unless-stopped`

### Logging Driver

Configure centralized logging:

```yaml
services:
  tradepool-bot:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Networks

Separate networks for better security:

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

---

## Updating

### Update Application Code

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Update Dependencies

```bash
# Update npm packages in telegramBot
cd apps/telegramBot
npm update

# Rebuild Docker image
cd ../..
docker-compose build --no-cache tradepool-bot
docker-compose up -d
```

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

---

## Support

For detailed documentation:
- **User Guide**: apps/telegramBot/QUICKSTART.md
- **API Docs**: apps/telegramBot/API.md
- **README**: apps/telegramBot/README.md

For issues:
- Check logs: `docker-compose logs -f`
- Run health checks
- Review troubleshooting section above
