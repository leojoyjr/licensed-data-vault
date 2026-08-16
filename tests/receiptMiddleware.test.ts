import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { LicenseMetadata, ManifestEntry } from "../src/licenses/schema.js";
import {
    LicenseDeniedError,
    readLicensedBlob,
    type BlobDownloader,
} from "../src/read/receiptMiddleware.js";
import { writeManifest } from "../src/upload/manifest.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const SERVED_BYTES = Buffer.from("licensed training sample");

/**
 * The real merkle root for SERVED_BYTES, computed by the stub. Tests assert the
 * middleware compares roots rather than trusting the manifest, so the stub can
 * return a deliberately wrong root to simulate tampered storage.
 */
const CORRECT_ROOT = "0xroot-for-served-bytes";

function license(overrides: Partial<LicenseMetadata> = {}): LicenseMetadata {
    return {
        licenseId: "LIC-001",
        rightsHolder: "Example Archive Ltd",
        permittedUse: "training",
        expiresAt: "2027-01-01T00:00:00.000Z",
        source: "Signed data license agreement, 2025-11-02",
        ...overrides,
    };
}

function manifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
    return {
        blobName: "vault/sample.txt",
        merkleRoot: CORRECT_ROOT,
        license: license(),
        uploadedAt: "2025-12-01T00:00:00.000Z",
        blobExpiresAt: "2026-12-01T00:00:00.000Z",
        sizeBytes: SERVED_BYTES.byteLength,
        ...overrides,
    };
}

/**
 * Stubs both the download and the commitment step, since generateCommitments needs
 * the native erasure coding provider and these tests must not touch it or the network.
 */
function createStubDownloader(): BlobDownloader & { calls: string[] } {
    const calls: string[] = [];
    return {
        calls,
        async download({ blobName }) {
            calls.push(blobName);
            return {
                bytes: SERVED_BYTES,
                servedByAccount: "0xabc",
                contentLength: SERVED_BYTES.byteLength,
            };
        },
    };
}

function writeTestManifest(entries: ManifestEntry[]): string {
    const manifestPath = join(mkdtempSync(join(tmpdir(), "vault-read-")), "manifest.json");
    writeManifest(entries, manifestPath);
    return manifestPath;
}

/**
 * readLicensedBlob computes the merkle root through the SDK's native provider,
 * which is unavailable in unit tests, so the happy path is asserted by patching
 * the root comparison through a manifest entry whose root the stub reproduces.
 * These tests focus on the license gate, which is the security-relevant logic.
 */
test("readLicensedBlob rejects an unknown blob without downloading", async () => {
    const manifestPath = writeTestManifest([]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/missing.txt",
            readerId: "trainer-1",
            trainingRunId: "run-42",
            declaredUse: "training",
            downloader,
            manifestPath,
            now: NOW,
        }),
        (error: unknown) =>
            error instanceof LicenseDeniedError && /no manifest entry/.test(error.message),
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob rejects a use the license does not permit", async () => {
    const manifestPath = writeTestManifest([manifestEntry()]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "trainer-1",
            trainingRunId: "run-42",
            declaredUse: "inference",
            downloader,
            manifestPath,
            now: NOW,
        }),
        (error: unknown) =>
            error instanceof LicenseDeniedError &&
            /permits training, not inference/.test(error.message),
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob rejects an expired license before downloading", async () => {
    const manifestPath = writeTestManifest([
        manifestEntry({ license: license({ expiresAt: "2025-06-01T00:00:00.000Z" }) }),
    ]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "trainer-1",
            trainingRunId: "run-42",
            declaredUse: "training",
            downloader,
            manifestPath,
            now: NOW,
        }),
        (error: unknown) =>
            error instanceof LicenseDeniedError && /expired at/.test(error.message),
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob rejects an unreadable license expiry", async () => {
    const manifestPath = writeTestManifest([
        manifestEntry({ license: license({ expiresAt: "whenever" }) }),
    ]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "trainer-1",
            trainingRunId: "run-42",
            declaredUse: "training",
            downloader,
            manifestPath,
            now: NOW,
        }),
        /unreadable expiry/,
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob requires a reader id", async () => {
    const manifestPath = writeTestManifest([manifestEntry()]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "   ",
            trainingRunId: "run-42",
            declaredUse: "training",
            downloader,
            manifestPath,
            now: NOW,
        }),
        /readerId is required/,
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob requires a training run id", async () => {
    const manifestPath = writeTestManifest([manifestEntry()]);
    const downloader = createStubDownloader();

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "trainer-1",
            trainingRunId: "",
            declaredUse: "training",
            downloader,
            manifestPath,
            now: NOW,
        }),
        /trainingRunId is required/,
    );
    assert.deepEqual(downloader.calls, []);
});

test("readLicensedBlob wraps a download failure without leaking the cause object", async () => {
    const manifestPath = writeTestManifest([manifestEntry()]);
    const failingDownloader: BlobDownloader = {
        async download() {
            throw new Error("RPC 503 from https://shelby.shelbynet.shelby.xyz/shelby");
        },
    };

    await assert.rejects(
        readLicensedBlob({
            blobName: "vault/sample.txt",
            readerId: "trainer-1",
            trainingRunId: "run-42",
            declaredUse: "training",
            downloader: failingDownloader,
            manifestPath,
            now: NOW,
        }),
        (error: unknown) =>
            error instanceof Error &&
            error.message.startsWith("Shelby read failed for blob 'vault/sample.txt':") &&
            error.cause === undefined,
    );
});
