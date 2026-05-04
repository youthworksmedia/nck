import { NextResponse } from "next/server";

import { resetSuperAdminPassword } from "@/lib/super-admin-reset";

export async function POST() {
  const result = await resetSuperAdminPassword();

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Super admin password reset successfully.",
    email: result.email,
    password: result.password
  });
}
