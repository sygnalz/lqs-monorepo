module.exports = {
  apps: [
    {
      name: 'lqs-uat-worker',
      script: 'npx',
      args: 'wrangler dev --port 8788 --ip 0.0.0.0',
      cwd: '/home/user/lqs-monorepo/apps/lqs-uat-worker',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}