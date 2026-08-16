import { useState } from "react";
import { PERMITTED_USES, type PermittedUse } from "../../../src/licenses/schema.js";
import {
    readLicensedBlobRequest,
    VaultApiError,
    type ReadResponse,
} from "../api/vaultApi.js";
import { BusyIndicator, DetailList, ErrorBanner } from "../components/Feedback.js";
import "../components/material.js";

/**
 * Read view. A read that the license does not permit is refused before any bytes
 * move, and a read that is permitted produces a receipt anchored on Aptos. Both
 * outcomes are worth showing, so a denial renders as a normal result rather than
 * as a crash.
 */
export interface ReadViewProps {
    /** Blob names uploaded in this session, offered as a starting point. */
    knownBlobNames: readonly string[];
    onNotify: (message: string) => void;
}

interface FormState {
    blobName: string;
    readerId: string;
    trainingRunId: string;
    declaredUse: PermittedUse;
}

const INITIAL_FORM: FormState = {
    blobName: "",
    readerId: "",
    trainingRunId: "",
    declaredUse: "training",
};

export function ReadView({ knownBlobNames, onNotify }: ReadViewProps) {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [busy, setBusy] = useState(false);
    const [denied, setDenied] = useState<string | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [result, setResult] = useState<ReadResponse | null>(null);

    const update =
        (field: keyof FormState) =>
            (event: { target: unknown }): void => {
                const target = event.target as { value?: string } | null;
                setForm((current) => ({ ...current, [field]: target?.value ?? "" }));
            };

    async function submit(): Promise<void> {
        setBusy(true);
        setDenied(null);
        setFailed(null);
        setResult(null);
        try {
            const response = await readLicensedBlobRequest({
                blobName: form.blobName,
                readerId: form.readerId,
                trainingRunId: form.trainingRunId,
                declaredUse: form.declaredUse,
            });
            setResult(response);
            onNotify(`Receipt logged for ${response.receipt.blobName}.`);
        } catch (cause) {
            if (cause instanceof VaultApiError && cause.status === 403) {
                // A refusal is the system working, so it is reported separately from
                // a transport or configuration failure.
                setDenied(cause.message);
            } else {
                setFailed(
                    cause instanceof VaultApiError
                        ? cause.message
                        : "The read failed before it reached Shelby.",
                );
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <section className="view-header">
                <h2 className="m3-display-small">Read with a receipt</h2>
                <p className="m3-body-large on-surface-variant">
                    A read is checked against the stored license first. When it is allowed, the
                    receipt is written to the receipt_log module on Aptos before the bytes are
                    handed back.
                </p>
            </section>

            <md-outlined-card>
                <div className="card-body">
                    <div className="field-row">
                        <md-outlined-text-field
                            label="Blob name"
                            value={form.blobName}
                            required
                            maxlength={512}
                            supporting-text="Blob to read from Shelby"
                            onInput={update("blobName")}
                        ></md-outlined-text-field>
                        <md-outlined-text-field
                            label="Reader ID"
                            value={form.readerId}
                            required
                            maxlength={512}
                            supporting-text="Who or what is reading, recorded on chain"
                            onInput={update("readerId")}
                        ></md-outlined-text-field>
                    </div>
                    <div className="field-row">
                        <md-outlined-text-field
                            label="Training run ID"
                            value={form.trainingRunId}
                            required
                            maxlength={512}
                            supporting-text="Groups reads so an audit can cover one run"
                            onInput={update("trainingRunId")}
                        ></md-outlined-text-field>
                        <md-outlined-select
                            label="Declared use"
                            value={form.declaredUse}
                            supporting-text="Checked against the license's permitted use"
                            onChange={update("declaredUse")}
                        >
                            {PERMITTED_USES.map((use) => (
                                <md-select-option
                                    key={use}
                                    value={use}
                                    selected={use === form.declaredUse}
                                >
                                    <div slot="headline">{use}</div>
                                </md-select-option>
                            ))}
                        </md-outlined-select>
                    </div>

                    {knownBlobNames.length > 0 && (
                        <>
                            <p className="m3-label-large on-surface-variant">
                                Uploaded in this session
                            </p>
                            <md-chip-set>
                                {knownBlobNames.map((name) => (
                                    <md-assist-chip
                                        key={name}
                                        label={name}
                                        onClick={() =>
                                            setForm((current) => ({ ...current, blobName: name }))
                                        }
                                    ></md-assist-chip>
                                ))}
                            </md-chip-set>
                        </>
                    )}
                </div>
            </md-outlined-card>

            {denied && <ErrorBanner title="Read refused by the license" message={denied} />}
            {failed && <ErrorBanner title="Read failed" message={failed} />}
            {busy && <BusyIndicator label="Checking the license, downloading, and logging…" />}

            <div className="actions-row">
                <md-filled-button disabled={busy} onClick={submit}>
                    Read and log receipt
                </md-filled-button>
            </div>

            {result && (
                <md-filled-card>
                    <div className="card-body">
                        <h3 className="m3-title-large">Receipt</h3>
                        <DetailList
                            rows={[
                                { label: "Blob name", value: result.receipt.blobName },
                                {
                                    label: "Merkle root",
                                    value: result.receipt.merkleRoot,
                                    mono: true,
                                },
                                {
                                    label: "Matches upload",
                                    value: result.receipt.merkleRootMatchesManifest
                                        ? "Yes, the served bytes hash to the root recorded at upload"
                                        : "No, the served bytes do not match the recorded root",
                                },
                                {
                                    label: "Content SHA-256",
                                    value: result.receipt.contentSha256,
                                    mono: true,
                                },
                                { label: "Served bytes", value: `${result.receipt.servedBytes}` },
                                {
                                    label: "Served by account",
                                    value: result.receipt.servedByAccount,
                                    mono: true,
                                },
                                { label: "Served at", value: result.receipt.servedAt },
                                { label: "Reader", value: result.readEvent.readerId },
                                { label: "Training run", value: result.readEvent.trainingRunId },
                                { label: "License ID", value: result.license.licenseId },
                                { label: "Rights holder", value: result.license.rightsHolder },
                                { label: "Permitted use", value: result.license.permittedUse },
                            ]}
                        />
                        <md-divider></md-divider>
                        <p className="m3-body-medium">
                            Anchored on Aptos in transaction{" "}
                            <a
                                className="explorer-link"
                                href={result.explorerUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                <span className="hash-value">
                                    {result.receiptLogTransactionHash}
                                </span>
                            </a>
                        </p>
                    </div>
                </md-filled-card>
            )}
        </>
    );
}
