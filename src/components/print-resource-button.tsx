"use client";

import { Printer } from "lucide-react";

export function PrintResourceButton() {
  return (
    <button
      type="button"
      className="button button-secondary"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print page
    </button>
  );
}
