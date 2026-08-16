import { useEffect } from "react";
import "./material.js";

/**
 * Shared feedback pieces: an error banner, a busy indicator, and a snackbar.
 * They live in one file because all three exist only to report the state of a
 * request, and keeping them together keeps that vocabulary consistent.
 */

export interface ErrorBannerProps {
    title: string;
    message: string;
}

/**
 * Errors are announced through role="alert" so a screen reader hears a refused
 * read without the user hunting for what changed.
 */
export function ErrorBanner({ title, message }: ErrorBannerProps) {
    return (
        <div className="error-banner" role="alert">
            <p className="m3-title-medium">{title}</p>
            <p className="m3-body-medium">{message}</p>
        </div>
    );
}

export interface BusyIndicatorProps {
    label: string;
}

/**
 * Indeterminate progress, since Shelby uploads and chain submissions give no
 * completion percentage. aria-live polite reports the label without interrupting.
 */
export function BusyIndicator({ label }: BusyIndicatorProps) {
    return (
        <div className="status-row" aria-live="polite">
            <md-circular-progress indeterminate aria-hidden="true"></md-circular-progress>
            <span className="m3-body-medium">{label}</span>
        </div>
    );
}

export interface SnackbarProps {
    message: string;
    onDismiss: () => void;
}

/** Auto-dismiss window from the M3 snackbar spec's short duration guidance. */
const SNACKBAR_DURATION_MS = 6000;

export function Snackbar({ message, onDismiss }: SnackbarProps) {
    useEffect(() => {
        const timer = window.setTimeout(onDismiss, SNACKBAR_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [message, onDismiss]);

    return (
        <div className="snackbar" role="status">
            <span className="m3-body-medium">{message}</span>
            <md-text-button onClick={onDismiss}>Dismiss</md-text-button>
        </div>
    );
}

export interface DetailRow {
    label: string;
    value: string;
    /** Renders in a monospace face, for hashes and merkle roots. */
    mono?: boolean;
}

/**
 * Description list for receipt and license fields. A dl carries the key to value
 * relationship that a pile of divs would lose.
 */
export function DetailList({ rows }: { rows: readonly DetailRow[] }) {
    return (
        <dl className="detail-grid">
            {rows.map((row) => (
                <div key={row.label} style={{ display: "contents" }}>
                    <dt>{row.label}</dt>
                    <dd className={row.mono ? "hash-value" : undefined}>{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}
