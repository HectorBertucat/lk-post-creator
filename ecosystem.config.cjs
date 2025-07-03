module.exports = {
  apps: [{
    name: 'lk-post-creator',
    script: 'src/server.js',
    cwd: '/var/www/lk-post-creator',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/lk-post-creator-error.log',
    out_file: '/var/log/pm2/lk-post-creator-out.log',
    log_file: '/var/log/pm2/lk-post-creator.log',
    time: true
  }]
};