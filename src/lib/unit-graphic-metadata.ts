export function getUnitGraphicExtensionLabel(fileName?: string | null) {
  const extension = fileName?.split(".").pop()?.trim().toUpperCase();

  return extension && extension !== fileName?.toUpperCase() ? extension : "File";
}

export function getUnitGraphicIcon(fileName?: string | null) {
  const extension = getUnitGraphicExtensionLabel(fileName).toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
    return "🖼️";
  }

  if (extension === "pdf") {
    return "📄";
  }

  if (["zip", "rar", "7z"].includes(extension)) {
    return "🗜️";
  }

  if (["mp4", "mov", "webm"].includes(extension)) {
    return "🎬";
  }

  if (["ppt", "pptx", "key"].includes(extension)) {
    return "📊";
  }

  if (["doc", "docx"].includes(extension)) {
    return "📝";
  }

  return "📎";
}
