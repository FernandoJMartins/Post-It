#!/bin/sh
set -e

# Aplica migrations pendentes no boot (idempotente). Sem tabelas -> cria tudo.
echo "[entrypoint] aplicando migrations..."
node node_modules/prisma/build/index.js migrate deploy

# Next standalone escuta em process.env.HOSTNAME; o Docker sobrescreve HOSTNAME
# com o ID do container em runtime, impedindo o proxy de alcançar o app.
echo "[entrypoint] iniciando servidor..."
exec env HOSTNAME=0.0.0.0 node server.js
