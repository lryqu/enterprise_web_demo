#!/bin/sh
set -eu

node -e '
const net = require("node:net");
let attempts = 0;
function check() {
  const socket = net.createConnection({ host: "db", port: 5432 });
  socket.setTimeout(1000);
  socket.once("connect", () => { socket.end(); process.exit(0); });
  socket.once("error", retry);
  socket.once("timeout", () => { socket.destroy(); retry(); });
}
function retry() {
  attempts += 1;
  if (attempts >= 60) { console.error("PostgreSQL did not become available."); process.exit(1); }
  setTimeout(check, 1000);
}
check();
' 