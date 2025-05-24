import * as net from "net";
import * as path from "path";
import * as fs from "fs/promises";
import { mimeTypes } from "./config";
import {
  buildResponse,
  build404Response,
  build403Response,
  build500Response,
} from "./responseBuilder";

export interface StaticFileOptions {
  rootPath: string;
  shouldKeepAlive?: boolean;
  defaultFile?: string;
}

export async function serveStaticFile(
  socket: net.Socket,
  requestedPath: string,
  options: StaticFileOptions
): Promise<void> {
  const {
    rootPath,
    shouldKeepAlive = false,
    defaultFile = "index.html",
  } = options;

  let filePath = requestedPath;

  // Default to index.html for root requests
  if (filePath === "/") {
    filePath = `/${defaultFile}`;
  }

  try {
    // Security: Prevent directory traversal attacks
    const normalizedPath = path
      .normalize(filePath)
      .replace(/^(\.\.(\/|\\|$))+/, "");
    const resolvedFilePath = path.join(rootPath, normalizedPath);

    // Ensure the resolved path is within the root directory
    if (!resolvedFilePath.startsWith(rootPath + path.sep)) {
      build403Response(socket, { shouldKeepAlive });
      return;
    }

    // Check if file exists and is actually a file
    const stats = await fs.stat(resolvedFilePath);

    if (!stats.isFile()) {
      build404Response(socket, { shouldKeepAlive });
      return;
    }

    const fileContent = await fs.readFile(resolvedFilePath);
    const fileExtension = path.extname(resolvedFilePath).toLowerCase();
    const contentType = mimeTypes[fileExtension] || "application/octet-stream";

    buildResponse(socket, fileContent, contentType, { shouldKeepAlive });
  } catch (err: any) {
    console.error(`Error serving static file ${requestedPath}:`, err.message);

    if (err?.code === "ENOENT") {
      build404Response(socket, { shouldKeepAlive });
    } else {
      build500Response(socket, { shouldKeepAlive });
    }
  }
}

export function createStaticFileHandler(options: StaticFileOptions) {
  return async (
    socket: net.Socket,
    requestedPath: string,
    shouldKeepAlive = false
  ) => {
    await serveStaticFile(socket, requestedPath, {
      ...options,
      shouldKeepAlive,
    });
  };
}
