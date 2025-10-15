import "dotenv/config";
import postgres from "postgres";
import { ProjectImageStorage } from "../server/objectStorage.js"; // adjust path if needed

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  transform: { undefined: null },
  onnotice: () => {},
  fetch_types: false,
});

await sql`SET statement_timeout = '10min'`;

const storage = new ProjectImageStorage();

type ProjectRow = {
  id: string;
  original_image_url: string | null;
  upscaled_image_url: string | null;
  mockup_image_url: string | null;
  mockup_images: Record<string, string> | null;
  resized_images: Array<{ size: string; url: string }> | null;
  metadata: Record<string, any> | null;
};

function isDataUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

function parseDataUrl(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  if (!mimeMatch) {
    throw new Error(`Unable to parse data URL header: ${header}`);
  }
  const mimeType = mimeMatch[1];
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

async function saveAsset(
  projectId: string,
  label: string,
  dataUrl: string,
  extraMeta: Record<string, any> = {}
) {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const { storagePath, publicUrl } = await storage.uploadAssetBuffer(
    buffer,
    projectId,
    `${label}.jpg`,
    mimeType
  );

  await sql`
    INSERT INTO project_assets (
      project_id, filename, mime_type, size, source, storage_path, public_url, metadata
    )
    VALUES (
      ${projectId},
      ${label},
      ${mimeType},
      ${buffer.length},
      ${label},
      ${storagePath},
      ${publicUrl},
      ${extraMeta}
    )
  `;

  return publicUrl;
}

async function migrateProject(project: ProjectRow) {
  const updates: Record<string, any> = {};
  const mockupImages: Record<string, string> = {};
  const resizedImages: Array<{ size: string; url: string }> = [];

  if (isDataUrl(project.original_image_url)) {
    updates.original_image_url = await saveAsset(
      project.id,
      "original",
      project.original_image_url,
      { kind: "original" }
    );
  }

  if (isDataUrl(project.upscaled_image_url)) {
    updates.upscaled_image_url = await saveAsset(
      project.id,
      "upscaled",
      project.upscaled_image_url,
      { kind: "upscaled" }
    );
  }

  if (isDataUrl(project.mockup_image_url)) {
    updates.mockup_image_url = await saveAsset(
      project.id,
      "mockup-preview",
      project.mockup_image_url,
      { kind: "mockup_preview" }
    );
  }

  const mockupPayload = project.mockup_images || {};
  for (const [key, value] of Object.entries(mockupPayload)) {
    if (isDataUrl(value)) {
      mockupImages[key] = await saveAsset(project.id, `mockup-${key}`, value, {
        kind: "mockup",
      });
    } else if (typeof value === "string") {
      mockupImages[key] = value;
    }
  }

  const resizedPayload = project.resized_images || [];
  for (const entry of resizedPayload) {
    if (isDataUrl(entry.url)) {
      const publicUrl = await saveAsset(
        project.id,
        `resized-${entry.size}`,
        entry.url,
        { kind: "resized", size: entry.size }
      );
      resizedImages.push({ size: entry.size, url: publicUrl });
    } else {
      resizedImages.push(entry);
    }
  }

  const metadata = project.metadata || {};
  const summary = metadata.summary || {};

  await sql`
    UPDATE projects
    SET
      original_image_url = ${updates.original_image_url ?? project.original_image_url},
      upscaled_image_url = ${updates.upscaled_image_url ?? project.upscaled_image_url},
      mockup_image_url  = ${updates.mockup_image_url ?? project.mockup_image_url},
      mockup_images     = ${JSON.stringify(mockupImages)},
      resized_images    = ${JSON.stringify(resizedImages)},
      metadata          = ${JSON.stringify({
        ...metadata,
        summary,
      })}
    WHERE id = ${project.id}
  `;
}

async function run() {
  const projects = await sql<ProjectRow[]>`
    SELECT
      id,
      original_image_url,
      upscaled_image_url,
      mockup_image_url,
      mockup_images,
      resized_images,
      metadata
    FROM projects
    WHERE
      original_image_url LIKE 'data:image/%'
      OR upscaled_image_url LIKE 'data:image/%'
      OR mockup_image_url LIKE 'data:image/%'
      OR (mockup_images::text LIKE '%data:image/%')
      OR (resized_images::text LIKE '%data:image/%')
  `;

  console.log(`Found ${projects.length} projects with inline images`);

  for (const project of projects) {
    console.log(`Migrating project ${project.id}`);
    await migrateProject(project);
  }

  await sql`ANALYZE projects`;
  await sql.end();
  console.log("Migration complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
