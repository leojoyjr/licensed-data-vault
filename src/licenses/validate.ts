import {
    PERMITTED_USES,
    type LicenseMetadata,
    type PermittedUse,
} from "./schema.js";

/** Thrown for any license that fails validation, so callers can catch one type. */
export class LicenseValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LicenseValidationError";
    }
}

function requireNonEmptyString(
    value: unknown,
    fieldName: string,
): string {
    if (typeof value !== "string" || value.trim() === "") {
        throw new LicenseValidationError(
            `License field '${fieldName}' must be a non-empty string.`,
        );
    }
    return value.trim();
}

function isPermittedUse(value: unknown): value is PermittedUse {
    return typeof value === "string" && (PERMITTED_USES as readonly string[]).includes(value);
}

/**
 * Validates untrusted license input and returns a normalized LicenseMetadata.
 * This is the only way license metadata should enter the system, since the
 * upload pipeline trusts whatever this function returns.
 *
 * @param now Injectable clock so tests can check expiry without waiting.
 */
export function validateLicenseMetadata(
    input: unknown,
    now: Date = new Date(),
): LicenseMetadata {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
        throw new LicenseValidationError("License metadata must be an object.");
    }

    const candidate = input as Record<string, unknown>;

    const licenseId = requireNonEmptyString(candidate.licenseId, "licenseId");
    const rightsHolder = requireNonEmptyString(candidate.rightsHolder, "rightsHolder");
    const source = requireNonEmptyString(candidate.source, "source");

    if (!isPermittedUse(candidate.permittedUse)) {
        throw new LicenseValidationError(
            `License field 'permittedUse' must be one of: ${PERMITTED_USES.join(", ")}.`,
        );
    }

    const expiresAtRaw = requireNonEmptyString(candidate.expiresAt, "expiresAt");
    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) {
        throw new LicenseValidationError(
            `License field 'expiresAt' must be an ISO 8601 timestamp, got '${expiresAtRaw}'.`,
        );
    }
    // A date-only string parses fine but silently means midnight UTC, which is a
    // different expiry than the operator likely intended, so require a full timestamp.
    if (!expiresAtRaw.includes("T")) {
        throw new LicenseValidationError(
            `License field 'expiresAt' must include a time, for example 2030-01-01T00:00:00Z.`,
        );
    }
    if (expiresAt.getTime() <= now.getTime()) {
        throw new LicenseValidationError(
            `License '${licenseId}' expired at ${expiresAt.toISOString()} and cannot be attached to an upload.`,
        );
    }

    return {
        licenseId,
        rightsHolder,
        permittedUse: candidate.permittedUse,
        expiresAt: expiresAt.toISOString(),
        source,
    };
}

/**
 * True when the license is still valid at `now` and covers `intendedUse`.
 * Used by the read path, where the license was already validated at upload time
 * but may have expired since.
 */
export function isLicenseUsableFor(
    license: LicenseMetadata,
    intendedUse: PermittedUse,
    now: Date = new Date(),
): { usable: true } | { usable: false; reason: string } {
    const expiresAt = new Date(license.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
        return {
            usable: false,
            reason: `License '${license.licenseId}' has an unparseable expiresAt value.`,
        };
    }
    if (expiresAt.getTime() <= now.getTime()) {
        return {
            usable: false,
            reason: `License '${license.licenseId}' expired at ${expiresAt.toISOString()}.`,
        };
    }
    if (license.permittedUse !== intendedUse) {
        return {
            usable: false,
            reason: `License '${license.licenseId}' permits '${license.permittedUse}', not '${intendedUse}'.`,
        };
    }
    return { usable: true };
}
