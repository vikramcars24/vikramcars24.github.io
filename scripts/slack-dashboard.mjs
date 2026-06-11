import { promises as fs } from "node:fs";
import path from "node:path";
import {
  fetchConversationHistory,
  fetchConversationInfo,
  fetchConversationReplies,
  fetchUserInfo,
  getSlackToken
} from "./lib/slack-client.mjs";

const rootDir = process.cwd();
const sitePath = (...parts) => path.join(rootDir, ...parts);
const reportDir = sitePath("tmp");
const reportJsonPath = path.join(reportDir, "slack-dashboard.json");
const reportMdPath = path.join(reportDir, "slack-dashboard.md");
const defaultChannels = ["C05T0E67H6J"];

async function main() {
  const token = getSlackToken();
  const now = new Date();
  const { start, end } = previousCalendarMonth(now);
  const channels = getChannelIds();
  const userCache = new Map();

  if (channels.length === 0) {
    throw new Error("Set SLACK_DASHBOARD_CHANNELS to at least one channel ID.");
  }

  const summaries = [];
  for (const channelId of channels) {
    summaries.push(await summarizeChannel(token, channelId, start, end, userCache));
  }

  const report = {
    generatedAt: now.toISOString(),
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${start.toISOString().slice(0, 7)}`
    },
    channels: summaries,
    totals: summarizeTotals(summaries)
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(reportMdPath, renderMarkdown(report), "utf8");

  console.log(`Slack dashboard written to ${reportMdPath}`);
}

async function summarizeChannel(token, channelId, start, end, userCache) {
  const [channel, messages] = await Promise.all([
    fetchConversationInfo(token, channelId),
    fetchConversationHistory(token, channelId, {
      oldest: toSlackTs(start),
      latest: toSlackTs(end),
      limit: 200
    })
  ]);

  const userCounts = new Map();
  const threadRoots = messages.filter((message) => Number(message.reply_count || 0) > 0);
  const activeParticipantIds = new Set();
  let replies = 0;
  let filesShared = 0;
  let reactions = 0;
  let botMessages = 0;

  for (const message of messages) {
    const actor = normalizeActorId(message);
    if (actor) {
      userCounts.set(actor, (userCounts.get(actor) || 0) + 1);
      activeParticipantIds.add(actor);
    }

    filesShared += Array.isArray(message.files) ? message.files.length : 0;
    reactions += sumReactions(message.reactions);

    if (message.subtype === "bot_message" || message.bot_id) {
      botMessages += 1;
    }
  }

  for (const root of threadRoots) {
    const threadMessages = await fetchConversationReplies(token, channelId, root.ts, { limit: 200 });
    const childReplies = threadMessages.slice(1);
    replies += childReplies.length;

    for (const message of childReplies) {
      const actor = normalizeActorId(message);
      if (actor) {
        activeParticipantIds.add(actor);
      }
      filesShared += Array.isArray(message.files) ? message.files.length : 0;
      reactions += sumReactions(message.reactions);
    }
  }

  return {
    channelId,
    channelName: channel.name || channelId,
    messageCount: messages.length,
    threadCount: threadRoots.length,
    replyCount: replies,
    activeParticipants: activeParticipantIds.size,
    filesShared,
    reactions,
    botMessages,
    topPosters: await Promise.all(
      [...userCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(async ([actor, count]) => ({
        actor,
        label: await resolveActorLabel(token, actor, userCache),
        count
      }))
    )
  };
}

function summarizeTotals(channels) {
  return channels.reduce(
    (acc, channel) => {
      acc.messageCount += channel.messageCount;
      acc.threadCount += channel.threadCount;
      acc.replyCount += channel.replyCount;
      acc.filesShared += channel.filesShared;
      acc.reactions += channel.reactions;
      acc.botMessages += channel.botMessages;
      return acc;
    },
    {
      messageCount: 0,
      threadCount: 0,
      replyCount: 0,
      filesShared: 0,
      reactions: 0,
      botMessages: 0
    }
  );
}

function renderMarkdown(report) {
  const lines = [
    "# Slack Dashboard",
    "",
    `- Period: ${report.period.start.slice(0, 10)} to ${report.period.end.slice(0, 10)}`,
    `- Generated: ${report.generatedAt}`,
    `- Channels: ${report.channels.length}`,
    "",
    "## Totals",
    `- Messages: ${report.totals.messageCount}`,
    `- Thread starters: ${report.totals.threadCount}`,
    `- Replies: ${report.totals.replyCount}`,
    `- Files shared: ${report.totals.filesShared}`,
    `- Reactions: ${report.totals.reactions}`,
    `- Bot messages: ${report.totals.botMessages}`,
    ""
  ];

  for (const channel of report.channels) {
    lines.push(`## #${channel.channelName}`);
    lines.push(`- Channel ID: ${channel.channelId}`);
    lines.push(`- Messages: ${channel.messageCount}`);
    lines.push(`- Thread starters: ${channel.threadCount}`);
    lines.push(`- Replies: ${channel.replyCount}`);
    lines.push(`- Active participants: ${channel.activeParticipants}`);
    lines.push(`- Files shared: ${channel.filesShared}`);
    lines.push(`- Reactions: ${channel.reactions}`);
    lines.push(`- Bot messages: ${channel.botMessages}`);
    lines.push("- Top posters:");

    if (channel.topPosters.length === 0) {
      lines.push("  - None");
    } else {
      for (const poster of channel.topPosters) {
        lines.push(`  - ${poster.label}: ${poster.count}`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function getChannelIds() {
  const raw = process.env.SLACK_DASHBOARD_CHANNELS || defaultChannels.join(",");
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function previousCalendarMonth(now) {
  const startCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const startPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  return {
    start: startPreviousMonth,
    end: startCurrentMonth
  };
}

function toSlackTs(date) {
  return String(date.getTime() / 1000);
}

function normalizeActorId(message) {
  return message.user || message.bot_id || message.username || "";
}

function sumReactions(reactions = []) {
  return reactions.reduce((total, reaction) => total + Number(reaction.count || 0), 0);
}

async function resolveActorLabel(token, actor, userCache) {
  if (!actor) {
    return "Unknown";
  }

  if (userCache.has(actor)) {
    return userCache.get(actor);
  }

  if (!actor.startsWith("U")) {
    userCache.set(actor, actor);
    return actor;
  }

  try {
    const user = await fetchUserInfo(token, actor);
    const label =
      user.profile?.display_name ||
      user.profile?.real_name ||
      user.real_name ||
      user.name ||
      actor;
    userCache.set(actor, label);
    return label;
  } catch {
    userCache.set(actor, actor);
    return actor;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
