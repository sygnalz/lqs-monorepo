module.exports = {
  apps: [
    {
      name: 'lqs-client-ui',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/user/lqs-monorepo/apps/client-ui',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}