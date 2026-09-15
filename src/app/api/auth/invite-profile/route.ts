import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2)
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  if (!payload.success) {
    return NextResponse.json({ message: "Enter your name." }, { status: 400 });
  }

  if (!supabase || !adminSupabase) {
    return NextResponse.json({ message: "Supabase is not configured." }, { status: 400 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ message: "You must be signed in." }, { status: 401 });
  }

  const nextName = payload.data.name.trim();
  const lowerEmail = user.email.toLowerCase();
  const membershipUpdate: Record<string, string | null> = {
    display_name: nextName,
    user_id: user.id
  };

  while (true) {
    const { error } = await adminSupabase
      .from("organization_members")
      .update(membershipUpdate)
      .eq("invitation_email", lowerEmail);

    if (!error) {
      break;
    }

    const missingColumn = error.message.match(/Could not find the '([^']+)' column/i)?.[1];

    if (missingColumn && missingColumn in membershipUpdate) {
      delete membershipUpdate[missingColumn];
      continue;
    }

    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Your name has been saved." });
}
