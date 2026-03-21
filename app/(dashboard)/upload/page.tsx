"use client";

import { useEffect, useRef, useState } from "react";
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
  Upload,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DocumentSummary,
  getDocumentResult,
  getParseJob,
  getSourceUrl,
  ParseResult,
  uploadDocument,
} from "@/lib/document-agent-api";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60000;
const PDF_VIEWPORT_WIDTH = 728;

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PreviewStatus = "idle" | "loading" | "loaded" | "error";

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

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resultView, setResultView] = useState<"markdown" | "json">("markdown");
  const [parsedDocument, setParsedDocument] = useState<DocumentSummary | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const isActiveRef = useRef(true);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const previewUrl = parsedDocument ? getSourceUrl(parsedDocument.id) : null;
  const isPdfPreview = Boolean(
    parsedDocument &&
      (parsedDocument.contentType.toLowerCase().includes("pdf") ||
        parsedDocument.filename.toLowerCase().endsWith(".pdf")),
  );

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
    };
  }, []);

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

  const startUpload = async (selectedFile: File) => {
    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setParsedDocument(null);
    setParsedResult(null);
    setPreviewMessage(null);
    setPreviewStatus("idle");
    setZoomPercent(100);
    setPdfNumPages(0);
    setPdfPageNumber(1);

    try {
      const queued = await uploadDocument(selectedFile);
      const startedAt = Date.now();

      while (isActiveRef.current && Date.now() - startedAt < POLL_TIMEOUT_MS) {
        const current = await getParseJob(queued.job.id);

        if (current.job.status === "failed") {
          throw new Error(current.job.errorMessage ?? "문서 파싱에 실패했습니다.");
        }

        if (current.job.documentId) {
          if (!isActiveRef.current) {
            return;
          }

          const parsed = await getDocumentResult(current.job.documentId);
          if (!isActiveRef.current) {
            return;
          }
          setParsedDocument(parsed.document);
          setParsedResult(parsed.result);
          setSuccessMessage("파싱이 완료되었습니다. 아래에서 원문과 결과를 바로 확인해 주세요.");
          return;
        }

        await wait(POLL_INTERVAL_MS);
      }

      if (isActiveRef.current) {
        setErrorMessage("업로드는 완료되었지만 파싱이 아직 진행 중입니다. 문서 목록에서 잠시 후 다시 확인해 주세요.");
      }
    } catch (error) {
      console.error(error);
      if (!isActiveRef.current) {
        return;
      }
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("업로드 처리 중 오류가 발생했습니다.");
      }
    } finally {
      if (isActiveRef.current) {
        setUploading(false);
      }
    }
  };

  const handleFileSelection = (selectedFile: File | null) => {
    if (!selectedFile || uploading) {
      return;
    }
    void startUpload(selectedFile);
  };

  return (
    <div className="-m-6 flex h-[calc(100svh-4rem)] min-h-[720px] flex-col overflow-hidden border-y border-zinc-200 bg-white lg:flex-row">
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-b border-zinc-200 lg:border-b-0 lg:border-r">
        <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top,_rgba(196,212,130,0.16),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#fcfcf8_100%)]">
          <Input
            id="upload-file-input"
            type="file"
            className="hidden"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              e.currentTarget.value = "";
              handleFileSelection(selectedFile);
            }}
            accept=".pdf,image/*"
          />

          {parsedDocument && parsedResult && previewUrl && previewStatus !== "error" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-zinc-200 bg-white">
              <div className="flex h-12 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    onClick={() => document.getElementById("upload-file-input")?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload
                  </button>
                  <span className="max-w-[160px] truncate text-xs font-medium text-zinc-600">
                    {parsedDocument.filename}
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
                href={getSourceUrl(parsedDocument.id, "attachment")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
                aria-label="Download PDF"
                download={parsedDocument.filename}
              >
                <Download className="h-4 w-4" />
              </a>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="max-w-[120px] truncate">{parsedDocument.filename}</span>
                  </div>
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
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById("upload-file-input")?.click()}
              className="m-5 flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] border border-dashed border-zinc-300 bg-white/80 px-10 text-center transition hover:border-zinc-400 hover:bg-white"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-[#d8e7a5] bg-[#f8fcd8]">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#7d8c36]" />
                ) : (
                  <Upload className="h-8 w-8 text-[#7d8c36]" />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                  파일을 끌어 놓거나 클릭해서 선택하세요
                </p>
                <p className="mx-auto max-w-lg text-sm leading-6 text-zinc-500">
                  업로드가 시작되면 parse job을 생성하고, 결과 준비가 끝나면 이 화면에서 결과를 확인합니다.
                </p>
              </div>
              {file ? (
                <div className="rounded-full border border-[#d8e7a5] bg-[#f8fcd8] px-4 py-1.5 text-sm font-medium text-[#667226]">
                  {file.name}
                </div>
              ) : null}
            </button>
          )}

          {previewStatus === "error" ? (
            <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{previewMessage ?? "문서를 불러오지 못했습니다. API 연결 상태를 확인해 주세요."}</span>
              </div>
            </div>
          ) : null}

          <div className="px-5 py-4 text-sm text-zinc-500">
            {uploading
              ? "업로드가 진행 중입니다. 파싱 완료까지 잠시만 기다려 주세요."
              : "파일을 선택하면 자동으로 업로드를 시작합니다."}
          </div>

          {errorMessage ? (
            <div className="mx-5 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mx-5 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
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
            <p className="text-sm font-semibold text-zinc-900">
              Parsed Output
            </p>
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

        <ScrollArea className="flex-1">
          {resultView === "markdown" ? (
            <div className="min-h-full space-y-8 px-6 py-6">
              <section className="space-y-3 border-b border-zinc-100 pb-6">
                <h1 className="text-[2rem] font-semibold tracking-tight text-zinc-900">
                  문서 결과 미리보기
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-zinc-500">
                  업로드가 끝나면 이 영역에 추출된 Markdown 결과가 바로 표시됩니다. 제목, 섹션, 표 요약, 본문 구조를 검수하는 작업을 기준으로 구성했습니다.
                </p>
              </section>

              <section className="space-y-3 border-b border-zinc-100 pb-6">
                {parsedResult ? (
                  <pre className="whitespace-pre-wrap text-xs leading-loose font-mono text-zinc-800">
                    {parsedResult.markdown}
                  </pre>
                ) : (
                  <p className="text-sm leading-7 text-zinc-600">
                    아직 결과가 없습니다. 파일 업로드가 완료되면 이 영역에 실제 Markdown 결과가 표시됩니다.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="min-h-full px-6 py-6">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-zinc-600">
                {parsedResult
                  ? JSON.stringify(parsedResult.canonicalJson, null, 2)
                  : `{
  "status": "waiting_for_upload",
  "message": "파일 업로드 후 JSON 결과가 표시됩니다."
}`}
              </pre>
            </div>
          )}
        </ScrollArea>
      </section>
    </div>
  );
}
