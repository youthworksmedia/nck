import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  curriculumYearStorageValues,
  isCurrentCurriculumSection,
  isCurrentCurriculumYear,
  normalizeCurriculumSection,
  normalizeCurriculumYear
} from "@/lib/curriculum";
import { demoResources } from "@/lib/demo-data";
import { getStoredResourceFileSizes } from "@/lib/resource-assets";
import { hasSupabaseEnv } from "@/lib/public-env";
import { parseLessonResourcePayload } from "@/lib/lesson-resource-files";
import { withTiming } from "@/lib/timing";
import type { CurriculumTermNote, Resource } from "@/types";

export type { Resource, CurriculumTermNote };

function mapResourceRow(resource: Record<string, any>): Resource {
  const resourcePayload = parseLessonResourcePayload(resource.file_url, resource);

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    lessonNumber: resource.lesson_number ?? 1,
    scripture: resource.scripture ?? "",
    bigIdea: resourcePayload.bigIdea,
    podcastTitle: resourcePayload.podcastTitle,
    podcastLinks: resourcePayload.podcastLinks,
    yearCycle: normalizeCurriculumYear(resource.year_cycle),
    term: normalizeCurriculumSection(resource.term),
    musicAvailable: Boolean(resource.music_file_path || resource.music_file_name),
    worksheetAvailable: Boolean(resource.worksheet_file_path || resource.worksheet_file_name),
    manualAvailable: Boolean(resource.manual_file_path || resource.manual_file_name),
    musicFilePath: resource.music_file_path ?? "",
    worksheetFilePath: resource.worksheet_file_path ?? "",
    manualFilePath: resource.manual_file_path ?? "",
    musicFileName: resource.music_file_name ?? "",
    worksheetFileName: resource.worksheet_file_name ?? "",
    manualFileName: resource.manual_file_name ?? "",
    attachments: resourcePayload.files,
    preschoolAttachments: resourcePayload.preschoolFiles,
    publishDate: resource.publish_date,
    expiryDate: resource.expiry_date,
    status: resource.published ? "open" : "closed"
  };
}

function withAttachmentSizes(resource: Resource, sizeLookup: Map<string, number>): Resource {
  return {
    ...resource,
    attachments: resource.attachments?.map((attachment) => ({
      ...attachment,
      sizeBytes: attachment.sizeBytes ?? sizeLookup.get(attachment.filePath)
    })),
    preschoolAttachments: resource.preschoolAttachments?.map((attachment) => ({
      ...attachment,
      sizeBytes: attachment.sizeBytes ?? sizeLookup.get(attachment.filePath)
    }))
  };
}

async function getPublishedResourcesFromClient(
  resourcesClient: SupabaseClient<any, "public", any> | null
) {
  if (!resourcesClient) {
    return [];
  }

  const { data } = await withTiming("db.query", "resources.published", async () =>
    resourcesClient
      .from("resources")
      .select("*")
      .in("year_cycle", curriculumYearStorageValues("Volume 1"))
      .eq("published", true)
      .lte("publish_date", new Date().toISOString())
      .or(`expiry_date.is.null,expiry_date.gte.${new Date().toISOString()}`)
      .order("year_cycle", { ascending: true })
      .order("term", { ascending: true })
      .order("lesson_number", { ascending: true })
  );

  if (!data?.length) {
    return [];
  }

  const resources = data.map(mapResourceRow);
  const sizeLookup = await getStoredResourceFileSizes(
    resources.flatMap((resource) => [
      ...(resource.attachments?.map((attachment) => attachment.filePath) ?? []),
      ...(resource.preschoolAttachments?.map((attachment) => attachment.filePath) ?? [])
    ])
  );

  return resources.map((resource) => withAttachmentSizes(resource, sizeLookup));
}

async function getPublicResourcesFromDatabase() {
  if (!hasSupabaseEnv) {
    return demoResources;
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return demoResources;
  }

  return getPublishedResourcesFromClient(adminSupabase);
}

export const getCachedPublicResources = unstable_cache(
  getPublicResourcesFromDatabase,
  ["public-resources"],
  {
    revalidate: 300,
    tags: ["resources"]
  }
);

export async function getSampleResourceFromPublishedResources(): Promise<Resource | null> {
  const resources = await getCachedPublicResources();

  if (!resources.length) {
    return null;
  }

  const adminSupabase = createSupabaseAdminClient();

  if (adminSupabase) {
    const { data } = await adminSupabase
      .from("curriculum_settings")
      .select("value")
      .eq("key", "sample_lesson_resource_id")
      .limit(1)
      .maybeSingle();
    const configuredResource = resources.find((resource) => resource.id === data?.value);

    if (configuredResource) {
      return configuredResource;
    }
  }

  return resources[0] ?? null;
}
