import type {
  ChannelPlugin,
  MoltbotConfig,
  GroupToolPolicyConfig,
} from "clawdbot/plugin-sdk";
import {
  DEFAULT_ACCOUNT_ID,
} from "clawdbot/plugin-sdk";

import { sendMsg, sendImage, sendRecord, sendVideo, getLoginInfo, getFriendList, getGroupList, probeOneBot } from "./api.js";
import { getOneBotRuntime } from "./runtime.js";
import type { OneBotConfig, OneBotGroupConfig } from "./types.js";

export type ResolvedOneBotAccount = {
  accountId: string;
  name: string;
  enabled: boolean;
  config: OneBotConfig;
};

function resolveOneBotAccount(cfg: MoltbotConfig, accountId: string): ResolvedOneBotAccount {
  const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
  return {
    accountId,
    name: "OneBot",
    enabled: onebotConfig?.enabled ?? false,
    config: onebotConfig ?? {},
  };
}

export const onebotPlugin: ChannelPlugin<ResolvedOneBotAccount> = {
  id: "onebot",
  meta: {
    label: "OneBot (QQ/NapCat)",
    icon: "qq",
  },
  pairing: {
    idLabel: "qqUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^onebot:/i, ""),
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: false,  // OneBot v11 不支持表情回应
    threads: false,
    media: true,       // 支持图片、语音、视频
    nativeCommands: true,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.onebot"] },
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg, accountId) => resolveOneBotAccount(cfg, accountId),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, enabled }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        onebot: {
          ...cfg.channels?.onebot,
          enabled,
        },
      },
    }),
    deleteAccount: ({ cfg }) => {
      const nextChannels = { ...cfg.channels };
      delete nextChannels.onebot;
      return { ...cfg, channels: nextChannels };
    },
    isConfigured: (account) => Boolean(account.config.httpUrl?.trim()),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.config.httpUrl?.trim()),
    }),
    resolveAllowFrom: ({ cfg }) =>
      ((cfg.channels?.onebot as OneBotConfig | undefined)?.allowFrom ?? []).map(String),
  },
  security: {
    resolveDmPolicy: ({ account }) => ({
      policy: account.config.dmPolicy ?? "open",
      allowFrom: account.config.allowFrom ?? [],
      policyPath: "channels.onebot.dmPolicy",
      allowFromPath: "channels.onebot.allowFrom",
    }),
  },
  groups: {
    resolveRequireMention: ({ cfg, groupId }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      const groups = onebotConfig?.groups;
      if (!groups) return true; // 默认需要 @
      const groupConfig = groups[String(groupId)] ?? groups["*"];
      return groupConfig?.requireMention ?? true;
    },
    resolveToolPolicy: ({ cfg, groupId }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      const groups = onebotConfig?.groups;
      if (!groups) return undefined;
      const groupConfig = groups[String(groupId)] ?? groups["*"];
      return groupConfig?.tools as GroupToolPolicyConfig | undefined;
    },
  },
  threading: {
    resolveReplyToMode: () => "off", // QQ 不支持线程回复模式
  },
  directory: {
    self: async ({ cfg }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      if (!onebotConfig?.httpUrl) return null;
      try {
        const result = await getLoginInfo(onebotConfig);
        if (result.status === "ok") {
          return {
            id: String(result.data.user_id),
            name: result.data.nickname,
          };
        }
      } catch {
        // ignore
      }
      return null;
    },
    listPeers: async ({ cfg }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      if (!onebotConfig?.httpUrl) return [];
      try {
        const result = await getFriendList(onebotConfig);
        if (result.status === "ok") {
          return result.data.map((friend) => ({
            id: String(friend.user_id),
            name: friend.remark || friend.nickname,
            kind: "user" as const,
          }));
        }
      } catch {
        // ignore
      }
      return [];
    },
    listGroups: async ({ cfg }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      if (!onebotConfig?.httpUrl) return [];
      try {
        const result = await getGroupList(onebotConfig);
        if (result.status === "ok") {
          return result.data.map((group) => ({
            id: `group:${group.group_id}`,
            name: group.group_name,
            memberCount: group.member_count,
          }));
        }
      } catch {
        // ignore
      }
      return [];
    },
  },
  messaging: {
    normalizeTarget: (target) => target.replace(/^onebot:/i, ""),
    targetResolver: {
      // Note: looksLikeId receives (raw, normalized) - use normalized (2nd arg) for matching
      looksLikeId: (_raw, normalized) => {
        const id = normalized || _raw;
        return /^\d+$/.test(id) || /^(group|user):\d+$/.test(id);
      },
      hint: "<QQ号> or group:<群号>",
    },
  },
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4500,
    sendText: async ({ to, text, cfg }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      if (!onebotConfig?.httpUrl) {
        throw new Error("OneBot not configured");
      }

      const target = to?.trim() ?? "";
      const groupMatch = target.match(/^group:(\d+)$/);
      const userMatch = target.match(/^(?:user:)?(\d+)$/);

      if (groupMatch) {
        const groupId = parseInt(groupMatch[1], 10);
        const result = await sendMsg(onebotConfig, {
          messageType: "group",
          groupId,
          message: text,
        });
        if (result.status === "ok") {
          return { channel: "onebot", messageId: String(result.data.message_id) };
        }
        throw new Error(`API error: ${result.retcode}`);
      }

      if (userMatch) {
        const userId = parseInt(userMatch[1], 10);
        const result = await sendMsg(onebotConfig, {
          messageType: "private",
          userId,
          message: text,
        });
        if (result.status === "ok") {
          return { channel: "onebot", messageId: String(result.data.message_id) };
        }
        throw new Error(`API error: ${result.retcode}`);
      }

      throw new Error(`Invalid target format: ${target}`);
    },
    sendMedia: async ({ to, text, mediaUrl, cfg }) => {
      const onebotConfig = cfg.channels?.onebot as OneBotConfig | undefined;
      if (!onebotConfig?.httpUrl) {
        throw new Error("OneBot not configured");
      }

      const target = to?.trim() ?? "";
      const groupMatch = target.match(/^group:(\d+)$/);
      const userMatch = target.match(/^(?:user:)?(\d+)$/);

      // 检测媒体类型
      const lower = mediaUrl.toLowerCase();
      const isVideo = /\.(mp4|avi|mov|mkv|webm)(\?|$)/i.test(lower);
      const isAudio = /\.(mp3|ogg|wav|m4a|flac|opus)(\?|$)/i.test(lower);

      const sendMediaByType = async (
        messageType: "private" | "group",
        userId?: number,
        groupId?: number,
      ) => {
        if (isVideo) {
          return sendVideo(onebotConfig, {
            messageType,
            userId,
            groupId,
            file: mediaUrl,
            text: text || undefined,
          });
        } else if (isAudio) {
          const result = await sendRecord(onebotConfig, {
            messageType,
            userId,
            groupId,
            file: mediaUrl,
          });
          // 语音消息不支持 caption，单独发送文字
          if (text && result.status === "ok") {
            await sendMsg(onebotConfig, {
              messageType,
              userId,
              groupId,
              message: text,
            });
          }
          return result;
        } else {
          // 默认按图片发送
          return sendImage(onebotConfig, {
            messageType,
            userId,
            groupId,
            file: mediaUrl,
            text: text || undefined,
          });
        }
      };

      if (groupMatch) {
        const groupId = parseInt(groupMatch[1], 10);
        const result = await sendMediaByType("group", undefined, groupId);
        if (result.status === "ok") {
          return { channel: "onebot", messageId: String(result.data.message_id) };
        }
        throw new Error(`API error: ${result.retcode}`);
      }

      if (userMatch) {
        const userId = parseInt(userMatch[1], 10);
        const result = await sendMediaByType("private", userId, undefined);
        if (result.status === "ok") {
          return { channel: "onebot", messageId: String(result.data.message_id) };
        }
        throw new Error(`API error: ${result.retcode}`);
      }

      throw new Error(`Invalid target format: ${target}`);
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ account, timeoutMs }) => {
      if (!account.config.httpUrl) {
        return { ok: false, error: "httpUrl not configured" };
      }
      return probeOneBot(account.config, timeoutMs);
    },
    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.config.httpUrl?.trim()),
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      probe,
      lastInboundAt: runtime?.lastInboundAt ?? null,
      lastOutboundAt: runtime?.lastOutboundAt ?? null,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      ctx.setStatus({ accountId: ctx.accountId, running: true });
      ctx.log?.info("OneBot provider started (webhook via Gateway at /webhook/onebot)");
      return new Promise<void>((resolve) => {
        ctx.abortSignal?.addEventListener("abort", () => {
          ctx.log?.info("OneBot provider stopping");
          resolve();
        });
      });
    },
  },
};
