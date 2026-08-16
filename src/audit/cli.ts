import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { formatAuditReport, generateAuditReport } from "./reportGenerator.js";

/**
 * Generates the compliance report for one training run and exits non-zero when the
 * run is not compliant. The exit code matters: it lets a CI job or a release gate
 * block a model whose training data cannot be shown to have been licensed.
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
            // --json takes no value, so it is recorded as a bare switch.
            flags[key] = "true";
            continue;
        }
        flags[key] = value;
        index += 1;
    }
    return flags;
}

async function main(): Promise<void> {
    const flags = parseFlags(process.argv.slice(2));
    const trainingRunId = flags.run;
    if (!trainingRunId) {
        throw new Error(
            "Usage: npm run audit:run -- --run <trainingRunId> [--json] [--out reports/run.json]",
        );
    }

    const report = await generateAuditReport({ trainingRunId });

    if (flags.out) {
        const outPath = resolve(process.cwd(), flags.out);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
        console.log(`Wrote report to ${outPath}`);
    }

    console.log(flags.json === "true" ? JSON.stringify(report, null, 2) : formatAuditReport(report));

    if (!report.compliant) {
        process.exitCode = 1;
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
