import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { attachmentsApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  roomId: string;
  cardId: string;
  readOnly: boolean;
}

export function CardAttachments({ roomId, cardId, readOnly }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["attachments-status"],
    queryFn: attachmentsApi.status,
  });
  const listQuery = useQuery({
    queryKey: ["attachments", roomId, cardId],
    queryFn: () => attachmentsApi.list(roomId, cardId),
    enabled: Boolean(statusQuery.data?.enabled),
  });

  const download = useMutation({
    mutationFn: (id: string) => attachmentsApi.download(id),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => {
      toast.error((err as { message?: string }).message ?? "Could not download file");
    },
  });

  const upload = async (file: File): Promise<void> => {
    setUploading(true);
    try {
      const mimeType = file.type || "application/octet-stream";
      const presign = await attachmentsApi.presign({
        roomId,
        cardId,
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
      });
      const put = await fetch(presign.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!put.ok) throw new Error("Upload to storage failed");
      await attachmentsApi.confirm({
        roomId,
        cardId,
        key: presign.key,
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
      });
      await qc.invalidateQueries({ queryKey: ["attachments", roomId, cardId] });
      toast.success("File attached");
    } catch (err) {
      toast.error((err as { message?: string }).message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const enabled = statusQuery.data?.enabled === true;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Attachments</label>
        {enabled && !readOnly && (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Add file"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {!enabled ? (
        <p className="mt-1 text-xs text-slate-500">
          File uploads are off until an S3 bucket is configured.
        </p>
      ) : listQuery.isLoading ? (
        <div className="mt-2">
          <Spinner size="sm" />
        </div>
      ) : (listQuery.data?.attachments.length ?? 0) === 0 ? (
        <p className="mt-1 text-xs text-slate-500">No files on this card.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {listQuery.data?.attachments.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="max-w-full truncate text-sm text-brand-700 hover:underline"
                onClick={() => download.mutate(file.id)}
              >
                {file.filename}
              </button>
              <span className="ml-2 text-xs text-slate-400">
                {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
