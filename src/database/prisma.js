require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");

// Uma única instância por processo; nunca abrir um pool por requisição.
const url = new URL(process.env.DATABASE_URL);
if (!url.searchParams.has("connection_limit"))
  url.searchParams.set("connection_limit", "5");
if (!url.searchParams.has("connect_timeout"))
  url.searchParams.set("connect_timeout", "15");
if (!url.searchParams.has("pool_timeout"))
  url.searchParams.set("pool_timeout", "15");
module.exports = new PrismaClient({
  datasources: { db: { url: url.toString() } },
});
