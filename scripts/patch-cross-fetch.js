// Replace cross-fetch's node-ponyfill with a version that uses native globals.
// This ensures @libsql/hrana-client uses native fetch/Request on Cloudflare Workers
// instead of node-fetch (which creates incompatible Request objects).

const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "cross-fetch", "dist", "node-ponyfill.js");

const shim = `
var fetch = globalThis.fetch;
var Headers = globalThis.Headers;
var Request = globalThis.Request;
var Response = globalThis.Response;

module.exports = fetch;
module.exports.fetch = fetch;
module.exports.Headers = Headers;
module.exports.Request = Request;
module.exports.Response = Response;
module.exports.default = fetch;
`;

if (fs.existsSync(target)) {
  fs.writeFileSync(target, shim);
}
