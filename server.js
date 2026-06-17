const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({
      mt_listings: null,
      mt_users: [],
      mt_favorites: [],
      mt_compare: [],
      mt_messages: []
    }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeStaticPath(urlPath) {
  const requested = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = requested === "/" ? path.join(root, "index.html") : path.join(root, requested);
  const normalized = path.normalize(filePath);
  return normalized.startsWith(root) ? normalized : null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/state" && req.method === "GET") {
      return sendJson(res, 200, readDb());
    }

    if (req.url === "/api/state" && req.method === "PUT") {
      const body = await readBody(req);
      const next = JSON.parse(body || "{}");
      writeDb({
        mt_listings: next.mt_listings ?? [],
        mt_users: next.mt_users ?? [],
        mt_favorites: next.mt_favorites ?? [],
        mt_compare: next.mt_compare ?? [],
        mt_messages: next.mt_messages ?? []
      });
      return sendJson(res, 200, { ok: true });
    }

    const filePath = safeStaticPath(req.url);
    if (!filePath) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
      res.end(content);
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Motor Traders Uganda running on http://localhost:${port}`);
});
