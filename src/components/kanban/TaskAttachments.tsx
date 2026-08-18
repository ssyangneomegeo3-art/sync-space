"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Paperclip, Trash2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAttachmentAction,
  getTaskAttachmentsAction,
  registerAttachmentAction,
} from "@/app/(dashboard)/workspace/[id]/actions";
import type { TaskAttachment } from "@/types/database";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const BUCKET = "task-files";

interface TaskAttachmentsProps {
  taskId: string;
  workspaceId: string;
  currentUserId: string;
}

interface AttachmentView extends TaskAttachment {
  url: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string | null): boolean {
  return Boolean(mime?.startsWith("image/"));
}

export default function TaskAttachments({
  taskId,
  workspaceId,
  currentUserId,
}: TaskAttachmentsProps): React.JSX.Element {
  const [files, setFiles] = useState<AttachmentView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(async () => {
    const result = await getTaskAttachmentsAction(taskId);
    const rows = result.attachments ?? [];
    const supabase = createClient();

    const withUrls = await Promise.all(
      rows.map(async (row) => {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(row.file_path, 3600);
        return { ...row, url: data?.signedUrl ?? null };
      })
    );

    setFiles(withUrls);
  }, [taskId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleUpload = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("파일은 5MB 이하만 올릴 수 있습니다.");
      return;
    }

    const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const filePath = `${workspaceId}/${taskId}/${crypto.randomUUID()}/${safeName}`;
    setIsUploading(true);

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      setIsUploading(false);
      setError(
        uploadError.message.includes("Bucket not found")
          ? "저장소 버킷이 없습니다. day27-storage.sql 을 실행해 주세요."
          : uploadError.message
      );
      return;
    }

    const result = await registerAttachmentAction({
      taskId,
      workspaceId,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type || null,
    });

    setIsUploading(false);

    if (!result.success) {
      await supabase.storage.from(BUCKET).remove([filePath]);
      setError(result.error || "첨부 등록에 실패했습니다.");
      return;
    }

    await loadFiles();
  };

  const handleDelete = (attachment: AttachmentView) => {
    if (!window.confirm(`"${attachment.file_name}" 파일을 삭제할까요?`)) return;
    startTransition(async () => {
      const result = await deleteAttachmentAction(attachment.id, workspaceId);
      if (!result.success) {
        setError(result.error || "삭제에 실패했습니다.");
        return;
      }
      setFiles((prev) => prev.filter((item) => item.id !== attachment.id));
    });
  };

  return (
    <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            첨부 파일 ({files.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          올리기
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void handleUpload(file);
            }
          }}
        />
      </div>

      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {files.length === 0 ? (
        <p className="text-xs text-zinc-400">아직 첨부된 파일이 없습니다. 이미지나 PDF를 올려 보세요.</p>
      ) : (
        <ul className="max-h-40 space-y-2 overflow-y-auto">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
            >
              <div className="flex min-w-0 items-center gap-2">
                {isImage(file.mime_type) && file.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.file_name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0 text-zinc-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {file.file_name}
                  </p>
                  <p className="text-[10px] text-zinc-400">{formatSize(file.file_size)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 text-zinc-400 hover:text-indigo-600"
                    title="열기 / 받기"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  disabled={isPending}
                  className="rounded p-1 text-zinc-400 hover:text-red-500"
                  title="삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
