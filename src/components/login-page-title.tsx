"use client";

import { useEffect } from "react";

export function LoginPageTitle() {
  useEffect(() => {
    document.title = "Login";
  }, []);

  return null;
}
