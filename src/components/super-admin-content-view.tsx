import Link from "next/link";

import { AdminFileLibrary } from "@/components/admin-file-library";
import { AdminResourceForm } from "@/components/admin-resource-form";
import { AdminResourceList } from "@/components/admin-resource-list";
import { getAdminResources, getAdminTermNotes } from "@/lib/admin-access";
import { listStoredResourceFiles } from "@/lib/resource-assets";

export async function SuperAdminContentView({
  activeTab,
  activeYear,
  activeTerm
}: {
  activeTab: "library" | "add" | "files";
  activeYear: "Year A" | "Year B" | "Year C";
  activeTerm: "Term 1" | "Term 2" | "Term 3" | "Term 4";
}) {
  const [resources, files, termNotes] = await Promise.all([
    getAdminResources(),
    listStoredResourceFiles(),
    getAdminTermNotes()
  ]);

  return (
    <main className="site-shell section">
      <div className="section-head app-page-head">
        <div>
          <h1>Library manager</h1>
          <p>Add, edit, and remove content for the full member library.</p>
        </div>
      </div>

      <div className="admin-top-tabs" role="tablist" aria-label="Content manager tabs">
        <Link
          href="/content"
          className={`admin-top-tab ${activeTab === "library" ? "admin-top-tab-active" : ""}`}
        >
          Library
        </Link>
        <Link
          href="/content?tab=add"
          className={`admin-top-tab ${activeTab === "add" ? "admin-top-tab-active" : ""}`}
        >
          Add content
        </Link>
        <Link
          href="/content?tab=files"
          className={`admin-top-tab ${activeTab === "files" ? "admin-top-tab-active" : ""}`}
        >
          File library
        </Link>
      </div>

      {activeTab === "library" ? (
        <section className="panel">
          <div className="admin-year-tabs" role="tablist" aria-label="Curriculum year tabs">
            {(["Year A", "Year B", "Year C"] as const).map((year) => (
              <Link
                key={year}
                href={`/content?year=${encodeURIComponent(year)}`}
                className={`admin-year-tab ${activeYear === year ? "admin-year-tab-active" : ""}`}
              >
                {year}
              </Link>
            ))}
          </div>
          <h2>Library entries</h2>
          <p>Edit, reorder, or delete any curriculum lesson entry from here.</p>
          <AdminResourceList
            resources={resources}
            files={files}
            activeYear={activeYear}
            activeTerm={activeTerm}
            termNotes={termNotes}
          />
        </section>
      ) : activeTab === "add" ? (
        <section className="panel">
          <h2>Add library entry</h2>
          <p>Create content and assign each entry to a year cycle, term, scripture, and downloadable files.</p>
          <AdminResourceForm files={files} initialYearCycle={activeYear} initialTerm={activeTerm} />
        </section>
      ) : (
        <section className="panel">
          <h2>File library</h2>
          <p>Choose existing private files for lessons, upload new ones, or delete older files from here.</p>
          <AdminFileLibrary files={files} />
        </section>
      )}
    </main>
  );
}
