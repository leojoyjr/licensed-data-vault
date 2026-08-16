import { useRef, useState } from "react";
import { PERMITTED_USES, type PermittedUse } from "../../../src/licenses/schema.js";
import type { ManifestEntry } from "../../../src/licenses/schema.js";
import {
    fileToBase64,
    uploadLicensedFileRequest,
    VaultApiError,
} from "../api/vaultApi.js";
import { BusyIndicator, DetailList, ErrorBanner } from "../components/Feedback.js";
import "../components/material.js";

/**
 * Upload view. Collects a file and its license, then calls the Sprint 2 pipeline
 * through the local API. The license fields mirror LicenseMetadata exactly, so
 * the form cannot drift from what validation accepts.
 */
export interface UploadViewProps {
    onUploaded: (entry: ManifestEntry) => void;
    onNotify: (message: string) => void;
}

interface FormState {
    blobName: string;
    licenseId: string;
    rightsHolder: string;
    permittedUse: PermittedUse;
    expiresAt: string;
    source: string;
    expirationDays: string;
}

/** A year out is a reasonable default license term and keeps the form usable.
 * It is only a prefill: the real expiry comes from the rights agreement. */
function defaultExpiry(): string {
    const oneYearOut = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    return oneYearOut.toISOString().slice(0, 10);
}

const INITIAL_FORM: FormState = {
    blobName: "",
    licenseId: "",
    rightsHolder: "",
    permittedUse: "training",
    expiresAt: defaultExpiry(),
    source: "",
    expirationDays: "7",
};

export function UploadView({ onUploaded, onNotify }: UploadViewProps) {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [entry, setEntry] = useState<ManifestEntry | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Material text fields and selects hold their value on the element itself and
     * emit input or change when it moves, so the new value is read off the event
     * target rather than passed back down through a React value prop.
     */
    const update =
        (field: keyof FormState) =>
            (event: { target: unknown }): void => {
                const target = event.target as { value?: string } | null;
                setForm((current) => ({ ...current, [field]: target?.value ?? "" }));
            };

    async function submit(): Promise<void> {
        if (!file) {
            setError("Choose a file to upload.");
            return;
        }
        setBusy(true);
        setError(null);
        setEntry(null);
        try {
            const response = await uploadLicensedFileRequest({
                blobName: form.blobName,
                fileName: file.name,
                fileBase64: await fileToBase64(file),
                expirationDays: Number(form.expirationDays),
                licenseId: form.licenseId,
                rightsHolder: form.rightsHolder,
                permittedUse: form.permittedUse,
                // The date input gives a day, and the license needs an instant, so
                // end of that day in UTC is used to avoid expiring a license early.
                expiresAt: new Date(`${form.expiresAt}T23:59:59.000Z`).toISOString(),
                source: form.source,
            });
            setEntry(response.entry);
            onUploaded(response.entry);
            onNotify(`Uploaded ${response.entry.blobName} to Shelby.`);
        } catch (cause) {
            setError(
                cause instanceof VaultApiError
                    ? cause.message
                    : "The upload failed before it reached Shelby.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <section className="view-header">
                <h2 className="m3-display-small">Upload licensed data</h2>
                <p className="m3-body-large on-surface-variant">
                    Every file is stored with its license. The license is validated before any
                    bytes leave this machine, so unlicensed data never reaches storage.
                </p>
            </section>

            <md-outlined-card>
                <div className="card-body">
                    <h3 className="m3-title-large">File</h3>
                    <input
                        ref={fileInputRef}
                        className="file-input"
                        type="file"
                        aria-label="Data file to upload"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="field-row">
                        <md-outlined-text-field
                            label="Blob name"
                            value={form.blobName}
                            required
                            maxlength={512}
                            supporting-text="Name this file will have in Shelby storage"
                            onInput={update("blobName")}
                        ></md-outlined-text-field>
                        <md-outlined-text-field
                            label="Blob lifetime in days"
                            value={form.expirationDays}
                            type="number"
                            supporting-text="How long Shelby stores the blob"
                            onInput={update("expirationDays")}
                        ></md-outlined-text-field>
                    </div>
                </div>
            </md-outlined-card>

            <md-outlined-card>
                <div className="card-body">
                    <h3 className="m3-title-large">License</h3>
                    <div className="field-row">
                        <md-outlined-text-field
                            label="License ID"
                            value={form.licenseId}
                            required
                            maxlength={512}
                            onInput={update("licenseId")}
                        ></md-outlined-text-field>
                        <md-outlined-text-field
                            label="Rights holder"
                            value={form.rightsHolder}
                            required
                            maxlength={512}
                            onInput={update("rightsHolder")}
                        ></md-outlined-text-field>
                    </div>
                    <div className="field-row">
                        <md-outlined-select
                            label="Permitted use"
                            value={form.permittedUse}
                            supporting-text="What this license allows the data to be used for"
                            onChange={update("permittedUse")}
                        >
                            {PERMITTED_USES.map((use) => (
                                <md-select-option
                                    key={use}
                                    value={use}
                                    selected={use === form.permittedUse}
                                >
                                    <div slot="headline">{use}</div>
                                </md-select-option>
                            ))}
                        </md-outlined-select>
                        <md-outlined-text-field
                            label="License expires on"
                            value={form.expiresAt}
                            type="date"
                            required
                            onInput={update("expiresAt")}
                        ></md-outlined-text-field>
                    </div>
                    <md-outlined-text-field
                        label="Source"
                        value={form.source}
                        required
                        maxlength={512}
                        supporting-text="Where this file was lawfully obtained"
                        onInput={update("source")}
                    ></md-outlined-text-field>
                </div>
            </md-outlined-card>

            {error && <ErrorBanner title="Upload failed" message={error} />}
            {busy && <BusyIndicator label="Uploading to Shelby and writing the manifest…" />}

            <div className="actions-row">
                <md-filled-button disabled={busy} onClick={submit}>
                    Upload with license
                </md-filled-button>
                <md-outlined-button
                    disabled={busy}
                    onClick={() => {
                        setForm(INITIAL_FORM);
                        setFile(null);
                        setEntry(null);
                        setError(null);
                        if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                        }
                    }}
                >
                    Reset
                </md-outlined-button>
            </div>

            {entry && (
                <md-filled-card>
                    <div className="card-body">
                        <h3 className="m3-title-large">Stored</h3>
                        <DetailList
                            rows={[
                                { label: "Blob name", value: entry.blobName },
                                { label: "Merkle root", value: entry.merkleRoot, mono: true },
                                { label: "Size", value: `${entry.sizeBytes} bytes` },
                                { label: "Uploaded at", value: entry.uploadedAt },
                                { label: "Blob expires at", value: entry.blobExpiresAt },
                                { label: "License ID", value: entry.license.licenseId },
                                { label: "Rights holder", value: entry.license.rightsHolder },
                                { label: "Permitted use", value: entry.license.permittedUse },
                                { label: "License expires", value: entry.license.expiresAt },
                                { label: "Source", value: entry.license.source },
                            ]}
                        />
                    </div>
                </md-filled-card>
            )}
        </>
    );
}
