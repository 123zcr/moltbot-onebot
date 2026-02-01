/**
 * OneBot v11 协议类型定义
 * 支持 NapCat、Lagrange 等 OneBot 实现
 */

export type OneBotConfig = {
  enabled?: boolean;
  /** HTTP API 地址，如 http://127.0.0.1:3000 */
  httpUrl?: string;
  /** WebSocket 地址，如 ws://127.0.0.1:3001 */
  wsUrl?: string;
  /** Access Token 用于鉴权 */
  accessToken?: string;
  /** DM 策略: open/pairing/disabled */
  dmPolicy?: "open" | "pairing" | "disabled";
  /** 允许的用户列表 */
  allowFrom?: (string | number)[];
  /** 群聊策略 */
  groupPolicy?: "open" | "allowlist" | "disabled";
  /** 允许的群列表 */
  groups?: Record<string, OneBotGroupConfig>;
  /** 机器人 QQ 号 (用于检测 @) */
  selfId?: string | number;
};

/** 群组配置 */
export type OneBotGroupConfig = {
  enabled?: boolean;
  requireMention?: boolean;
  users?: (string | number)[];
  /** 工具策略覆盖 */
  tools?: {
    allow?: string[];
    alsoAllow?: string[];
    deny?: string[];
  };
  toolsBySender?: Record<string, {
    allow?: string[];
    alsoAllow?: string[];
    deny?: string[];
  }>;
};

/** OneBot 事件基础结构 */
export type OneBotEvent = {
  time: number;
  self_id: number;
  post_type: "message" | "notice" | "request" | "meta_event";
};

/** 消息事件 */
export type OneBotMessageEvent = OneBotEvent & {
  post_type: "message";
  message_type: "private" | "group";
  sub_type: string;
  message_id: number;
  user_id: number;
  message: OneBotMessage[];
  raw_message: string;
  font: number;
  sender: OneBotSender;
  // 私聊特有
  temp_source?: number;
  // 群聊特有
  group_id?: number;
  anonymous?: {
    id: number;
    name: string;
    flag: string;
  } | null;
};

/** 消息段 */
export type OneBotMessage =
  | { type: "text"; data: { text: string } }
  | { type: "face"; data: { id: string } }
  | { type: "image"; data: { file: string; url?: string } }
  | { type: "record"; data: { file: string; url?: string } }
  | { type: "video"; data: { file: string; url?: string } }
  | { type: "at"; data: { qq: string | "all" } }
  | { type: "reply"; data: { id: string } }
  | { type: "forward"; data: { id: string } }
  | { type: "json"; data: { data: string } }
  | { type: "xml"; data: { data: string } }
  | { type: "file"; data: { file: string; name?: string } }
  | { type: string; data: Record<string, unknown> };

/** 发送者信息 */
export type OneBotSender = {
  user_id: number;
  nickname: string;
  sex?: "male" | "female" | "unknown";
  age?: number;
  // 群聊特有
  card?: string;
  area?: string;
  level?: string;
  role?: "owner" | "admin" | "member";
  title?: string;
};

/** API 响应 */
export type OneBotApiResponse<T = unknown> = {
  status: "ok" | "failed";
  retcode: number;
  data: T;
  echo?: string;
};

/** 发送消息响应 */
export type OneBotSendMsgResponse = {
  message_id: number;
};

/** 登录信息 */
export type OneBotLoginInfo = {
  user_id: number;
  nickname: string;
};
