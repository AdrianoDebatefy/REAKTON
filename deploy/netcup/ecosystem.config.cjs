module.exports = {
  apps: [
    {
      name: "reakton",
      cwd: "/var/www/reakton",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
      },
    },
  ],
};
