import * as net from "net";
import { buildJsonResponse } from "./responseBuilder";
import { HttpRequest } from "./requestParser";

export interface RequestContext {
  method: string;
  path: string;
  httpVersion: string;
  headers: Record<string, string>;
}

export type RequestHandler = (
  socket: net.Socket,
  context: RequestContext
) => Promise<void>;

export class Router {
  private routes: Map<string, RequestHandler> = new Map();

  addRoute(method: string, path: string, handler: RequestHandler): void {
    this.routes.set(`${method} ${path}`, handler);
  }

  findRoute(method: string, path: string): RequestHandler | undefined {
    return this.routes.get(`${method} ${path}`);
  }

  async handleRequest(
    socket: net.Socket,
    request: HttpRequest
  ): Promise<boolean> {
    const routeKey = `${request.method} ${request.path}`;
    const handler = this.routes.get(routeKey);

    if (handler) {
      console.log(`Matched API route: ${routeKey}`);
      await handler(socket, {
        method: request.method,
        path: request.path,
        httpVersion: request.httpVersion,
        headers: request.headers,
      });
      return true;
    }

    return false;
  }

  getAllRoutes(): Array<{ method: string; path: string }> {
    return Array.from(this.routes.keys()).map((key) => {
      const [method, path] = key.split(" ", 2);
      return { method, path };
    });
  }
}

export const router = new Router();

export const routes = router["routes"];
export const addRoute = router.addRoute.bind(router);

export const handleApiHello: RequestHandler = async (socket, context) => {
  const jsonResponse = {
    message: `Hello, ${context.path.substring(5) || "world"} from your API!`,
    timestamp: new Date().toISOString(),
  };

  buildJsonResponse(socket, jsonResponse, { shouldKeepAlive: false });
};
