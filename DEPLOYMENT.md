# Bloop Self-Hosted Deployment Guide

## Phase 8: Platform & Ecosystem - Self-Hosted Deployment

Complete guide for deploying Bloop on your own infrastructure.

## Prerequisites

- Docker and Docker Compose (for Docker deployment)
- Kubernetes cluster (for Kubernetes deployment)
- PostgreSQL 15+ (or use included Docker image)
- Redis 7+ (or use included Docker image)
- Domain name and SSL certificate (for production)
- Minimum 4GB RAM, 2 CPU cores

## Quick Start (Docker Compose)

### 1. Clone Repository

```bash
git clone https://github.com/BloopTeam/Bloop-Site.git
cd Bloop-Site
```

### 2. Configure Environment

Create `.env` file:

```env
# Database
POSTGRES_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_redis_password_here

# API Keys (at least one required)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_GEMINI_API_KEY=your-key-here

# CORS
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify Deployment

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace bloop
```

### 2. Create Secrets

```bash
kubectl create secret generic bloop-secrets \
  --from-literal=POSTGRES_PASSWORD=your_password \
  --from-literal=REDIS_PASSWORD=your_redis_password \
  --from-literal=OPENAI_API_KEY=your_key \
  --namespace=bloop
```

### 3. Deploy

```bash
kubectl apply -f k8s/deployment.yaml
```

### 4. Check Status

```bash
kubectl get pods -n bloop
kubectl get services -n bloop
```

## Production Configuration

### SSL/TLS Setup

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Configure Nginx with SSL
3. Update CORS_ORIGIN to HTTPS URL

### Database Backup

```bash
# Backup PostgreSQL
docker exec bloop-postgres pg_dump -U bloop bloop > backup.sql

# Restore
docker exec -i bloop-postgres psql -U bloop bloop < backup.sql
```

### Scaling

**Horizontal Scaling (Kubernetes):**

```bash
kubectl scale deployment bloop-backend --replicas=5 -n bloop
kubectl scale deployment bloop-frontend --replicas=3 -n bloop
```

**Vertical Scaling:**

Update resource limits in `k8s/deployment.yaml` or `docker-compose.yml`

### Monitoring

- Health endpoints: `/health` (backend)
- Metrics: `/metrics` (Prometheus format)
- Logs: `docker logs bloop-backend` or `kubectl logs -n bloop`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | Required |
| `REDIS_PASSWORD` | Redis password | Required |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | Optional |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `RUST_LOG` | Log level | `info` |
| `PORT` | Backend port | `3001` |

## Troubleshooting

### Backend won't start

- Check database connection: `docker logs bloop-postgres`
- Verify API keys are set
- Check port 3001 is available

### Frontend can't connect

- Verify `VITE_API_URL` matches backend URL
- Check CORS settings
- Verify backend health endpoint

### Database connection errors

- Ensure PostgreSQL is running: `docker ps`
- Check credentials in `.env`
- Verify network connectivity

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use secrets management
- [ ] Enable audit logging
- [ ] Regular security updates

## Support

For deployment issues, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [Quick Start Guide](./QUICK_START.md)
- GitHub Issues: https://github.com/BloopTeam/Bloop-Site/issues
