import type { PermittedUse } from "../licenses/schema.js";
import { PERMITTED_USES } from "../licenses/schema.js";
import { readLicensedBlob } from "./receiptMiddleware.js";

/**
 * Demo entry point for a licensed read. It prints the receipt rather than the
 * bytes, because the point of the demo is the provenance record, and training
 * content does not belong in a terminal log.
 */
function parseFlags(argv: string[]): Record<string, string> {
    const flags: Record<string, string> = {};
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith("--")) {
            continue;
        }
        const key = token.slice(2);
        const value = argv[index + 1];
        if (value === undefined || value.startsWith("--")) {
            throw new Error(`Flag --${key} requires a value.`);
        }
        flags[key] = value;
        index += 1;
    }
    return flags;
}

function parseDeclaredUse(value: string | undefined): PermittedUse {
    const declaredUse = value ?? "training";
    if (!(PERMITTED_USES as readonly string[]).includes(declaredUse)) {
        throw new Error(`--use must be one of ${PERMITTED_USES.join(", ")}.`);
    }
    return declaredUse as PermittedUse;
}

async function main(): Promise<void> {
    const flags = parseFlags(process.argv.slice(2));
    const blobName = flags["blob-name"];
    const readerId = flags.reader;
    const trainingRunId = flags.run;
    if (!blobName || !readerId || !trainingRunId) {
        throw new Error(
            "Usage: npm run read:blob -- --blob-name <name> --reader <id> --run <runId> [--use training]",
        );
    }

    const result = await readLicensedBlob({
        blobName,
        readerId,
        trainingRunId,
        declaredUse: parseDeclaredUse(flags.use),
    });

    console.log(
        `Read ${result.receipt.blobName} (${result.receipt.servedBytes} bytes)\n` +
        `  served by account: ${result.receipt.servedByAccount}\n` +
        `  merkle root: ${result.receipt.merkleRoot}\n` +
        `  matches upload root: ${result.receipt.merkleRootMatchesManifest}\n` +
        `  content sha256: ${result.receipt.contentSha256}\n` +
        `  served at: ${result.receipt.servedAt}\n` +
        `  license: ${result.license.licenseId} (${result.license.rightsHolder}) for ${result.license.permittedUse}, expires ${result.license.expiresAt}\n` +
        `  read event: reader ${result.readEvent.readerId}, run ${result.readEvent.trainingRunId}`,
    );
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
