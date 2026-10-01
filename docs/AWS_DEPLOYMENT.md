# AWS Deployment Runbook

This document is a practical, opinionated walkthrough for deploying
realtime-collab-app to AWS. It assumes the AWS CLI is configured and
that you can use a managed VPC (the default VPC works for a demo).

> The application is **AWS-agnostic** by design — every integration is
> gated behind environment variables, so a partial deployment (e.g.
> ECS + RDS, no S3) works without code changes.

## 1. Target architecture

```
            ┌──────────────────┐
            │   CloudFront     │  (apps/web build)
            │   (HTTPS, CDN)   │
            └────────┬─────────┘
                     │ static
                     ▼
            ┌──────────────────┐
            │       S3         │
            │  collab-web-prod │
            └──────────────────┘

            ┌──────────────────┐
   users ──►│  ALB (HTTPS,WS)  │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐         ┌─────────────────────┐
            │ ECS Fargate svc  │────────►│  RDS PostgreSQL 16  │
            │ (collab-server,  │         └─────────────────────┘
            │  ≥2 tasks)       │
            └────────┬─────────┘         ┌─────────────────────┐
                     └────────────────► │ ElastiCache Redis 7  │
                                        └─────────────────────┘

            (optional) collab-attachments S3 bucket
```

## 2. Build & push the server image

```bash
aws ecr create-repository --repository-name collab-server

# Build (from repo root) and tag for ECR
docker build -f apps/server/Dockerfile -t collab-server:latest .

REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/collab-server

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $REPO

docker tag collab-server:latest $REPO:latest
docker push $REPO:latest
```

## 3. RDS Postgres

Create a `db.t4g.micro` Postgres 16 instance (multi-AZ for production).
Capture the endpoint, port, user, password, and DB name.

```bash
aws rds create-db-instance \
  --db-instance-identifier collab-prod \
  --engine postgres --engine-version 16.4 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username collab --master-user-password '<<gen>>' \
  --db-name collab \
  --vpc-security-group-ids <sg-rds> \
  --publicly-accessible false
```

After it's available, run migrations against it from a CI job or
bastion host:

```bash
DATABASE_URL='postgresql://collab:...@<endpoint>:5432/collab?schema=public' \
  npm run prisma:deploy -w @collab/server
```

## 4. ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id collab-prod \
  --engine redis --engine-version 7.1 \
  --cache-node-type cache.t4g.micro \
  --num-cache-nodes 1 \
  --security-group-ids <sg-redis>
```

Take note of the primary endpoint; the server reads `REDIS_URL`.

## 5. S3 (optional)

```bash
aws s3api create-bucket --bucket collab-attachments-prod --region us-east-1
aws s3api put-public-access-block \
  --bucket collab-attachments-prod \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Lifecycle: expire orphan uploads after 7 days.
aws s3api put-bucket-lifecycle-configuration --bucket collab-attachments-prod \
  --lifecycle-configuration file://s3-lifecycle.json
```

Create an IAM user/role with `s3:PutObject`, `s3:GetObject`, and
`s3:DeleteObject` scoped to `arn:aws:s3:::collab-attachments-prod/*`.
Pass its credentials to the ECS task via Secrets Manager.

## 6. ECS Fargate task

Use this `taskdef.json` skeleton — the executionRoleArn needs
CloudWatch Logs and Secrets Manager read perms:

```jsonc
{
  "family": "collab-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/collab-server-task",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/collab-server:latest",
      "portMappings": [{ "containerPort": 4000, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "4000" },
        { "name": "SOCKET_IO_REDIS_ADAPTER", "value": "true" },
        { "name": "CORS_ORIGIN", "value": "https://app.example.com" },
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "S3_BUCKET", "value": "collab-attachments-prod" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:...:collab/DATABASE_URL" },
        { "name": "REDIS_URL",    "valueFrom": "arn:aws:secretsmanager:...:collab/REDIS_URL" },
        { "name": "JWT_ACCESS_SECRET",  "valueFrom": "arn:aws:secretsmanager:...:collab/JWT_ACCESS_SECRET" },
        { "name": "JWT_REFRESH_SECRET", "valueFrom": "arn:aws:secretsmanager:...:collab/JWT_REFRESH_SECRET" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/collab-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "server"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\""],
        "interval": 15,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

Register it and create the service:

```bash
aws ecs register-task-definition --cli-input-json file://taskdef.json
aws ecs create-service \
  --cluster collab-prod \
  --service-name collab-server \
  --task-definition collab-server \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-...],securityGroups=[sg-...],assignPublicIp=DISABLED}' \
  --load-balancers 'targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=server,containerPort=4000'
```

### ALB target group settings (important for websockets)

- **Protocol**: HTTP (TLS terminates at the ALB)
- **Stickiness**: optional. The Redis adapter handles cross-task fan-out,
  but sticky sessions reduce reconnect churn for long-lived clients.
- **Health check path**: `/health`
- **Deregistration delay**: `30s` is plenty.
- **Idle timeout (ALB)**: raise to `120s` so it comfortably exceeds the
  Socket.IO ping interval (25s) + ping timeout (20s).

## 7. Frontend on S3 + CloudFront

```bash
# Build with the production API URL baked in
VITE_API_URL=https://api.example.com VITE_WS_URL=wss://api.example.com \
  npm run build -w @collab/web

# Upload
aws s3 sync apps/web/dist s3://collab-web-prod --delete

# Invalidate the CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E... \
  --paths '/*'
```

CloudFront should:

- Treat `/index.html` as non-cacheable (the file already sets
  `Cache-Control: no-cache` via our nginx config in the docker image,
  but here we serve directly from S3 so set the response header policy).
- Forward no query strings or cookies to S3.
- Use the custom error response `403 → /index.html` so SPA routes work.

## 8. Secrets

Store the following in AWS Secrets Manager (or SSM Parameter Store with
`SecureString`) and reference them in the task definition:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`  (32+ random bytes)
- `JWT_REFRESH_SECRET` (32+ random bytes, different)
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` only if you opt not to
  use a task IAM role for S3 (preferred is a task role with inline policy).

## 9. Observability

- **Logs**: container stdout is captured via `awslogs` driver into
  CloudWatch Logs. Pino emits JSON in production so log filters are
  trivial.
- **Metrics**: enable Container Insights on the ECS cluster.
- **Alarms**: minimal recommended set —
  - CPUUtilization > 80% for 5 minutes
  - 5xx rate > 1% on the ALB target group
  - RDS FreeStorageSpace < 2 GB
  - ElastiCache Engine CPU > 80%

## 10. Cost rough-out (us-east-1, low traffic)

| Component                  | Approx. /month |
| -------------------------- | -------------: |
| 2× Fargate (0.5 vCPU, 1 GB) | ~$20           |
| RDS db.t4g.micro            | ~$13           |
| ElastiCache cache.t4g.micro | ~$12           |
| ALB                         | ~$16           |
| S3 + CloudFront (light)     | ~$1–5          |
| **Total**                   | **~$60–70**    |

For a portfolio deployment, you can stop the RDS/ElastiCache instances
when not in use to drop the bill significantly.

## 11. CI/CD (suggested)

A simple GitHub Actions pipeline (not included by default, but trivial
to add):

```
- npm ci
- npm run build
- npm run test -w @collab/server
- docker build -f apps/server/Dockerfile .
- docker push to ECR
- aws ecs update-service --force-new-deployment
- aws s3 sync apps/web/dist s3://collab-web-prod
- aws cloudfront create-invalidation ...
```

## 12. Tear-down

```bash
aws ecs update-service --cluster collab-prod --service collab-server --desired-count 0
aws ecs delete-service  --cluster collab-prod --service collab-server --force
aws ecs delete-cluster  --cluster collab-prod
aws rds delete-db-instance --db-instance-identifier collab-prod --skip-final-snapshot
aws elasticache delete-cache-cluster --cache-cluster-id collab-prod
aws s3 rb s3://collab-web-prod --force
aws s3 rb s3://collab-attachments-prod --force
```
