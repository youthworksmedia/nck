export function formatLessonContentHtml(html: string) {
  if (!html) {
    return "";
  }

  return html.replace(
    /^\s*<h2>\s*Lesson Title\s*\/\s*Theme:?\s*<\/h2>\s*<p>[\s\S]*?<\/p>\s*/i,
    ""
  );
}
