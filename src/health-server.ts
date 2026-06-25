import * as http from 'http';

/**
 * Minimal health endpoint for Render.com web services.
 *
 * Render free web services require a listening port. This server answers
 * health checks while the agent process runs separately.
 */
const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', agent: 'croo-contractor-agent' }));
});

server.listen(PORT, () => {
  console.log(`[health] listening on port ${PORT}`);
});
