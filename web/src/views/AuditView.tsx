import { useState } from "react";
import type { ReportedRead, ReadVerdict } from "../../../src/audit/reportGenerator.js";
import { fetchAuditReport, LicenNodeApiError, type AuditResponse } from "../api/licenNodeApi.js";
import { BusyIndicator, DetailList, ErrorBanner } from "../components/Feedback.js";
import "../components/material.js";

/**
 * Audit view. Replays the on-chain receipts for one training run and reports
 * whether every read in it was licensed at the moment it happened. The verdict
 * comes from the Sprint 5 generator, so the site and the CLI cannot disagree.
 */
export interface AuditViewProps {
    onNotify: (message: string) => void;
}

/** Plain-language wording for each verdict, so the table needs no legend. */
const VERDICT_LABEL: Record<ReadVerdict, string> = {
    compliant: "Licensed at read time",
    "expired-at-read": "License had expired",
    unlicensed: "Use not permitted",
    "unknown-blob": "Blob not in the manifest",
};

function ReadRow({ read, explorerUrl }: { read: ReportedRead; explorerUrl?: string }) {
    return (
        <md-outlined-card>
            <div className="card-body">
                <div className="chip-row">
                    <h4 className="m3-title-medium">{read.blobName ?? "Unknown blob"}</h4>
                    <md-assist-chip label={VERDICT_LABEL[read.verdict]}></md-assist-chip>
                </div>
                <DetailList
                    rows={[
                        { label: "Blob hash", value: read.blobHash, mono: true },
                        { label: "License ID", value: read.licenseId },
                        { label: "Reader", value: read.reader },
                        { label: "Read at", value: read.timestamp },
                        ...(read.reason ? [{ label: "Reason", value: read.reason }] : []),
                    ]}
                />
                {explorerUrl && (
                    <p className="m3-body-small">
                        <a
                            className="explorer-link"
                            href={explorerUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            View the receipt transaction
                        </a>
                    </p>
                )}
            </div>
        </md-outlined-card>
    );
}

export function AuditView({ onNotify }: AuditViewProps) {
    const [trainingRunId, setTrainingRunId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audit, setAudit] = useState<AuditResponse | null>(null);

    async function submit(): Promise<void> {
        setBusy(true);
        setError(null);
        setAudit(null);
        try {
            const response = await fetchAuditReport(trainingRunId);
            setAudit(response);
            onNotify(
                response.report.compliant
                    ? `Run ${response.report.trainingRunId} is compliant.`
                    : `Run ${response.report.trainingRunId} has ${response.report.problems.length} problem(s).`,
            );
        } catch (cause) {
            setError(
                cause instanceof LicenNodeApiError
                    ? cause.message
                    : "The audit could not be generated.",
            );
        } finally {
            setBusy(false);
        }
    }

    const report = audit?.report;

    return (
        <>
            <section className="view-header">
                <h2 className="m3-display-small">Audit a training run</h2>
                <p className="m3-body-large on-surface-variant">
                    The report is rebuilt from the receipts on Aptos and the local manifest, so it
                    reflects what actually happened rather than what a log claims happened.
                </p>
            </section>

            <md-outlined-card>
                <div className="card-body">
                    <md-outlined-text-field
                        label="Training run ID"
                        value={trainingRunId}
                        required
                        maxlength={512}
                        supporting-text="The same run ID used when the data was read"
                        onInput={(event: { target: unknown }) =>
                            setTrainingRunId(
                                (event.target as { value?: string } | null)?.value ?? "",
                            )
                        }
                    ></md-outlined-text-field>
                    <div className="actions-row">
                        <md-filled-button disabled={busy} onClick={submit}>
                            Generate report
                        </md-filled-button>
                    </div>
                </div>
            </md-outlined-card>

            {error && <ErrorBanner title="Audit failed" message={error} />}
            {busy && <BusyIndicator label="Replaying receipts from Aptos…" />}

            {report && (
                <>
                    <md-filled-card>
                        <div className="card-body">
                            <div className="chip-row">
                                <h3 className="m3-title-large">
                                    {report.compliant ? "Compliant" : "Not compliant"}
                                </h3>
                                <md-assist-chip
                                    label={`${report.compliantReads} of ${report.totalReads} reads licensed`}
                                ></md-assist-chip>
                            </div>
                            <DetailList
                                rows={[
                                    { label: "Training run", value: report.trainingRunId },
                                    { label: "Generated at", value: report.generatedAt },
                                    { label: "Total reads", value: `${report.totalReads}` },
                                    { label: "Distinct blobs", value: `${report.distinctBlobs}` },
                                ]}
                            />
                            {report.problems.length > 0 && (
                                <>
                                    <md-divider></md-divider>
                                    <h4 className="m3-title-medium">Problems</h4>
                                    <ul className="m3-body-medium">
                                        {report.problems.map((problem) => (
                                            <li key={problem}>{problem}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </md-filled-card>

                    <h3 className="m3-title-large">Reads</h3>
                    {report.reads.length === 0 ? (
                        <p className="m3-body-medium on-surface-variant">
                            No receipts were found for this run. A run with no reads is not
                            considered compliant, because there is nothing to prove.
                        </p>
                    ) : (
                        <div className="read-list">
                            {report.reads.map((read) => (
                                <ReadRow
                                    key={read.transactionHash}
                                    read={read}
                                    explorerUrl={audit?.explorerUrls[read.transactionHash]}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
