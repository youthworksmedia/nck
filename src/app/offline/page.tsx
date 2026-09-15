import Image from "next/image";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section className="offline-message" aria-labelledby="offline-heading">
        <Image
          src="/nck-logo.png"
          alt="New Creation Kids"
          width={160}
          height={160}
          priority
          className="offline-logo"
        />
        <div>
          <h1 id="offline-heading">Offline</h1>
          <p>We’re currently working behind the scenes on something exciting.</p>
          <p>
            Our website is temporarily offline while we make a few improvements, but we’ll be back very soon
            with a fresh new experience.
          </p>
          <p>Thank you for your patience and support.</p>
        </div>
      </section>
    </main>
  );
}
