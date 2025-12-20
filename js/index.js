// Minimal Express server that serves the static front-end and proxies audio downloads.
import express from "express";
import { Readable, pipeline } from "node:stream";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 3000;
// Promisified pipeline so we can await streaming completion/error.
const streamPipeline = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve the built assets from the repo root.
const PUBLIC_DIR = __dirname;

// Only allow http/https targets; prevents file:/ and other schemes.
const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (err) {
    return false;
  }
};

// Pick a download filename from content-disposition if present; otherwise from URL path.
const buildFilename = (fileUrl, response) => {
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const hinted = match?.[1] || match?.[2];
  if (hinted) {
    try {
      return decodeURIComponent(hinted);
    } catch (err) {
      return hinted;
    }
  }

  try {
    const pathname = new URL(fileUrl).pathname;
    const fallback = pathname.split("/").filter(Boolean).pop() || "download.bin";
    return decodeURIComponent(fallback);
  } catch (err) {
    return "download.bin";
  }
};

app.use(express.static(PUBLIC_DIR));

app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/download", async (req, res) => {
  // Validate incoming URL to avoid proxy misuse.
  const fileUrl = req.query.url;
  if (!fileUrl || typeof fileUrl !== "string" || !isValidHttpUrl(fileUrl)) {
    return res.status(400).send("Invalid or missing file URL");
  }

  // Abort upstream fetch if it stalls beyond 15s.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let upstream;
  try {
    upstream = await fetch(fileUrl, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    const status = err.name === "AbortError" ? 504 : 502;
    return res.status(status).send("Failed to reach source");
  }

  clearTimeout(timeoutId);

  // Bail out if origin responds with error or no stream.
  if (!upstream.ok || !upstream.body) {
    return res
      .status(upstream.status || 502)
      .send("Failed to fetch file");
  }

  const filename = buildFilename(fileUrl, upstream);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.setHeader(
    "Content-Type",
    upstream.headers.get("content-type") || "application/octet-stream"
  );

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }

  try {
    // Convert the web ReadableStream from fetch into a Node.js readable and pipe it to the response.
    await streamPipeline(Readable.fromWeb(upstream.body), res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send("Error streaming file");
    } else {
      res.destroy(err);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
