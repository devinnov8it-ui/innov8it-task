"use client";

import { useState } from "react";
import { updateProfile, uploadAvatar as uploadAvatarAction } from "@/features/auth/actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatar,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialAvatar: string;
}) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadAvatar(file: File) {
    setError("");
    if (typeof file.type !== "string" || !file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadAvatarAction(form);
      if (!result?.url) {
        setError(result?.error || "Unable to upload the picture.");
        return;
      }
      setAvatar(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We could not connect to image storage. Check your Supabase configuration and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={updateProfile} className="space-y-4">
      <div className="flex items-center gap-4">
        {avatar ? (
          <div role="img" aria-label="Profile preview" className="size-16 rounded-full border bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(avatar)})` }} />
        ) : (
          <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {initialName.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <label className="space-y-2">
          <span className="block text-sm font-medium">Profile picture</span>
          <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="block max-w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium" />
          <span className="block text-xs text-muted-foreground">PNG, JPG, GIF, or WebP up to 5 MB.</span>
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <input type="hidden" name="avatar" value={avatar} readOnly />
      <label className="block space-y-2"><span className="text-sm font-medium">Nickname</span><input name="name" defaultValue={initialName} required maxLength={100} className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">Email address</span><input value={email} readOnly className="min-h-11 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground" /></label>
      <div className="flex justify-end"><button type="submit" disabled={uploading} className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{uploading ? "Uploading picture..." : "Save profile"}</button></div>
    </form>
  );
}