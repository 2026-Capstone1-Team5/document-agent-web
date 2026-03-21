"use client";

import { ReactNode, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Input } from "@/components/ui/input";

const PDF_VIEWPORT_WIDTH = 728;

type PreviewStatus = "idle" | "loading" | "loaded" | "error";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function parsePreviewErrorMessage(rawText: string): string {
  try {
    const parsed = JSON.parse(rawText) as {
      error?: {
        message?: string;
      };
    };
    const message = parsed.error?.message?.trim();
    if (message) {
      return message;
    }
  } catch {
    // fall through
  }
  return "문서를 불러오지 못했습니다. API 연결 상태를 확인해 주세요.";
}

type SourcePreviewPanelProps = {
  fileName: string;
  previewUrl: string;
  toolbarStart?: ReactNode;
  toolbarActions?: ReactNode;
  downloadUrl?: string;
  downloadFileName?: string;
} & (
  | {
      mode: "pdf";
    }
  | {
      mode: "embed";
    }
);

export function SourcePreviewPanel({
  fileName,
  previewUrl,
  mode,
  toolbarStart,
  toolbarActions,
  downloadUrl,
  downloadFileName,
}: SourcePreviewPanelProps) {
  const isPdfPreview = mode === "pdf";
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>(
    isPdfPreview ? "idle" : "loading",
  );
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const handlePreviewLoad = () => {
    const iframeDocument = previewFrameRef.current?.contentDocument;
    const iframeContentType = iframeDocument?.contentType?.toLowerCase() ?? "";
    const iframeBodyText = iframeDocument?.body?.innerText?.trim() ?? "";

    if (
      (iframeContentType.includes("application/json") || iframeContentType.includes("text/plain")) &&
      iframeBodyText
    ) {
      setPreviewMessage(parsePreviewErrorMessage(iframeBodyText));
      setPreviewStatus("error");
      return;
    }

    setPreviewStatus("loaded");
  };

  const handlePreviewError = () => {
    setPreviewMessage("문서를 불러오지 못했습니다. API 연결 상태를 확인해 주세요.");
    setPreviewStatus("error");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-zinc-200 bg-white">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          {toolbarStart}
          <span className="max-w-[160px] truncate text-xs font-medium text-zinc-600">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!isPdfPreview || pdfPageNumber <= 1}
            onClick={() => setPdfPageNumber((prev) => Math.max(1, prev - 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={Math.max(1, pdfNumPages)}
              value={pdfPageNumber}
              disabled={!isPdfPreview}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next)) {
                  return;
                }
                const clamped = Math.min(Math.max(1, next), Math.max(1, pdfNumPages));
                setPdfPageNumber(clamped);
              }}
              className="h-8 w-12 border-zinc-200 px-2 text-center text-sm"
            />
            <span className="text-sm text-zinc-500">of</span>
            <span className="text-sm text-zinc-500">{pdfNumPages || "?"}</span>
          </div>

          <button
            type="button"
            disabled={!isPdfPreview || !pdfNumPages || pdfPageNumber >= pdfNumPages}
            onClick={() => setPdfPageNumber((prev) => Math.min(pdfNumPages, prev + 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          <button
            type="button"
            aria-label="Zoom Out"
            onClick={() => setZoomPercent((prev) => Math.max(60, prev - 10))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-sm text-zinc-600">{zoomPercent}%</span>
          <button
            type="button"
            aria-label="Zoom In"
            onClick={() => setZoomPercent((prev) => Math.min(200, prev + 10))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Reset Zoom"
            onClick={() => setZoomPercent(100)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
              aria-label="Download source"
              download={downloadFileName}
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
          {toolbarActions}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{fileName}</span>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[#f3f3f3]" tabIndex={0}>
        {previewStatus === "error" ? (
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm font-medium text-red-600">
              {previewMessage ?? "문서를 불러오지 못했습니다. API 연결 상태를 확인해 주세요."}
            </p>
          </div>
        ) : isPdfPreview ? (
          <div className="flex min-h-full justify-center p-4">
            <Document
              file={previewUrl}
              loading={
                <div className="flex h-[720px] w-[728px] items-center justify-center border border-zinc-300 bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                </div>
              }
              onLoadSuccess={({ numPages }) => {
                setPdfNumPages(numPages);
                setPdfPageNumber((prev) => Math.min(Math.max(prev, 1), numPages));
                setPreviewStatus("loaded");
              }}
              onLoadError={(error) => {
                console.error(error);
                setPreviewMessage("PDF 미리보기를 불러오지 못했습니다.");
                setPreviewStatus("error");
              }}
            >
              <div
                className="inline-block origin-top"
                style={{ transform: `scale(${zoomPercent / 100})` }}
              >
                <Page
                  pageNumber={pdfPageNumber}
                  width={PDF_VIEWPORT_WIDTH}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className="border border-zinc-300 bg-white shadow-sm"
                />
              </div>
            </Document>
          </div>
        ) : (
          <>
            <div
              className="mx-auto h-full"
              style={{
                width: `${100 / (zoomPercent / 100)}%`,
                transform: `scale(${zoomPercent / 100})`,
                transformOrigin: "top center",
              }}
            >
              <iframe
                ref={previewFrameRef}
                src={previewUrl}
                className="h-full w-full border-none"
                title="Document Preview"
                onLoad={handlePreviewLoad}
                onError={handlePreviewError}
              />
            </div>
            {previewStatus === "loading" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/25">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                <p className="text-xs font-medium text-zinc-700">원문 미리보기를 불러오는 중입니다.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
