import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { uploadDataset, uploadLicensedFile } from "./uploadPipeline.js";

/**
 * Command line entry point for the two npm upload scripts. Licenses are read from
 * a JSON file rather than command line flags so the exact rights text that was
 * approved can be kept under version control alongside the dataset.
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

function readJsonFile(path: string): unknown {
    const resolvedPath = resolve(path);
    try {
        return JSON.parse(readFileSync(resolvedPath, "utf8"));
    } catch (cause) {
        throw new Error(`Could not read JSON from ${resolvedPath}`, { cause });
    }
}

async function runFileUpload(flags: Record<string, string>): Promise<void> {
    const filePath = flags.file;
    const licensePath = flags.license;
    if (!filePath || !licensePath) {
        throw new Error(
            "Usage: npm run upload:file -- --file <path> --license <license.json> [--blob-name <name>] [--days <n>]",
        );
    }
    const resolvedFile = resolve(filePath);
    const blobName = flags["blob-name"] ?? resolvedFile.split("/").pop() ?? "blob";
    const expirationDays = Number(flags.days ?? "30");

    const { entry } = await uploadLicensedFile({
        filePath: resolvedFile,
        blobName,
        license: readJsonFile(licensePath),
        expirationDays,
        rootDirectory: dirname(resolvedFile),
    });
    console.log(
        `Uploaded ${entry.blobName} (${entry.sizeBytes} bytes)\n` +
        `  merkle root: ${entry.merkleRoot}\n` +
        `  license: ${entry.license.licenseId} for ${entry.license.permittedUse}, expires ${entry.license.expiresAt}\n` +
        `  blob expires: ${entry.blobExpiresAt}`,
    );
}

async function runDatasetUpload(flags: Record<string, string>): Promise<void> {
    const directory = flags.dir;
    const licensesPath = flags.licenses;
    if (!directory || !licensesPath) {
        throw new Error(
            "Usage: npm run upload:dataset -- --dir <path> --licenses <licenses.json> [--prefix <p>] [--days <n>]",
        );
    }
    const licensesByFile = readJsonFile(licensesPath);
    if (licensesByFile === null || typeof licensesByFile !== "object" || Array.isArray(licensesByFile)) {
        throw new Error(`${licensesPath} must contain a JSON object keyed by file name.`);
    }

    const report = await uploadDataset({
        directory,
        licensesByFile: licensesByFile as Record<string, unknown>,
        expirationDays: Number(flags.days ?? "30"),
        blobNamePrefix: flags.prefix ?? "",
    });
    console.log(`Uploaded ${report.uploaded.length} file(s):`);
    for (const entry of report.uploaded) {
        console.log(`  ${entry.blobName} ${entry.merkleRoot} ${entry.license.licenseId}`);
    }
}

async function main(): Promise<void> {
    const [mode, ...rest] = process.argv.slice(2);
    const flags = parseFlags(rest);
    if (mode === "file") {
        await runFileUpload(flags);
        return;
    }
    if (mode === "dataset") {
        await runDatasetUpload(flags);
        return;
    }
    throw new Error("First argument must be 'file' or 'dataset'.");
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
