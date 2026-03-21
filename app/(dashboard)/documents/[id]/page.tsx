"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  deleteDocument,
  DocumentSummary,
  getDocumentResult,
  getDownloadUrl,
  getSourceUrl,
  ParseResult,
} from "@/lib/document-agent-api";

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

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentSummary | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [resultView, setResultView] = useState<"markdown" | "json">("markdown");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const previewUrl = doc ? getSourceUrl(doc.id) : null;
  const isPdfPreview = Boolean(
    doc && (doc.contentType.toLowerCase().includes("pdf") || doc.filename.toLowerCase().endsWith(".pdf")),
  );

  useEffect(() => {
    const fetchDocDetail = async () => {
      if (!documentId) {
        setErrorMessage("Invalid document ID.");
        setLoading(false);
        return;
      }

      try {
        const data = await getDocumentResult(documentId);
        setDoc(data.document);
        setResult(data.result);
        setErrorMessage(null);
      } catch (error) {
        console.error(error);
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An error occurred while loading the document.");
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchDocDetail();
  }, [documentId]);

  useEffect(() => {
    if (!previewUrl) {
      setPreviewStatus("idle");
      setPreviewMessage(null);
      return;
    }
    if (isPdfPreview) {
      setPreviewStatus("idle");
      setPreviewMessage(null);
      return;
    }
    setPreviewStatus("loading");
    setPreviewMessage(null);
  }, [isPdfPreview, previewUrl]);

  const handleDelete = async () => {
    if (!documentId) return;
    if (!confirm("이 문서를 삭제하시겠습니까?")) return;

    try {
      await deleteDocument(documentId);
      router.push("/documents");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("삭제 중 오류가 발생했습니다.");
      }
    }
  };

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-zinc-500 font-medium">Loading document details...</p>
      </div>
    );
  }

  if (!doc || !result) {
    return (
      <div className="text-center py-20">
        <p>Document not found.</p>
        <Button variant="link" render={<Link href="/documents" />}>
          Return to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100svh-4rem)] min-h-[720px] flex-col overflow-hidden border-y border-zinc-200 bg-white lg:flex-row">
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-b border-zinc-200 lg:border-b-0 lg:border-r">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-zinc-200 bg-white">
          <div className="flex h-12 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <Button
                variant="ghost"
                size="xs"
                render={<Link href="/documents" />}
                className="h-8 px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                목록
              </Button>
              <span className="max-w-[160px] truncate text-xs font-medium text-zinc-600">
                {doc.filename}
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

              <a
                href={getSourceUrl(doc.id, "attachment")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
                aria-label="Download PDF"
                download={doc.filename}
              >
                <Download className="h-4 w-4" />
              </a>
              <a
                href={getDownloadUrl(doc.id, "markdown")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
                aria-label="Download markdown"
              >
                <FileText className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                aria-label="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto bg-[#f3f3f3]" tabIndex={0}>
            {isPdfPreview ? (
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
                    src={previewUrl ?? undefined}
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

          {previewStatus === "error" ? (
            <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{previewMessage ?? "문서를 불러오지 못했습니다. API 연결 상태를 확인해 주세요."}</span>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mx-5 my-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </section>

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
            onChange={(e) => setResultView(e.target.value as "markdown" | "json")}
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
              <p className="text-xs font-semibold text-zinc-500">
                Result Preview
              </p>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {resultView === "markdown" ? (
                <div className="min-h-full px-5 py-5">
                  <pre className="whitespace-pre-wrap text-xs leading-loose font-mono text-zinc-800">
                    {result.markdown}
                  </pre>
                </div>
              ) : (
                <div className="min-h-full px-5 py-5">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-zinc-600">
                    {JSON.stringify(result.canonicalJson, null, 2)}
                  </pre>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </section>
    </div>
  );
}
