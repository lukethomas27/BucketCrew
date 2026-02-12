"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import type { BucketFile, FileTag } from "@/types";
import { formatFileSize, formatDate } from "@/lib/utils";
import {
  Upload,
  Trash2,
  Search,
  Sparkles,
  X,
  Plus,
  FileIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TAG_OPTIONS: { label: FileTag; color: string; bg: string }[] = [
  { label: "Sales", color: "text-blue-700", bg: "bg-blue-100" },
  { label: "Ops", color: "text-green-700", bg: "bg-green-100" },
  { label: "Finance", color: "text-yellow-700", bg: "bg-yellow-100" },
  { label: "Marketing", color: "text-purple-700", bg: "bg-purple-100" },
  { label: "Website", color: "text-pink-700", bg: "bg-pink-100" },
];

function getTagStyle(tag: string) {
  const found = TAG_OPTIONS.find(
    (t) => t.label.toLowerCase() === tag.toLowerCase()
  );
  return found ?? { label: tag, color: "text-gray-700", bg: "bg-gray-100" };
}

export default function BucketPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<BucketFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<FileTag | null>(null);
  const [tagEditFileId, setTagEditFileId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Get workspace and files on mount
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!workspace) {
        setLoading(false);
        return;
      }

      setWorkspaceId(workspace.id);

      const { data: filesData } = await supabase
        .from("files")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });

      setFiles((filesData as BucketFile[]) ?? []);
      setLoading(false);
    }

    init();
  }, [supabase]);

  // Upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!workspaceId || acceptedFiles.length === 0) return;

      setUploading(true);
      setUploadProgress(`Uploading ${acceptedFiles.length} file(s)...`);

      try {
        for (const file of acceptedFiles) {
          setUploadProgress(`Uploading ${file.name}...`);

          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(
            `/api/workspaces/${workspaceId}/files/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to upload ${file.name}`);
          }

          const uploaded = await res.json();
          setFiles((prev) => [uploaded, ...prev]);
        }

        setUploadProgress(null);
      } catch (err: any) {
        setUploadProgress(null);
        alert(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [workspaceId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
  });

  // Delete handler
  async function handleDelete(fileId: string) {
    if (!workspaceId) return;
    if (!confirm("Are you sure you want to delete this file?")) return;

    const res = await fetch(
      `/api/workspaces/${workspaceId}/files/${fileId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      alert("Failed to delete file");
    }
  }

  // Add tag handler
  async function handleAddTag(fileId: string, tag: FileTag) {
    const file = files.find((f) => f.id === fileId);
    if (!file || file.tags.includes(tag)) {
      setTagEditFileId(null);
      return;
    }

    const newTags = [...file.tags, tag];

    const { error } = await supabase
      .from("files")
      .update({ tags: newTags })
      .eq("id", fileId);

    if (!error) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, tags: newTags } : f))
      );
    }

    setTagEditFileId(null);
  }

  // Remove tag handler
  async function handleRemoveTag(fileId: string, tag: FileTag) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const newTags = file.tags.filter((t) => t !== tag);

    const { error } = await supabase
      .from("files")
      .update({ tags: newTags })
      .eq("id", fileId);

    if (!error) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, tags: newTags } : f))
      );
    }
  }

  // "What's in here?" summary
  function handleSummary() {
    alert(
      `Your Business Bucket contains ${files.length} file(s). Tags breakdown:\n\n` +
        TAG_OPTIONS.map(
          (t) =>
            `${t.label}: ${files.filter((f) => f.tags.includes(t.label)).length} file(s)`
        ).join("\n") +
        `\n\nTotal size: ${formatFileSize(files.reduce((sum, f) => sum + f.size_bytes, 0))}`
    );
  }

  // Filter files
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      searchQuery === "" ||
      f.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag =
      activeTagFilter === null || f.tags.includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  // Mime type to badge label
  function mimeLabel(mime: string): string {
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("word") || mime.includes("docx")) return "DOCX";
    if (mime.includes("csv")) return "CSV";
    if (mime.includes("text/plain")) return "TXT";
    return mime.split("/").pop()?.toUpperCase() ?? "FILE";
  }

  function mimeBadgeColor(mime: string): string {
    if (mime.includes("pdf")) return "bg-red-100 text-red-700";
    if (mime.includes("word") || mime.includes("docx"))
      return "bg-blue-100 text-blue-700";
    if (mime.includes("csv")) return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Bucket</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage your business files
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSummary}
          className="gap-2"
          disabled={files.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          What&apos;s in here?
        </Button>
      </div>

      {/* Drag and drop upload area */}
      <div
        {...getRootProps()}
        className={`mb-8 cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              isDragActive ? "bg-indigo-100" : "bg-gray-100"
            }`}
          >
            <Upload
              className={`h-6 w-6 ${
                isDragActive ? "text-indigo-600" : "text-gray-400"
              }`}
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-700">
            {isDragActive
              ? "Drop files here..."
              : "Drop files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Supports PDF, DOCX, CSV, TXT
          </p>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && uploadProgress && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-indigo-700">
            {uploadProgress}
          </p>
        </div>
      )}

      {/* Search and tag filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag.label}
              onClick={() =>
                setActiveTagFilter(
                  activeTagFilter === tag.label ? null : tag.label
                )
              }
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeTagFilter === tag.label
                  ? `${tag.bg} ${tag.color} ring-2 ring-offset-1 ring-current`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tag.label}
              {activeTagFilter === tag.label && (
                <X className="ml-1 h-3 w-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* File list table */}
      {filteredFiles.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white py-16 text-center">
          <FileIcon className="h-10 w-10 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-500">
            {files.length === 0
              ? "No files yet. Upload your first file above."
              : "No files match your search or filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate text-sm font-medium text-gray-900">
                        {file.original_name}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${mimeBadgeColor(file.mime_type)}`}
                    >
                      {mimeLabel(file.mime_type)}
                    </span>
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {file.tags.map((tag) => {
                        const style = getTagStyle(tag);
                        return (
                          <span
                            key={tag}
                            className={`group inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.color}`}
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(file.id, tag)}
                              className="hidden rounded-full hover:bg-black/10 group-hover:inline-flex"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {/* Add tag button */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setTagEditFileId(
                              tagEditFileId === file.id ? null : file.id
                            )
                          }
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        {tagEditFileId === file.id && (
                          <div className="absolute left-0 top-7 z-10 w-36 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                            {TAG_OPTIONS.filter(
                              (t) => !file.tags.includes(t.label)
                            ).map((t) => (
                              <button
                                key={t.label}
                                onClick={() =>
                                  handleAddTag(file.id, t.label)
                                }
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 ${t.color}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${t.bg}`}
                                />
                                {t.label}
                              </button>
                            ))}
                            {TAG_OPTIONS.filter(
                              (t) => !file.tags.includes(t.label)
                            ).length === 0 && (
                              <p className="px-2 py-1 text-xs text-gray-400">
                                All tags applied
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-500">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
