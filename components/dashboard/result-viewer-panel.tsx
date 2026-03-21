"use client";

import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ResultView = "markdown" | "json";

type ResultViewerPanelProps = {
  resultView: ResultView;
  onResultViewChange: (next: ResultView) => void;
} & (
  | {
      state: "ready";
      markdownContent: string;
      jsonContent: Record<string, unknown>;
    }
  | {
      state: "empty";
      markdownContent?: never;
      jsonContent?: never;
      emptyMarkdownMessage?: ReactNode;
      emptyJsonMessage?: string;
    }
);

export function ResultViewerPanel({
  resultView,
  onResultViewChange,
  state,
  markdownContent,
  jsonContent,
  emptyMarkdownMessage,
  emptyJsonMessage,
}: ResultViewerPanelProps) {
  const isReady = state === "ready";

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Results
          </p>
          <p className="text-sm font-semibold text-zinc-900">Parsed Output</p>
        </div>

        <select
          value={resultView}
          onChange={(e) => onResultViewChange(e.target.value as ResultView)}
          className="h-9 min-w-[140px] rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 outline-none ring-0 transition focus:border-zinc-300"
          aria-label="Result format"
        >
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-xs font-semibold text-zinc-500">Result Preview</p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {resultView === "markdown" ? (
              <div className="min-h-full px-5 py-5">
                {isReady ? (
                  <pre className="whitespace-pre-wrap text-xs leading-loose font-mono text-zinc-800">
                    {markdownContent}
                  </pre>
                ) : (
                  <p className="text-sm leading-7 text-zinc-600">
                    {emptyMarkdownMessage ?? "아직 결과가 없습니다."}
                  </p>
                )}
              </div>
            ) : (
              <div className="min-h-full px-5 py-5">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-zinc-600">
                  {isReady
                    ? JSON.stringify(jsonContent, null, 2)
                    : emptyJsonMessage ??
                      `{
  "status": "waiting_for_upload",
  "message": "파일 업로드 후 JSON 결과가 표시됩니다."
}`}
                </pre>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}
