"use client";

import { ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Download,
  Copy,
  RotateCcw,
  FileText,
  SlidersHorizontal,
} from "lucide-react";

type ResultView = "markdown" | "json";
type PanelTab = "config" | "result";
type MarkdownMode = "preview" | "raw";

type ResultViewerPanelProps = {
  panelTab: PanelTab;
  onPanelTabChange: (next: PanelTab) => void;
  resultView: ResultView;
  onResultViewChange: (next: ResultView) => void;
  showConfigTab?: boolean;
  downloadUrl?: string;
  downloadFileName?: string;
  configContent?: ReactNode;
  configTitle?: string;
  configDescription?: ReactNode;
  emptyMarkdownMessage?: ReactNode;
  emptyJsonMessage?: string;
  resultTabDisabled?: boolean;
  onCopy?: () => void;
  onRefresh?: () => void;
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
    }
);

export function ResultViewerPanel({
  panelTab,
  onPanelTabChange,
  resultView,
  onResultViewChange,
  showConfigTab = true,
  downloadUrl,
  downloadFileName,
  configContent,
  configTitle,
  configDescription,
  state,
  markdownContent,
  jsonContent,
  emptyMarkdownMessage,
  emptyJsonMessage,
  resultTabDisabled = false,
  onCopy,
  onRefresh,
}: ResultViewerPanelProps) {
  const isReady = state === "ready";
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>("preview");

  const resultContent = (
    <>
      <div className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  aria-label="Result format"
                >
                  {resultView === "markdown" ? "Markdown" : "JSON"}
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={resultView}
                  onValueChange={(value) => onResultViewChange(value as ResultView)}
                >
                  <DropdownMenuRadioItem value="markdown">
                    Markdown
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="json">JSON</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {resultView === "markdown" ? (
            <div className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setMarkdownMode("preview")}
                className={`inline-flex h-7 items-center rounded-sm px-2.5 text-xs font-medium transition ${
                  markdownMode === "preview"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMarkdownMode("raw")}
                className={`inline-flex h-7 items-center rounded-sm px-2.5 text-xs font-medium transition ${
                  markdownMode === "raw"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Raw
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          {downloadUrl && (
            <a href={downloadUrl} download={downloadFileName}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={onRefresh}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#fbfbfb] p-5">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <ScrollArea className="h-full min-h-0 flex-1">
            <div className="p-6">
              {resultView === "markdown" ? (
                isReady ? (
                  markdownMode === "preview" ? (
                    <div className="prose prose-zinc max-w-none prose-headings:scroll-mt-20 prose-pre:overflow-x-auto prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-th:text-left prose-td:align-top">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {markdownContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="prose prose-zinc max-w-none">
                      <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-mono text-zinc-800 bg-transparent p-0">
                        {markdownContent}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-sm text-zinc-500">
                      {emptyMarkdownMessage ?? "아직 결과가 없습니다."}
                    </p>
                  </div>
                )
              ) : (
                <pre className="text-[13px] leading-relaxed font-mono text-zinc-800 bg-transparent p-0 overflow-x-auto">
                  {isReady
                    ? JSON.stringify(jsonContent, null, 2)
                    : emptyJsonMessage ??
                      `{
  "status": "waiting_for_upload",
  "message": "파일 업로드 후 JSON 결과가 표시됩니다."
}`}
                </pre>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );

  if (!showConfigTab) {
    return (
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-t border-zinc-200 bg-[#fcfcfc] lg:basis-1/2 lg:border-t-0 lg:border-l">
        <div className="flex h-12 items-center border-b border-zinc-200 bg-white px-4">
          <div className="flex h-full items-center gap-2 border-b-2 border-zinc-900 px-1 text-sm font-medium text-zinc-900">
            <FileText className="h-4 w-4" />
            Results
          </div>
        </div>
        <div className="flex-1 min-h-0">{resultContent}</div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-t border-zinc-200 bg-[#fcfcfc] lg:basis-1/2 lg:border-t-0 lg:border-l">
      <Tabs
        value={panelTab}
        onValueChange={(value) => onPanelTabChange(value as PanelTab)}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="flex h-12 items-center border-b border-zinc-200 bg-white px-4">
          <TabsList variant="line" className="h-full gap-6 bg-transparent p-0">
            <TabsTrigger
              value="config"
              className="flex h-full items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-1 text-sm font-medium text-zinc-500 shadow-none data-active:border-zinc-900 data-active:text-zinc-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Build
            </TabsTrigger>
            <TabsTrigger
              value="result"
              disabled={resultTabDisabled}
              className="flex h-full items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-1 text-sm font-medium text-zinc-500 shadow-none data-active:border-zinc-900 data-active:text-zinc-900"
            >
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="config" className="m-0 h-full min-h-0">
            <ScrollArea className="h-full">
              <div className="px-6 py-6">
                <div className="mb-6">
                  <div className="mb-2">
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                      {configTitle ?? "Configuration"}
                    </h2>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {configDescription ?? "Load a saved configuration or start fresh with defaults."}
                  </p>
                </div>

                <div className="space-y-6">
                  {configContent ?? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-12 text-center">
                      <p className="text-sm text-zinc-500">
                        아직 설정 항목이 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="result" className="m-0 flex h-full min-h-0 flex-col">
            {resultContent}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
