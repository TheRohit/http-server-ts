import * as net from "net";
import * as path from "path";
import { addRoute, handleApiHello, handleRequest } from "./router";
import { requestParser } from "./requestParser";
import { serveStaticFile } from "./staticFileHandler";

const PORT = 3000;
const HOST = "127.0.0.1";
const PATH_ROOT = path.join(__dirname, "../public");

addRoute("GET", "/api/hello", handleApiHello);

const server = net.createServer((socket) => {
  console.log(
    "Client Connected: " + socket.remoteAddress + ":" + socket.remotePort
  );

  let requestBuffer: Buffer = Buffer.alloc(0);

  socket.on("data", async (chunk) => {
    requestBuffer = Buffer.concat([requestBuffer, chunk]);

    const parseResult = requestParser(requestBuffer);

    if (!parseResult.request) {
      return;
    }

    const request = parseResult.request;

    const connectionHeader = request.headers["connection"];
    const shouldKeepAlive =
      request.httpVersion === "HTTP/1.1" &&
      connectionHeader !== undefined &&
      connectionHeader.toLowerCase() === "keep-alive";

    console.log("Method:", request.method);
    console.log("Path:", request.path);
    console.log("HTTP Version:", request.httpVersion);
    console.log("Headers:", request.headers);
    if (request.body) {
      console.log("Body:", request.body);
    }

    try {
      const routeHandled = await handleRequest(socket, request);

      if (!routeHandled) {
        await serveStaticFile(socket, request.path, {
          rootPath: PATH_ROOT,
          shouldKeepAlive,
        });
      }

      if (shouldKeepAlive) {
        requestBuffer = requestBuffer.subarray(parseResult.bytesConsumed);
      } else {
        requestBuffer = Buffer.alloc(0);
      }
    } catch (error) {
      console.error("Error handling request:", error);
      requestBuffer = Buffer.alloc(0);

      if (!socket.destroyed) {
        socket.destroy();
      }
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
