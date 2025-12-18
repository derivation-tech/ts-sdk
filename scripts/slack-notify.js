#!/usr/bin/env node
"use strict";

const https = require("https");
const { readFileSync } = require("fs");
const { resolve } = require("path");

function getPackageMetadata() {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    try {
        const raw = readFileSync(packageJsonPath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        console.error(`[slack-notify] Unable to read package.json at ${packageJsonPath}: ${error.message}`);
        return null;
    }
}

function buildPayload(pkg, extraText) {
    const baseText = `📦 *${pkg.name}@${pkg.version}* has just been published to npm.`;
    if (extraText) {
        return { text: `${baseText}\n${extraText}` };
    }
    return { text: baseText };
}

function postToSlack(webhookUrl, payload) {
    return new Promise((resolvePromise) => {
        try {
            const request = https.request(
                webhookUrl,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                },
                (response) => {
                    const status = response.statusCode ?? 0;
                    if (status >= 200 && status < 300) {
                        resolvePromise({ ok: true });
                    } else {
                        console.error(`[slack-notify] Slack responded with status ${status}`);
                        resolvePromise({ ok: false });
                    }
                }
            );

            request.on("error", (err) => {
                console.error(`[slack-notify] Failed to reach Slack webhook: ${err.message}`);
                resolvePromise({ ok: false });
            });

            request.write(JSON.stringify(payload));
            request.end();
        } catch (error) {
            console.error(`[slack-notify] Unexpected error: ${error.message}`);
            resolvePromise({ ok: false });
        }
    });
}

async function main() {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("[slack-notify] SLACK_WEBHOOK_URL not set; skipping Slack notification.");
        return;
    }

    const pkg = getPackageMetadata();
    if (!pkg) {
        console.warn("[slack-notify] Package metadata unavailable; skipping Slack notification.");
        return;
    }

    const extraText = process.env.SLACK_MESSAGE_SUFFIX;
    const payload = buildPayload(pkg, extraText);
    const result = await postToSlack(webhookUrl, payload);
    if (result.ok) {
        console.log("[slack-notify] Slack notification sent.");
    } else {
        console.warn("[slack-notify] Slack notification failed.");
    }
}

main().catch((error) => {
    console.error(`[slack-notify] Fatal error: ${error.message}`);
});
