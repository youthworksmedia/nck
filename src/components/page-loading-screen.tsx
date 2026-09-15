type PageLoadingScreenProps = {
  secondsLabel?: string | null;
};

export function PageLoadingScreen({ secondsLabel }: PageLoadingScreenProps) {
  return (
    <main className="site-shell section account-page page-loading-screen">
      <section className="page-loading-card" aria-live="polite" aria-busy="true">
        <span className="page-loading-spinner" aria-hidden="true" />
        <p>Page is loading</p>
        {secondsLabel ? <small>{secondsLabel}</small> : null}
      </section>
    </main>
  );
}
