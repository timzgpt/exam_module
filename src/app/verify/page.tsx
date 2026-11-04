"use client";

import { Logo } from "@/components/shell/logo";
import { StatusBadge, type BadgeTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCode, studentById, cycleById, classResults, classNameOf } from "@/lib/demo-data";
import { SCHOOL } from "@/lib/demo-config";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Ban, Search } from "lucide-react";
import { useState } from "react";

type ResultView =
  | { kind: "idle" }
  | { kind: "valid"; studentId: string; cycleId: string; issuedAt: string; checksum: string }
  | { kind: "not-found" }
  | { kind: "tampered"; issuedAt: string }
  | { kind: "revoked"; issuedAt: string };

const RESULTS: Record<
  Exclude<ResultView["kind"], "idle">,
  { tone: BadgeTone; title: string; detail: string; icon: typeof ShieldCheck }
> = {
  valid: {
    tone: "success",
    title: "Report card verified",
    detail: "This document matches the record issued by the school.",
    icon: ShieldCheck,
  },
  "not-found": {
    tone: "destructive",
    title: "No matching record",
    detail:
      "We could not find a report card with this verification code. Check the code and try again.",
    icon: ShieldQuestion,
  },
  tampered: {
    tone: "destructive",
    title: "Verification failed. Document may be altered",
    detail:
      "The checksum of this document does not match the school record. Do not accept it.",
    icon: ShieldAlert,
  },
  revoked: {
    tone: "warning",
    title: "Document revoked",
    detail:
      "This report card was replaced by a corrected version and is no longer valid.",
    icon: Ban,
  },
};

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultView>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const verify = () => {
    if (!code.trim()) return;
    setBusy(true);
    // Simulated secure registry lookup
    window.setTimeout(() => {
      const outcome = verifyCode(code);
      switch (outcome.state) {
        case "valid":
          setResult({
            kind: "valid",
            studentId: outcome.record.studentId,
            cycleId: outcome.record.cycleId,
            issuedAt: outcome.record.issuedAt,
            checksum: outcome.record.checksum,
          });
          break;
        case "not-found":
          setResult({ kind: "not-found" });
          break;
        case "tampered":
          setResult({ kind: "tampered", issuedAt: outcome.record.issuedAt });
          break;
        case "revoked":
          setResult({ kind: "revoked", issuedAt: outcome.record.issuedAt });
          break;
      }
      setBusy(false);
    }, 700);
  };

  const meta = result.kind === "idle" ? null : RESULTS[result.kind];
  const student = result.kind === "valid" ? studentById(result.studentId) : undefined;
  const cycle = result.kind === "valid" ? cycleById(result.cycleId) : undefined;
  const rank =
    result.kind === "valid" && student
      ? classResults(student.classId).find((r) => r.student.id === student.id)
      : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <Logo inverted />
          <div className="leading-tight">
            <p className="text-compact font-semibold text-foreground">{SCHOOL.name}</p>
            <p className="text-2xs text-muted-foreground">Report card verification</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Verify a report card
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the verification code printed at the bottom of any Josephian
            Schools report card to confirm it was genuinely issued by the school.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-border bg-card p-5 shadow-sm">
          <label
            htmlFor="verify-code"
            className="text-compact font-medium text-foreground"
          >
            Verification code
          </label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="verify-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="e.g. JS26-T1-0147-9F3A"
              className="font-mono text-sm uppercase tracking-wide"
              autoComplete="off"
            />
            <Button onClick={verify} disabled={busy || !code.trim()} className="gap-1.5">
              <Search className="size-4" />
              {busy ? "Checking…" : "Verify"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Demo codes:{" "}
            <button className="font-mono underline decoration-dotted" onClick={() => setCode("JS26-T1-0147-9F3A")}>
              JS26-T1-0147-9F3A
            </button>{" "}
            (valid) ·{" "}
            <button className="font-mono underline decoration-dotted" onClick={() => setCode("JS26-T1-0147-0000")}>
              JS26-T1-0147-0000
            </button>{" "}
            (tampered)
          </p>
        </div>

        {meta && result.kind !== "idle" ? (
          <div className="mx-auto mt-4 max-w-xl rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <meta.icon
                className={
                  meta.tone === "success"
                    ? "mt-0.5 size-5 shrink-0 text-success"
                    : meta.tone === "warning"
                      ? "mt-0.5 size-5 shrink-0 text-warning"
                      : "mt-0.5 size-5 shrink-0 text-destructive"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-foreground">{meta.title}</h2>
                  <StatusBadge tone={meta.tone} label={meta.tone === "success" ? "Authentic" : "Not accepted"} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{meta.detail}</p>

                {result.kind === "valid" && student ? (
                  <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-lg border border-border/70 bg-background p-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Student</dt>
                      <dd className="text-sm font-medium text-foreground">{student.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Class</dt>
                      <dd className="text-sm font-medium text-foreground">{classNameOf(student.classId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Report cycle</dt>
                      <dd className="text-sm font-medium text-foreground">{cycle?.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Term average</dt>
                      <dd className="text-sm font-medium text-foreground">
                        {rank ? `${rank.average.toFixed(1)}  ·  Position ${rank.rank}` : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Issued on</dt>
                      <dd className="text-sm font-medium text-foreground">{result.issuedAt}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Document checksum</dt>
                      <dd className="font-mono text-sm font-medium text-foreground">{result.checksum}</dd>
                    </div>
                  </dl>
                ) : null}

                {(result.kind === "tampered" || result.kind === "revoked") && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Reference issue date: {result.issuedAt}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-8 max-w-xl rounded-lg border border-border/70 bg-muted/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Verification is read-only: it confirms the code, issue date and
            document checksum against the school registry. It never exposes
            personal data beyond the summary above. For disputes contact{" "}
            {SCHOOL.email} or call {SCHOOL.phone}.
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-white py-4">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 {SCHOOL.name} · {SCHOOL.address}
        </p>
      </footer>
    </div>
  );
}
