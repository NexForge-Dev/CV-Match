import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { ProfileForm, SkillBank, type ProfileData } from "@/components/app/ProfileForms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.profile };
}

export default async function ProfilePage() {
  const { supabase } = await requireUser("/profile");
  const { t } = await getDictionary();
  const [{ data: profile }, { data: skills }] = await Promise.all([
    supabase.from("profiles").select("full_name, headline, location, target_locations, ui_locale, cv_language, cv_template").maybeSingle(),
    supabase.from("profile_skills").select("id, name, level").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />
      <ProfileForm
        initial={
          (profile as ProfileData | null) ?? { full_name: "", headline: "", location: "", target_locations: [], ui_locale: "pt", cv_language: "pt", cv_template: "modern" }
        }
      />
      <SkillBank initial={skills ?? []} />
    </div>
  );
}
