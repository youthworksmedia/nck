import {
  getCachedPublicResources,
  getSampleResourceFromPublishedResources,
  type Resource
} from "@/lib/portal-resource-data";

export async function getPublicResources(): Promise<Resource[]> {
  return getCachedPublicResources();
}

export async function getPublicSampleResource() {
  return getSampleResourceFromPublishedResources();
}
