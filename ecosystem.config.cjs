module.exports = {
  apps: [
    {
      name: "visora-engine",
      script: "python",
      args: "engine/main.py",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        PYTHONUNBUFFERED: "1",
        VISORA_ENGINE_HOST: "0.0.0.0",
        VISORA_ENGINE_PORT: "8000",
      },
    },
    {
      name: "visora-server",
      script: "server/server.js",
      cwd: "./",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 6446,
      },
    },
  ],
};
