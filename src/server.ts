import * as net from "net";

const PORT = 3000;
const HOST = "127.0.0.1";

const server = net.createServer((socket) => {
  console.log(
    "Cilent Connected: " + socket.remoteAddress + ":" + socket.remotePort
  );

  socket.on("data", (data) => {
    console.log(
      `Received data from client ${socket.remoteAddress}:${
        socket.remotePort
      }: ${data.toString().trim()} `
    );

    socket.write("hello broooo");
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

server.on("close", () => {
  console.log("Server is closed.");
});
