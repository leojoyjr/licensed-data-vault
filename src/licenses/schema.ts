/**
 * License metadata attached to every file in the vault.
 *
 * Expiry is stored per file rather than per dataset because a dataset is only as
 * compliant as its most restrictive asset. One image whose license lapsed last
 * month taints a training run even if the other ten thousand files are clear, so
 * the expiry check has to happen at the level of the individual asset.
 */
export const PERMITTED_USES = ["training", "inference", "evaluation"] as const;

export type PermittedUse = (typeof PERMITTED_USES)[number];

export interface LicenseMetadata {
    /** Stable identifier for the license agreement, unique within the vault. */
    licenseId: string;
    /** Legal entity or person who holds the rights being granted. */
    rightsHolder: string;
    /** What the license actually allows the data to be used for. */
    permittedUse: PermittedUse;
    /** ISO 8601 timestamp after which the file may no longer be used. */
    expiresAt: string;
    /** Where the file was lawfully obtained, for example a signed vendor agreement. */
    source: string;
}

/** One row of the local manifest, joining a stored blob to its license. */
export interface ManifestEntry {
    blobName: string;
    /** Hex blob merkle root returned by Shelby's commitment generation. */
    merkleRoot: string;
    license: LicenseMetadata;
    /** ISO 8601 time the upload completed. */
    uploadedAt: string;
    /** ISO 8601 time the blob itself expires on Shelby, distinct from license expiry. */
    blobExpiresAt: string;
    sizeBytes: number;
}
