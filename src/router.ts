import * as net from "net";

interface RequestContext {
  method: string;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
}

type RequestHandler = (
  socket: net.Socket,
  context: RequestContext
) => Promise<void>;

export const routes: Map<string, RequestHandler> = new Map();

export function addRoute(
  method: string,
  path: string,
  handler: RequestHandler
) {
  routes.set(`${method} ${path}`, handler);
}

export const handleApiHello: RequestHandler = async (socket, context) => {
  const jsonResponse = {
    message: `Hello, ${context.path.substring(5) || "world"} from your API!`,
    timestamp: new Date().toISOString(),
  };
  const responseBody = JSON.stringify(jsonResponse);
  const contentLength = Buffer.byteLength(responseBody, "utf8");

  const headers = [
    "HTTP/1.1 200 OK",
    "Content-Type: application/json; charset=utf-8",
    `Content-Length: ${contentLength}`,
    "Connection: close",
    "Server: RohitHTTPServer/0.69",
    `Date: ${new Date().toUTCString()}`,
  ].join("\r\n");

  socket.write(`${headers}\r\n\r\n${responseBody}`);
  socket.end();
};
