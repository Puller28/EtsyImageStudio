import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import fs from "fs";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // fall through to index.html if the file doesn't exist - WITH CANONICAL URL PROCESSING
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");

    // Read the HTML file and process canonical URLs
    fs.readFile(indexPath, 'utf-8', (err, html) => {
      if (err) {
        console.error('Error reading index.html:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Generate correct canonical URL for this specific page
      let pathClean = req.path.split('?')[0].split('#')[0];
      pathClean = pathClean.replace(/\/+$/, '');
      if (pathClean === '') pathClean = '/';
      if (pathClean === '/home') pathClean = '/';

      const canonicalUrl = `https://imageupscaler.app${pathClean === '/' ? '' : pathClean}`;
      const isArticlePage = pathClean.startsWith('/blog/') && pathClean !== '/blog';
      const ogType = isArticlePage ? 'article' : 'website';

      console.log(`🔍 CANONICAL: Processing ${pathClean} → ${canonicalUrl} (${ogType})`);

      // Replace canonical URLs in the HTML
      let processedHtml = html;
      processedHtml = processedHtml.replace(
        '<link rel="canonical" href="https://imageupscaler.app/" id="canonical-url" />',
        `<link rel="canonical" href="${canonicalUrl}" id="canonical-url" />`
      );
      processedHtml = processedHtml.replace(
        '<meta property="og:url" content="https://imageupscaler.app/" id="og-url" />',
        `<meta property="og:url" content="${canonicalUrl}" id="og-url" />`
      );
      processedHtml = processedHtml.replace(
        '<meta property="og:type" content="website" id="og-type" />',
        `<meta property="og:type" content="${ogType}" id="og-type" />`
      );

      console.log(`✅ CANONICAL: Set to ${canonicalUrl}`);

      res.set('Content-Type', 'text/html');
      res.send(processedHtml);
    });
  });
}
