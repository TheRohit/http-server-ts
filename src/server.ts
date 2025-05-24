import * as net from "net";

const PORT = 3000;
const HOST = "127.0.0.1";

const bodyContent = `<!DOCTYPE html>
<html>
<head><title>My HTTP Server</title></head>
<body><h1>Hello bruh</h1></body>
</html>`;

const server = net.createServer((socket) => {
  console.log(
    "Cilent Connected: " + socket.remoteAddress + ":" + socket.remotePort
  );
  //create empty buffer
  let requestBuffer: Buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
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
      const path = parts[1];
      const httpVersion = parts[2];

      //parse headers
      const headers: { [key: string]: string } = {};

      headerLines.forEach((line) => {
        if (line.trim() === "") return;

        const firstColonIdx = line.indexOf(":");
        const key = line.substring(0, firstColonIdx).trim();
        const value = line.substring(firstColonIdx + 1).trim();
        headers[key] = value;
      });

      console.log("\n--- Parsed Request ---");
      console.log("Method:", method);
      console.log("Path:", path);
      console.log("HTTP Version:", httpVersion);
      console.log("Headers:", headers);

      if (body) {
        console.log("Body:", body);
      }
    }

    const contentLength = Buffer.byteLength(bodyContent, "utf8");
    const date = new Date().toUTCString();

    const responseHeaders = [
      "HTTP/1.1 200 OK",
      "Content-Type: text/html; charset=utf-8",
      `Content-Length: ${contentLength}`,
      "Connection: close",
      "Server: RohitHTTPServer/1.0",
      `Date: ${date}`,
    ].join("\r\n");

    const fullResponse = `${responseHeaders}\r\n\r\n${bodyContent}`;

    socket.write(fullResponse);

    socket.end();
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
