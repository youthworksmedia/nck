export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-shell footer">
      <p>
        All rights reserved &copy; {year} New Creation Kids
      </p>
    </footer>
  );
}
