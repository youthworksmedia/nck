import type { Metadata } from "next";

import { buildPrivateMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPrivateMetadata({
  title: "Chat with Alfi",
  description: "Open the Alfi helper chat inside New Creation Kids."
});

export default function ChatbotPage() {
  return (
    <main className="site-shell section">
      <section className="panel">
        <span className="eyebrow">Chatbot</span>
        <h1>Chat with Alfi</h1>
        <p>
          This is the chatbot entry page. The floating helper now links here, and we can connect it
          to your real chatbot provider next.
        </p>
      </section>
    </main>
  );
}
