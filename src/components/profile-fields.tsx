"use client";

import { YEAR_OPTIONS, type Profile } from "@/lib/constants";
import { suggestColleges, suggestMajors } from "@/lib/actions";
import { SuggestInput } from "@/components/suggest-input";

export function ProfileFields({ profile }: { profile: Profile | null }) {
  return (
    <div className="grid gap-4">
      <label className="block text-sm font-medium">
        Name
        <input
          name="full_name"
          required
          maxLength={120}
          defaultValue={profile?.full_name ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal outline-none focus:border-request"
        />
      </label>
      <SuggestInput
        name="college"
        label="College"
        required
        maxLength={160}
        defaultValue={profile?.college ?? ""}
        suggest={suggestColleges}
      />
      <SuggestInput
        name="major"
        label="Major"
        required
        maxLength={160}
        defaultValue={profile?.major ?? ""}
        suggest={suggestMajors}
      />
      <label className="block text-sm font-medium">
        Year
        <select
          name="year"
          required
          defaultValue={profile?.year ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal outline-none focus:border-request"
        >
          <option value="">Choose a year</option>
          {YEAR_OPTIONS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Bio
        <textarea
          name="bio"
          required
          maxLength={2000}
          rows={4}
          defaultValue={profile?.bio ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal outline-none focus:border-request"
        />
      </label>
    </div>
  );
}
