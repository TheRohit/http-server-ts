export interface HttpRequest {
  method: string;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  raw: {
    requestLine: string;
    headerLines: string[];
    fullHeaders: string;
  };
}

export interface ParseResult {
  request: HttpRequest | null;
  bytesConsumed: number;
}

export const requestParser = (buffer: Buffer): ParseResult => {
  const requestString = buffer.toString("utf-8");

  // Look for the end of headers
  const headerEndIndex = requestString.indexOf("\r\n\r\n");

  // If we haven't found the end of headers, the request is incomplete
  if (headerEndIndex === -1) {
    return {
      request: null,
      bytesConsumed: 0,
    };
  }

  const rawHeaders = requestString.substring(0, headerEndIndex);
  const body = requestString.substring(headerEndIndex + 4);

  const lines = rawHeaders.split("\r\n");
  const requestLine = lines[0]; // e.g., "GET /hello.html HTTP/1.1"
  const headerLines = lines.slice(1);

  // Parse request line
  const parts = requestLine.split(" ");
  if (parts.length < 3) {
    // Invalid request line
    return {
      request: null,
      bytesConsumed: 0,
    };
  }

  const method = parts[0];
  const path = parts[1];
  const httpVersion = parts[2];

  // Parse headers
  const headers: Record<string, string> = {};

  headerLines.forEach((line) => {
    if (line.trim() === "") return;

    const firstColonIdx = line.indexOf(":");
    if (firstColonIdx === -1) return;

    const key = line.substring(0, firstColonIdx).trim();
    const value = line.substring(firstColonIdx + 1).trim();
    headers[key.toLowerCase()] = value;
  });

  const request: HttpRequest = {
    method,
    path,
    httpVersion,
    headers,
    body,
    raw: {
      requestLine,
      headerLines,
      fullHeaders: rawHeaders,
    },
  };

  const bytesConsumed = headerEndIndex + 4 + Buffer.byteLength(body, "utf-8");

  return {
    request,
    bytesConsumed,
  };
};
