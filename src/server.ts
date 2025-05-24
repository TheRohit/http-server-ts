import * as net from "net";
import * as path from "path";
import * as fs from "fs/promises";
import { mimeTypes } from "./config";
import { addRoute, handleApiHello, routes } from "./router";

const PORT = 3000;
const HOST = "127.0.0.1";
const PATH_ROOT = path.join(__dirname, "../public");

addRoute("GET", "/api/hello", handleApiHello);

const server = net.createServer((socket) => {
  console.log(
    "Cilent Connected: " + socket.remoteAddress + ":" + socket.remotePort
  );
  //create empty buffer
  let requestBuffer: Buffer = Buffer.alloc(0);

  socket.on("data", async (chunk) => {
    requestBuffer = Buffer.concat([requestBuffer, chunk]);

    const requestString = requestBuffer.toString("utf-8");

    const headerEndIndex = requestString.indexOf("\r\n\r\n");

    if (headerEndIndex !== -1) {
      const rawHeaders = requestString.substring(0, headerEndIndex);
      const body = requestString.substring(headerEndIndex + 4);

      //split raw headers

      const lines = rawHeaders.split("\r\n"); //Host: localhost:3000\r\n
      const requestLine = lines[0]; //GET /hello.html HTTP/1.1
      const headerLines = lines.slice(1);

      //parse req line

      const parts = requestLine.split(" ");
      const method = parts[0];
      let requestedFilePath = parts[1];
      const httpVersion = parts[2];

      //parse headers
      const headers: { [key: string]: string } = {};

      headerLines.forEach((line) => {
        if (line.trim() === "") return;

        const firstColonIdx = line.indexOf(":");
        const key = line.substring(0, firstColonIdx).trim();
        const value = line.substring(firstColonIdx + 1).trim();
        headers[key.toLowerCase()] = value;
      });

      const connectionHeader = headers["connection"];
      const shouldKeepAlive =
        httpVersion === "HTTP/1.1" &&
        connectionHeader &&
        connectionHeader.toLowerCase() === "keep-alive";

      console.log("Method:", method);
      console.log("Path:", requestedFilePath);
      console.log("HTTP Version:", httpVersion);
      console.log("Headers:", headers);
      if (body) {
        console.log(body);
      }

      const routeKey = `${method} ${requestedFilePath}`;
      const handler = routes.get(routeKey);
      if (handler) {
        console.log(`Matched API route: ${routeKey}`);
        await handler(socket, {
          method,
          path: requestedFilePath,
          httpVersion,
          headers,
        });
        requestBuffer = Buffer.alloc(0); //reset buffer and we are done with the req
        return;
      }

      //response

      let statusCode = 200;
      let statusText = "OK";
      let contentType = "application/octet-stream"; //defaulting to unknown
      let responseBody: Buffer | string = "";

      try {
        if (requestedFilePath === "/") {
          requestedFilePath = "/index.html";
        }

        //security: Prevent directory traversal (e.g., requesting '../../secret.txt')
        const normalizedPath = path
          .normalize(requestedFilePath)
          .replace(/^(\.\.(\/|\\|$))+/, "");
        const filePath = path.join(PATH_ROOT, normalizedPath);

        //ensure resolved path is within PATH_ROOT

        if (!filePath.startsWith(PATH_ROOT + path.sep)) {
          statusCode = 403;
          statusText = "Forbidden";
          contentType = "text/html";
          responseBody =
            "<h1>403 Forbidden</h1><p>Access to the requested resource is forbidden.</p>";
          throw new Error("Forbidden path access attempt");
        }

        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
          statusCode = 404;
          statusText = "Not Found";
          contentType = "text/html";
          responseBody =
            "<h1>404 Not Found</h1><p>The requested file was not found or is a directory.</p>";
          throw new Error("Not a file or directory");
        }

        responseBody = await fs.readFile(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();

        contentType = mimeTypes[fileExtension] || "application/octet-stream";
      } catch (err: any) {
        if (err?.code === "ENOENT") {
          statusCode = 404;
          statusText = "Not Found";
          contentType = "text/html";
          responseBody =
            "<h1>404 Not Found</h1><p>The requested URL was not found on this server.</p>";
        } else if (statusCode !== 403) {
          // If it wasn't a forbidden path error
          statusCode = 500;
          statusText = "Internal Server Error";
          contentType = "text/html";
          responseBody =
            "<h1>500 Internal Server Error</h1><p>Something went wrong on the server.</p>";
          console.error(`Error serving ${requestedFilePath}:`, err.message);
        }
      } finally {
        const connectionControlHeader = shouldKeepAlive
          ? "keep-alive"
          : "close";

        const contentLength = Buffer.isBuffer(responseBody)
          ? responseBody.length
          : Buffer.byteLength(responseBody.toString(), "utf8");

        const date = new Date().toUTCString();

        const responseHeaders = [
          `HTTP/1.1 ${statusCode} ${statusText}`,
          `Content-Type: ${contentType}${
            contentType.startsWith("text/") ? "; charset=utf-8" : ""
          }`,
          `Content-Length: ${contentLength}`,
          `Connection: ${connectionControlHeader}`,
          "Server: RohitHTTPServer/0.69",
          `Date: ${date}`,
        ].join("\r\n");

        const fullResponse = `${responseHeaders}\r\n\r\n`;

        socket.write(fullResponse);
        if (responseBody) {
          socket.write(responseBody);
        }
        if (!shouldKeepAlive) {
          socket.end();
        } else {
          requestBuffer = Buffer.alloc(0);
          if (headerEndIndex + 4 < requestBuffer.length) {
            // If there's data left *after* the current request's headers and body,
            // it means it's part of the next request.
            requestBuffer = requestBuffer.subarray(headerEndIndex + 4);
          } else {
            requestBuffer = Buffer.alloc(0); // No residual data, clear entirely
          }
        }
      }

      requestBuffer = Buffer.alloc(0);
    }
  });

  socket.on("end", () => {
    console.log(
      `Client disconnected (graceful end): ${socket.remoteAddress}:${socket.remotePort}`
    );
  });

  socket.on("close", (hadError) => {
    console.log(
      `Client connection closed: ${socket.remoteAddress}:${socket.remotePort}` +
        (hadError ? " with error." : ".")
    );
  });

  socket.on("error", (err) => {
    console.error(
      `Socket error for ${socket.remoteAddress}:${socket.remotePort}:`,
      err.message
    );
    socket.destroy();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Server error:", err.message);
  }
});

server.on("close", () => {
  console.log("Server is closed.");
});
