export function VideoUpload({
  fileName,
  previewUrl,
  onFile,
}: {
  fileName: string;
  previewUrl: string;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-3">
      {previewUrl ? (
        <video
          src={previewUrl}
          controls
          playsInline
          className="aspect-video w-full bg-ink"
        />
      ) : null}
      <label className="grid cursor-pointer gap-1 border border-dashed border-border bg-background px-4 py-8 text-center">
        <span className="font-medium">
          {previewUrl ? "Replace video" : "Drop a video, or browse"}
        </span>
        <span className="text-sm break-all text-muted-foreground">
          {fileName || "No file yet"}
        </span>
        <input
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onFile(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
