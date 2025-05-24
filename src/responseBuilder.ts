import * as net from "net";

export interface ResponseOptions {
  statusCode?: number;
  statusText?: string;
  headers?: Record<string, string>;
  shouldKeepAlive?: boolean;
}

export function buildResponse(
  socket: net.Socket,
  body: string | Buffer,
  contentType: string,
  options: ResponseOptions = {}
): void {
  const {
    statusCode = 200,
    statusText = "OK",
    headers = {},
    shouldKeepAlive = false,
  } = options;

  const contentLength = Buffer.isBuffer(body)
    ? body.length
    : Buffer.byteLength(body.toString(), "utf8");

  const connectionHeader = shouldKeepAlive ? "keep-alive" : "close";

  const responseHeaders = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    `Content-Type: ${contentType}${
      contentType.startsWith("text/") ? "; charset=utf-8" : ""
    }`,
    `Content-Length: ${contentLength}`,
    `Connection: ${connectionHeader}`,
    "Server: RohitHTTPServer/0.69",
    `Date: ${new Date().toUTCString()}`,
    ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
  ].join("\r\n");

  const fullResponse = `${responseHeaders}\r\n\r\n`;

  socket.write(fullResponse);
  if (body) {
    socket.write(body);
  }

  if (!shouldKeepAlive) {
    socket.end();
  }
}

export function buildHtmlResponse(
  socket: net.Socket,
  html: string,
  options: ResponseOptions = {}
): void {
  buildResponse(socket, html, "text/html", options);
}

export function buildJsonResponse(
  socket: net.Socket,
  data: any,
  options: ResponseOptions = {}
): void {
  const jsonBody = JSON.stringify(data);
  buildResponse(socket, jsonBody, "application/json", options);
}

export function buildErrorResponse(
  socket: net.Socket,
  statusCode: number,
  statusText: string,
  message?: string,
  options: ResponseOptions = {}
): void {
  const errorHtml = `<h1>${statusCode} ${statusText}</h1>${
    message ? `<p>${message}</p>` : ""
  }`;

  buildResponse(socket, errorHtml, "text/html", {
    ...options,
    statusCode,
    statusText,
  });
}

export function build404Response(
  socket: net.Socket,
  options: ResponseOptions = {}
): void {
  buildErrorResponse(
    socket,
    404,
    "Not Found",
    "The requested URL was not found on this server.",
    options
  );
}

export function build403Response(
  socket: net.Socket,
  options: ResponseOptions = {}
): void {
  buildErrorResponse(
    socket,
    403,
    "Forbidden",
    "Access to the requested resource is forbidden.",
    options
  );
}

export function build500Response(
  socket: net.Socket,
  options: ResponseOptions = {}
): void {
  buildErrorResponse(
    socket,
    500,
    "Internal Server Error",
    "Something went wrong on the server.",
    options
  );
}
