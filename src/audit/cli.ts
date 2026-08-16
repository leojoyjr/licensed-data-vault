import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
    formatAuditReport,
    formatAuditReportAsMarkdown,
    generateAuditReport,
} from "./reportGenerator.js";

/**
 * Generates the compliance report for one training run and exits non-zero when the
 * run is not compliant. The exit code matters: it lets a CI job or a release gate
 * block a model whose training data cannot be shown to have been licensed.
 */
const REPORTS_DIRECTORY = resolve(process.cwd(), "reports");

/** Run IDs become part of a file name, so anything that is not a plain identifier is refused. */
const SAFE_RUN_ID = /^[A-Za-z0-9._-]+$/;

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
            // --json takes no value, so it is recorded as a bare switch.
            flags[key] = "true";
            continue;
        }
        flags[key] = value;
        index += 1;
    }
    return flags;
}

/**
 * Resolves an explicit --out path and refuses anything that escapes the working
 * directory. The report path is partly caller-supplied, and a caller who can choose
 * an arbitrary destination can overwrite files outside the project.
 */
function resolveOutputPath(requestedPath: string): string {
    const outPath = resolve(process.cwd(), requestedPath);
    const relativePath = relative(process.cwd(), outPath);
    if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error(
            `--out must name a path inside ${process.cwd()}, got ${requestedPath}.`,
        );
    }
    return outPath;
}

/** reports/audit-<runId>-<date>.md, the default destination when --out is omitted. */
function defaultReportPath(trainingRunId: string): string {
    const day = new Date().toISOString().slice(0, 10);
    return resolve(REPORTS_DIRECTORY, `audit-${trainingRunId}-${day}.md`);
}

function writeReportFile(outPath: string, contents: string): void {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, contents, "utf8");
    console.log(`Wrote report to ${outPath}`);
}

async function main(): Promise<void> {
    const flags = parseFlags(process.argv.slice(2));
    const trainingRunId = flags.run;
    if (!trainingRunId) {
        throw new Error(
            "Usage: npm run audit:run -- --run <trainingRunId> [--json] [--out reports/run.md]",
        );
    }
    if (!SAFE_RUN_ID.test(trainingRunId)) {
        throw new Error(
            `--run must contain only letters, digits, dot, dash, or underscore, got '${trainingRunId}'. The run ID becomes part of the report file name.`,
        );
    }

    const report = await generateAuditReport({ trainingRunId });
    const wantsJson = flags.json === "true";

    // Markdown is the default written artifact because it is what an auditor reads.
    // JSON is written instead when asked for, so a CI job can parse the same report.
    const outPath = flags.out ? resolveOutputPath(flags.out) : defaultReportPath(trainingRunId);
    const fileContents = outPath.endsWith(".json")
        ? `${JSON.stringify(report, null, 2)}\n`
        : formatAuditReportAsMarkdown(report);
    writeReportFile(outPath, fileContents);

    console.log(wantsJson ? JSON.stringify(report, null, 2) : formatAuditReport(report));

    if (!report.compliant) {
        process.exitCode = 1;
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
