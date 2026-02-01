/**
 * OneBot v11 API 封装
 */

import type {
  OneBotConfig,
  OneBotApiResponse,
  OneBotSendMsgResponse,
  OneBotLoginInfo,
  OneBotMessage,
} from "./types.js";

/**
 * 调用 OneBot HTTP API
 */
export async function callOneBotApi<T = unknown>(
  config: OneBotConfig,
  action: string,
  params: Record<string, unknown> = {}
): Promise<OneBotApiResponse<T>> {
  const baseUrl = config.httpUrl?.replace(/\/$/, "") || "http://127.0.0.1:3000";
  const url = `${baseUrl}/${action}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.accessToken) {
    headers["Authorization"] = `Bearer ${config.accessToken}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  return (await response.json()) as OneBotApiResponse<T>;
}

/**
 * 发送私聊消息
 */
export async function sendPrivateMsg(
  config: OneBotConfig,
  userId: number,
  message: string | OneBotMessage[]
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const msg = typeof message === "string" 
    ? [{ type: "text", data: { text: message } }] 
    : message;

  return callOneBotApi<OneBotSendMsgResponse>(config, "send_private_msg", {
    user_id: userId,
    message: msg,
  });
}

/**
 * 发送群消息
 */
export async function sendGroupMsg(
  config: OneBotConfig,
  groupId: number,
  message: string | OneBotMessage[]
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const msg = typeof message === "string" 
    ? [{ type: "text", data: { text: message } }] 
    : message;

  return callOneBotApi<OneBotSendMsgResponse>(config, "send_group_msg", {
    group_id: groupId,
    message: msg,
  });
}

/**
 * 发送消息 (自动判断私聊/群聊)
 */
export async function sendMsg(
  config: OneBotConfig,
  params: {
    messageType: "private" | "group";
    userId?: number;
    groupId?: number;
    message: string | OneBotMessage[];
  }
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const msg = typeof params.message === "string" 
    ? [{ type: "text", data: { text: params.message } }] 
    : params.message;

  if (params.messageType === "private" && params.userId) {
    return sendPrivateMsg(config, params.userId, msg);
  } else if (params.messageType === "group" && params.groupId) {
    return sendGroupMsg(config, params.groupId, msg);
  }

  throw new Error("Invalid message params");
}

/**
 * 获取登录信息
 */
export async function getLoginInfo(
  config: OneBotConfig
): Promise<OneBotApiResponse<OneBotLoginInfo>> {
  return callOneBotApi<OneBotLoginInfo>(config, "get_login_info");
}

/**
 * 获取消息
 */
export async function getMsg(
  config: OneBotConfig,
  messageId: number
): Promise<OneBotApiResponse<{
  message_id: number;
  real_id: number;
  sender: { user_id: number; nickname: string };
  time: number;
  message: OneBotMessage[];
  raw_message: string;
}>> {
  return callOneBotApi(config, "get_msg", { message_id: messageId });
}

/**
 * 撤回消息
 */
export async function deleteMsg(
  config: OneBotConfig,
  messageId: number
): Promise<OneBotApiResponse<null>> {
  return callOneBotApi<null>(config, "delete_msg", { message_id: messageId });
}

/**
 * 获取群信息
 */
export async function getGroupInfo(
  config: OneBotConfig,
  groupId: number,
  noCache = false
): Promise<OneBotApiResponse<{
  group_id: number;
  group_name: string;
  member_count: number;
  max_member_count: number;
}>> {
  return callOneBotApi(config, "get_group_info", {
    group_id: groupId,
    no_cache: noCache,
  });
}

/**
 * 获取群成员信息
 */
export async function getGroupMemberInfo(
  config: OneBotConfig,
  groupId: number,
  userId: number,
  noCache = false
): Promise<OneBotApiResponse<{
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  sex: string;
  age: number;
  area: string;
  join_time: number;
  last_sent_time: number;
  level: string;
  role: "owner" | "admin" | "member";
  title: string;
}>> {
  return callOneBotApi(config, "get_group_member_info", {
    group_id: groupId,
    user_id: userId,
    no_cache: noCache,
  });
}

/**
 * QQ 系统表情 ID 到名字的映射（完整版）
 */
const QQ_FACE_MAP: Record<number, string> = {
  // 经典表情 0-40
  0: "惊讶", 1: "撇嘴", 2: "色", 3: "发呆", 4: "得意", 5: "流泪",
  6: "害羞", 7: "闭嘴", 8: "睡", 9: "大哭", 10: "尴尬", 11: "发怒",
  12: "调皮", 13: "呲牙", 14: "微笑", 15: "难过", 16: "酷", 17: "非典",
  18: "抓狂", 19: "吐", 20: "偷笑", 21: "可爱", 22: "白眼", 23: "傲慢",
  24: "饥饿", 25: "困", 26: "惊恐", 27: "流汗", 28: "憨笑", 29: "悠闲",
  30: "奋斗", 31: "咒骂", 32: "疑问", 33: "嘘", 34: "晕", 35: "折磨",
  36: "衰", 37: "骷髅", 38: "敲打", 39: "再见", 40: "发抖",
  // 41-60
  41: "爱情", 42: "跳跳", 43: "猪头", 44: "拥抱", 45: "蛋糕", 46: "闪电",
  47: "炸弹", 48: "刀", 49: "足球", 50: "便便", 51: "咖啡", 52: "饭",
  53: "蛋糕", 54: "闪电", 55: "炸弹", 56: "刀", 57: "足球", 58: "瓢虫",
  59: "便便", 60: "咖啡",
  // 61-80
  61: "饭", 62: "玫瑰", 63: "凋谢", 64: "示爱", 65: "爱心", 66: "心碎",
  67: "心碎", 68: "蛋糕", 69: "礼物", 70: "闪电", 71: "炸弹", 72: "刀",
  73: "足球", 74: "太阳", 75: "月亮", 76: "赞", 77: "踩", 78: "握手",
  79: "胜利", 80: "抱拳",
  // 81-100
  81: "勾引", 82: "拳头", 83: "差劲", 84: "爱你", 85: "飞吻", 86: "怄火",
  87: "NO", 88: "OK", 89: "西瓜", 90: "爱情", 91: "飞吻", 92: "跳跳",
  93: "发抖", 94: "怄火", 95: "转圈", 96: "冷汗", 97: "擦汗", 98: "抠鼻",
  99: "鼓掌", 100: "糗大了",
  // 101-120
  101: "坏笑", 102: "左哼哼", 103: "右哼哼", 104: "哈欠", 105: "鄙视",
  106: "委屈", 107: "快哭了", 108: "阴险", 109: "亲亲", 110: "吓",
  111: "可怜", 112: "菜刀", 113: "啤酒", 114: "篮球", 115: "乒乓",
  116: "咖啡", 117: "饭", 118: "猪头", 119: "玫瑰", 120: "凋谢",
  // 121-140
  121: "示爱", 122: "爱心", 123: "心碎", 124: "蛋糕", 125: "闪电",
  126: "炸弹", 127: "刀", 128: "足球", 129: "瓢虫", 130: "便便",
  131: "月亮", 132: "太阳", 133: "礼物", 134: "拥抱", 135: "赞",
  136: "踩", 137: "握手", 138: "胜利", 139: "抱拳", 140: "勾引",
  // 141-160
  141: "拳头", 142: "差劲", 143: "爱你", 144: "NO", 145: "OK",
  146: "爱情", 147: "飞吻", 148: "跳跳", 149: "发抖", 150: "怄火",
  151: "转圈", 152: "磕头", 153: "回头", 154: "跳绳", 155: "挥手",
  156: "激动", 157: "街舞", 158: "献吻", 159: "左太极", 160: "右太极",
  // 161-180
  161: "双喜", 162: "鞭炮", 163: "灯笼", 164: "发财", 165: "K歌",
  166: "购物", 167: "邮件", 168: "帅", 169: "喝彩", 170: "祈祷",
  171: "爆筋", 172: "棒棒糖", 173: "喝奶", 174: "下面", 175: "香蕉",
  176: "飞机", 177: "开车", 178: "左车头", 179: "车厢", 180: "右车头",
  // 181-200
  181: "多云", 182: "下雨", 183: "钞票", 184: "熊猫", 185: "灯泡",
  186: "风车", 187: "闹钟", 188: "打伞", 189: "彩球", 190: "钻戒",
  191: "沙发", 192: "纸巾", 193: "药", 194: "手枪", 195: "青蛙",
  196: "茶", 197: "眨眼睛", 198: "泪奔", 199: "无奈", 200: "卖萌",
  // 201-220
  201: "小纠结", 202: "喷血", 203: "斜眼笑", 204: "doge", 205: "惊喜",
  206: "骚扰", 207: "笑哭", 208: "我最美", 209: "河蟹", 210: "羊驼",
  211: "栗子", 212: "幽灵", 213: "蛋", 214: "菊花", 215: "红包",
  216: "大笑", 217: "不开心", 218: "冷漠", 219: "呃", 220: "好棒",
  // 221-240
  221: "拜托", 222: "点赞", 223: "无聊", 224: "托脸", 225: "吃",
  226: "送花", 227: "害怕", 228: "花痴", 229: "小样儿", 230: "飙泪",
  231: "我不看", 232: "托腮", 233: "啵啵", 234: "糊脸", 235: "拍头",
  236: "扯一扯", 237: "舔一舔", 238: "蹭一蹭", 239: "拽炸天", 240: "顶呱呱",
  // 241-260
  241: "抱抱", 242: "暴击", 243: "开枪", 244: "撩一撩", 245: "拍桌",
  246: "拍手", 247: "恭喜", 248: "干杯", 249: "嘲讽", 250: "哼",
  251: "佛系", 252: "掐一掐", 253: "惊呆", 254: "颤抖", 255: "啃头",
  256: "偷看", 257: "扇脸", 258: "原谅", 259: "喷脸", 260: "生日快乐",
  // 261-280
  261: "头撞击", 262: "甩头", 263: "扔狗", 264: "加油必胜", 265: "加油抱抱",
  266: "口罩护体", 267: "搬砖中", 268: "忙到飞起", 269: "脑阔疼", 270: "沧桑",
  271: "捂脸", 272: "辣眼睛", 273: "哦哟", 274: "头秃", 275: "问号脸",
  276: "暗中观察", 277: "emm", 278: "吃瓜", 279: "呵呵哒", 280: "我酸了",
  // 281-300
  281: "太南了", 282: "辣椒酱", 283: "汪汪", 284: "汗", 285: "打脸",
  286: "击掌", 287: "无眼笑", 288: "敬礼", 289: "狂笑", 290: "面无表情",
  291: "摸鱼", 292: "魔鬼笑", 293: "哦", 294: "请", 295: "睁眼",
  296: "敲开心", 297: "震惊", 298: "让我康康", 299: "摸锦鲤", 300: "期待",
  // 301-320
  301: "拿到红包", 302: "真好", 303: "拜谢", 304: "元宝", 305: "牛啊",
  306: "胖三斤", 307: "好闪", 308: "左拜年", 309: "右拜年", 310: "红包包",
  311: "右亲亲", 312: "牛气冲天", 313: "喵喵", 314: "求红包", 315: "谢红包",
  316: "新年烟花", 317: "打call", 318: "变形", 319: "嗑到了", 320: "仔细分析",
  // 321-340
  321: "加油", 322: "我没事", 323: "菜狗", 324: "崇拜", 325: "比心",
  326: "庆祝", 327: "老色痞", 328: "拒绝", 329: "嫌弃", 330: "吃糖",
  331: "惊吓", 332: "生气", 333: "加一", 334: "减一", 335: "合十",
  336: "裂开", 337: "墨镜", 338: "社会社会", 339: "旺柴", 340: "好的",
  // 341-360  
  341: "举牌牌", 342: "豹子头", 343: "假笑", 344: "打招呼", 345: "摸摸",
  346: "酸Q", 347: "我方了", 348: "大怨种", 349: "红包多多", 350: "烟花",
  351: "福", 352: "花朝节", 353: "发红包", 354: "我想开了", 355: "疑惑",
  // 超级表情/动态表情 (400+)
  // 这些是NapCat/go-cqhttp特有的动态表情ID
  400: "比心", 401: "心动", 402: "鼓掌", 403: "撒花", 404: "炫舞",
  405: "翻跟头", 406: "跳跳", 407: "惊喜", 408: "仔细分析", 409: "变形",
  // 450+ 
  450: "比心", 451: "飞吻", 452: "抱抱", 453: "撒娇", 454: "啾啾",
  455: "么么哒", 456: "给心心", 457: "打气", 458: "眨眼", 459: "酷",
  460: "调皮", 461: "可爱", 462: "得意", 463: "难过", 464: "呆",
  465: "生气", 466: "惊讶", 467: "汗", 468: "吐", 469: "睡",
  // 500+ (新版表情)
  500: "好耶", 501: "芭比Q", 502: "小叶子举牌", 503: "汤圆", 504: "元宵快乐",
};

/**
 * NapCat 实测支持的表情 ID 白名单
 * 只有这些 ID 能正常发送，其他都会失败
 */
const NAPCAT_SAFE_FACE_IDS = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  // 基础表情 0-39 通常都支持
  96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  // 部分经典表情
]);

/**
 * QQ 表情名字到 ID 的反向映射
 * 只映射 NapCat 支持的安全 ID
 */
const QQ_FACE_NAME_TO_ID: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  // 遍历映射表，只保留安全的 ID
  for (const [idStr, name] of Object.entries(QQ_FACE_MAP)) {
    const id = parseInt(idStr, 10);
    // 只添加在白名单中的 ID，且优先使用小的 ID
    if (NAPCAT_SAFE_FACE_IDS.has(id)) {
      if (!(name in map) || id < map[name]) {
        map[name] = id;
      }
    }
  }
  return map;
})();

/**
 * 根据表情名字获取 ID
 */
export function getFaceIdByName(name: string): number | undefined {
  return QQ_FACE_NAME_TO_ID[name];
}

/**
 * 解析文本中的表情代码，返回 OneBot 消息段数组
 * 支持格式：[表情:飞吻] 或 [face:451]
 */
export function parseTextWithEmoji(text: string): OneBotMessage[] {
  const segments: OneBotMessage[] = [];
  // 匹配 [表情:名字] 或 [face:ID]
  const emojiPattern = /\[表情:([^\]]+)\]|\[face:(\d+)\]/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = emojiPattern.exec(text)) !== null) {
    // 添加表情前的文本
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        segments.push({ type: "text", data: { text: beforeText } });
      }
    }
    
    // 处理表情
    if (match[1]) {
      // [表情:名字] 格式
      const faceName = match[1];
      const faceId = QQ_FACE_NAME_TO_ID[faceName];
      if (faceId !== undefined) {
        segments.push({ type: "face", data: { id: faceId } });
      } else {
        // 找不到对应ID，保留原文
        segments.push({ type: "text", data: { text: match[0] } });
      }
    } else if (match[2]) {
      // [face:ID] 格式
      const faceId = parseInt(match[2], 10);
      segments.push({ type: "face", data: { id: faceId } });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩余文本
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      segments.push({ type: "text", data: { text: remainingText } });
    }
  }
  
  // 如果没有任何表情，返回纯文本
  if (segments.length === 0) {
    return [{ type: "text", data: { text } }];
  }
  
  return segments;
}

/**
 * 检查文本是否包含表情代码
 */
export function hasEmojiCode(text: string): boolean {
  return /\[表情:[^\]]+\]|\[face:\d+\]/.test(text);
}

/**
 * 从消息段提取纯文本（包括表情描述）
 */
export function extractTextFromMessage(message: OneBotMessage[]): string {
  const parts: string[] = [];
  for (const seg of message) {
    if (seg.type === "text") {
      const data = seg.data as { text: string };
      if (data.text) parts.push(data.text);
    } else if (seg.type === "face") {
      // QQ 系统表情
      const data = seg.data as { id?: number | string };
      const faceId = typeof data.id === "string" ? parseInt(data.id, 10) : data.id;
      const faceName = faceId !== undefined ? QQ_FACE_MAP[faceId] : undefined;
      parts.push(`[表情:${faceName ?? faceId ?? "emoji"}]`);
    } else if (seg.type === "mface") {
      // 商城表情/大表情
      const data = seg.data as { summary?: string; emoji_id?: string };
      const summary = data.summary || data.emoji_id || "表情";
      parts.push(`[大表情:${summary}]`);
    } else if (seg.type === "reply") {
      // 回复消息，不需要提取文本
    }
  }
  return parts.join("");
}

/**
 * 媒体信息
 */
export type ExtractedMedia = {
  type: "image" | "record" | "video" | "file" | "mface";
  url: string;
  file?: string;
  /** 文件名 */
  fileName?: string;
  /** 文件大小 */
  fileSize?: number;
  /** 商城表情的描述 */
  summary?: string;
};

/**
 * 从消息段提取媒体（图片、语音、视频、文件、商城表情）
 */
export function extractMediaFromMessage(message: OneBotMessage[]): ExtractedMedia[] {
  const media: ExtractedMedia[] = [];
  for (const seg of message) {
    if (seg.type === "image") {
      const data = seg.data as { file: string; url?: string };
      if (data.url || data.file) {
        media.push({
          type: "image",
          url: data.url || data.file,
          file: data.file,
        });
      }
    } else if (seg.type === "mface") {
      // 商城表情/大表情，提取图片URL
      const data = seg.data as { 
        url?: string; 
        emoji_id?: string; 
        summary?: string;
        key?: string;
      };
      if (data.url) {
        media.push({
          type: "mface",
          url: data.url,
          summary: data.summary || data.emoji_id || "表情",
        });
      }
    } else if (seg.type === "record") {
      const data = seg.data as { file: string; url?: string };
      if (data.url || data.file) {
        media.push({
          type: "record",
          url: data.url || data.file,
          file: data.file,
        });
      }
    } else if (seg.type === "video") {
      const data = seg.data as { file: string; url?: string };
      if (data.url || data.file) {
        media.push({
          type: "video",
          url: data.url || data.file,
          file: data.file,
        });
      }
    } else if (seg.type === "file") {
      const data = seg.data as { 
        file?: string; 
        url?: string;
        name?: string;
        size?: number;
        file_id?: string;
      };
      const fileUrl = data.url || data.file;
      if (fileUrl) {
        media.push({
          type: "file",
          url: fileUrl,
          file: data.file,
          fileName: data.name,
          fileSize: data.size,
        });
      }
    }
  }
  return media;
}

/**
 * 检查消息是否 @ 了指定用户
 */
export function isAtUser(message: OneBotMessage[], userId: number | string): boolean {
  const userIdStr = String(userId);
  return message.some(
    (seg) => seg.type === "at" && (seg.data.qq === userIdStr || seg.data.qq === "all")
  );
}

/**
 * 移除消息中的 @ 段
 */
export function removeAtSegments(message: OneBotMessage[]): OneBotMessage[] {
  return message.filter((seg) => seg.type !== "at");
}

/**
 * 发送图片消息
 */
export async function sendImage(
  config: OneBotConfig,
  params: {
    messageType: "private" | "group";
    userId?: number;
    groupId?: number;
    /** 图片 URL 或 base64 */
    file: string;
    /** 可选的文字说明 */
    text?: string;
  }
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const message: OneBotMessage[] = [
    { type: "image", data: { file: params.file } },
  ];
  if (params.text) {
    message.push({ type: "text", data: { text: params.text } });
  }
  return sendMsg(config, {
    messageType: params.messageType,
    userId: params.userId,
    groupId: params.groupId,
    message,
  });
}

/**
 * 发送语音消息
 */
export async function sendRecord(
  config: OneBotConfig,
  params: {
    messageType: "private" | "group";
    userId?: number;
    groupId?: number;
    /** 语音文件 URL 或 base64 */
    file: string;
  }
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const message: OneBotMessage[] = [
    { type: "record", data: { file: params.file } },
  ];
  return sendMsg(config, {
    messageType: params.messageType,
    userId: params.userId,
    groupId: params.groupId,
    message,
  });
}

/**
 * 发送视频消息
 */
export async function sendVideo(
  config: OneBotConfig,
  params: {
    messageType: "private" | "group";
    userId?: number;
    groupId?: number;
    /** 视频文件 URL 或 base64 */
    file: string;
    /** 可选的文字说明 */
    text?: string;
  }
): Promise<OneBotApiResponse<OneBotSendMsgResponse>> {
  const message: OneBotMessage[] = [
    { type: "video", data: { file: params.file } },
  ];
  if (params.text) {
    message.push({ type: "text", data: { text: params.text } });
  }
  return sendMsg(config, {
    messageType: params.messageType,
    userId: params.userId,
    groupId: params.groupId,
    message,
  });
}

/**
 * 获取好友列表
 */
export async function getFriendList(
  config: OneBotConfig
): Promise<OneBotApiResponse<Array<{
  user_id: number;
  nickname: string;
  remark: string;
}>>> {
  return callOneBotApi(config, "get_friend_list");
}

/**
 * 获取群列表
 */
export async function getGroupList(
  config: OneBotConfig
): Promise<OneBotApiResponse<Array<{
  group_id: number;
  group_name: string;
  member_count: number;
  max_member_count: number;
}>>> {
  return callOneBotApi(config, "get_group_list");
}

/**
 * 获取群成员列表
 */
export async function getGroupMemberList(
  config: OneBotConfig,
  groupId: number
): Promise<OneBotApiResponse<Array<{
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  role: "owner" | "admin" | "member";
}>>> {
  return callOneBotApi(config, "get_group_member_list", { group_id: groupId });
}

/**
 * 检查 OneBot 服务是否可用
 */
export async function probeOneBot(
  config: OneBotConfig,
  timeoutMs = 5000
): Promise<{ ok: boolean; bot?: { id: number; nickname: string }; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const baseUrl = config.httpUrl?.replace(/\/$/, "") || "http://127.0.0.1:3000";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.accessToken) {
      headers["Authorization"] = `Bearer ${config.accessToken}`;
    }

    const response = await fetch(`${baseUrl}/get_login_info`, {
      method: "POST",
      headers,
      body: "{}",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const result = (await response.json()) as OneBotApiResponse<OneBotLoginInfo>;
    if (result.status === "ok") {
      return {
        ok: true,
        bot: {
          id: result.data.user_id,
          nickname: result.data.nickname,
        },
      };
    }
    return { ok: false, error: `API error: ${result.retcode}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
