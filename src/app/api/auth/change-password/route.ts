import { NextResponse } from "next/server";
import { z } from "zod";

import { isStrongPassword, passwordRequirementText } from "@/lib/password";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  password: z.string().refine(isStrongPassword, passwordRequirementText)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const payload = schema.safeParse(await request.json());

  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured." }, { status: 400 });
  }

  if (!payload.success) {
    return NextResponse.json(
      { message: passwordRequirementText },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.data.password
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Your password has been updated." });
}
