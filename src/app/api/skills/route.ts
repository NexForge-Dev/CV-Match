import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";

const schema = z.object({ name: z.string().trim().min(1).max(80), level: z.string().trim().max(40).default("") });

export const POST = withUser(async (req, _ctx, { user, supabase }) => {
  const body = await parseJson(req, schema);
  const { data, error } = await supabase.from("profile_skills").insert({ user_id: user.id, ...body, confirmed: true }).select("id, name, level").single();
  if (error) throw error.code === "23505" ? new HttpError("conflict", "duplicate") : error;
  return NextResponse.json(data);
});
