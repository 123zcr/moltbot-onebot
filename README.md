# @superman1/moltbot-onebot

Moltbot OneBot v11 协议插件，支持通过 NapCat/Lagrange 等实现连接 QQ。

## 功能特性

- **消息收发**: 支持私聊和群聊的文字、图片、语音、视频、文件消息
- **表情支持**: 自动解析和发送 QQ 系统表情 `[表情:微笑]`
- **语音转文字**: 自动转录用户发送的语音消息
- **TTS 语音回复**: 支持将 AI 回复转换为语音消息发送
- **媒体处理**: 自动下载和处理用户发送的图片、文件
- **群聊管理**: 支持 @机器人 触发、群白名单、用户权限控制
- **Windows 工具**: 内置截图工具和 Computer Use 工具（仅 Windows）

## 目录结构

```
extensions/onebot/
├── index.ts              # 插件主入口
├── package.json          # 包配置
├── moltbot.plugin.json   # 插件元数据
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── types.ts          # OneBot 协议类型定义
    ├── api.ts            # OneBot HTTP API 封装
    ├── channel.ts        # Moltbot 频道插件实现
    └── runtime.ts        # 运行时状态管理
```

## 文件说明

### `src/types.ts` - 类型定义

定义 OneBot v11 协议的核心类型：

```typescript
// 插件配置
type OneBotConfig = {
  enabled?: boolean;           // 是否启用
  httpUrl?: string;            // NapCat HTTP API 地址
  wsUrl?: string;              // WebSocket 地址（保留）
  accessToken?: string;        // 鉴权 Token
  dmPolicy?: "open" | "pairing" | "disabled";  // 私聊策略
  allowFrom?: (string | number)[];             // 允许的用户
  groupPolicy?: "open" | "allowlist" | "disabled"; // 群聊策略
  groups?: Record<string, OneBotGroupConfig>;  // 群配置
  selfId?: string | number;    // 机器人 QQ 号
};

// 群组配置
type OneBotGroupConfig = {
  enabled?: boolean;
  requireMention?: boolean;    // 是否需要 @机器人
  users?: (string | number)[]; // 允许的用户
  tools?: { allow?: string[]; deny?: string[] }; // 工具权限
};

// 消息事件、消息段、发送者信息等...
```

### `src/api.ts` - API 封装

封装 OneBot HTTP API 调用：

| 函数 | 说明 |
|------|------|
| `callOneBotApi()` | 通用 API 调用 |
| `sendPrivateMsg()` | 发送私聊消息 |
| `sendGroupMsg()` | 发送群消息 |
| `sendMsg()` | 自动判断并发送消息 |
| `sendImage()` | 发送图片 |
| `sendRecord()` | 发送语音 |
| `sendVideo()` | 发送视频 |
| `getLoginInfo()` | 获取登录信息 |
| `getFriendList()` | 获取好友列表 |
| `getGroupList()` | 获取群列表 |
| `getGroupMemberList()` | 获取群成员列表 |
| `probeOneBot()` | 检测服务状态 |
| `extractTextFromMessage()` | 从消息段提取文本 |
| `extractMediaFromMessage()` | 从消息段提取媒体 |
| `parseTextWithEmoji()` | 解析表情代码 |
| `isAtUser()` | 检查是否 @ 了用户 |

### `src/channel.ts` - 频道插件

实现 Moltbot 的 `ChannelPlugin` 接口：

- **config**: 账户配置管理
- **security**: DM 策略、allowFrom 解析
- **groups**: 群聊 @机器人 检测、工具策略
- **directory**: 获取好友/群列表
- **messaging**: 消息目标解析
- **outbound**: 发送文本/媒体消息
- **status**: 状态监控、健康检查
- **gateway**: 启动/停止 webhook 服务

### `src/runtime.ts` - 运行时

管理插件运行时状态的单例模块。

### `index.ts` - 主入口

插件注册和核心逻辑：

1. **Webhook 处理**: 接收 NapCat 推送的消息事件
2. **消息处理**: 解析消息、提取媒体、构建上下文
3. **回复分发**: 调用 AI agent 并发送回复
4. **工具注册**: Screenshot 和 Computer Use 工具

## 集成到 Moltbot

### 方式一：作为本地扩展（推荐）

将整个 `onebot` 目录复制到 Moltbot 的 `extensions/` 目录下：

```
moltbot/
├── extensions/
│   └── onebot/          # 复制到这里
│       ├── index.ts
│       ├── package.json
│       ├── moltbot.plugin.json
│       └── src/
└── ...
```

Moltbot 会自动发现并加载 `extensions/` 下的插件。

### 方式二：从 Git 仓库安装

```bash
# 克隆到 Moltbot 的 extensions 目录
cd your-moltbot-project
git clone https://github.com/你的用户名/moltbot-onebot.git extensions/onebot

# 安装依赖（如果有）
cd extensions/onebot
npm install --omit=dev
```

### 方式三：发布到 npm（可选）

如果想让用户通过 `npm install` 安装，需要先发布到 npm：

```bash
cd extensions/onebot

# 登录 npm（需要 npm 账号）
npm login

# 发布（@moltbot 是 scoped 包，需要 --access public）
npm publish --access public
```

发布后，用户可以这样安装：

```bash
npm install @superman1/moltbot-onebot
```

然后在 `moltbot.json` 中启用：

```json
{
  "plugins": {
    "entries": {
      "@superman1/moltbot-onebot": {
        "enabled": true
      }
    }
  }
}
```

**注意**：`@moltbot` 是一个 npm scope（组织名），你需要：
1. 在 npm 上注册账号
2. 创建或加入 `@moltbot` 组织，或者改成你自己的 scope（如 `@你的用户名/onebot`）

### 插件加载机制

Moltbot 通过以下方式加载插件：

1. **自动发现**: 扫描 `extensions/` 目录下的子目录
2. **package.json**: 读取 `moltbot.extensions` 字段找到入口文件
3. **注册**: 调用插件的 `register(api)` 方法

插件入口文件需要导出一个默认对象：

```typescript
export default {
  id: "onebot",
  name: "OneBot (QQ/NapCat)",
  description: "...",
  configSchema: { ... },
  register(api: MoltbotPluginApi) {
    // 注册频道
    api.registerChannel({ plugin: onebotPlugin });
    
    // 注册 HTTP 路由
    api.registerHttpRoute({
      path: "/webhook/onebot",
      handler: async (req, res) => { ... },
    });
    
    // 注册工具
    api.registerTool({ name: "screenshot", ... });
  },
};
```

## 安装配置

### 1. 安装 NapCat

NapCat 是一个 OneBot v11 协议实现，用于连接 QQ。

```bash
# 参考 NapCat 官方文档安装
# https://napneko.github.io/
```

### 2. 配置 NapCat

在 NapCat 配置中启用 HTTP POST 事件上报，指向 Moltbot Gateway：

```json
{
  "http": {
    "enable": true,
    "host": "127.0.0.1",
    "port": 3000
  },
  "httpPost": {
    "enable": true,
    "urls": ["http://127.0.0.1:18789/webhook/onebot"]
  }
}
```

### 3. 配置 Moltbot

```bash
# 启用 OneBot 频道
moltbot config set channels.onebot.enabled true

# 设置 NapCat HTTP API 地址
moltbot config set channels.onebot.httpUrl "http://127.0.0.1:3000"

# (可选) 设置 Access Token
moltbot config set channels.onebot.accessToken "your-token"

# (可选) 配置私聊策略
moltbot config set channels.onebot.dmPolicy "open"  # open/pairing/disabled

# (可选) 配置允许的用户
moltbot config set channels.onebot.allowFrom "[\"12345678\", \"87654321\"]"
```

### 4. 配置群聊

```bash
# 启用群聊
moltbot config set channels.onebot.groupPolicy "allowlist"

# 添加群白名单
moltbot config set channels.onebot.groups.123456789.enabled true
moltbot config set channels.onebot.groups.123456789.requireMention true
```

完整的群配置示例（在 moltbot.json 中）：

```json
{
  "channels": {
    "onebot": {
      "enabled": true,
      "httpUrl": "http://127.0.0.1:3000",
      "groupPolicy": "allowlist",
      "groups": {
        "123456789": {
          "enabled": true,
          "requireMention": true,
          "users": ["111111", "222222"]
        },
        "*": {
          "enabled": false,
          "requireMention": true
        }
      }
    }
  }
}
```

### 5. 重启 Gateway

```bash
moltbot gateway restart
```

## 消息格式

### 表情

支持两种格式：
- `[表情:微笑]` - 使用表情名称
- `[face:14]` - 使用表情 ID

### 媒体

- 图片: 自动下载并传给 AI 识别
- 语音: 自动转录为文字
- 视频: 提取信息
- 文件: 文本文件自动读取内容

### 群聊 @

在群聊中，默认需要 @机器人 才会触发回复。可通过 `requireMention: false` 关闭。

## 语音回复 (TTS)

配合 ElevenLabs TTS 可实现语音回复：

```bash
# 配置 ElevenLabs
moltbot config set messages.tts.provider elevenlabs
moltbot config set messages.tts.elevenlabs.apiKey "your-api-key"
moltbot config set messages.tts.elevenlabs.voiceId "your-voice-id"
moltbot config set messages.tts.auto inbound  # 用户发语音时用语音回复
```

## Windows 工具

### Screenshot 工具

在 Windows 上自动注册，用于截图：

```
用户: 截个图看看
AI: [调用 screenshot 工具] 截图已发送
```

### Computer Use 工具

支持远程控制电脑：

- `screenshot`: 截图
- `parse`: 使用 OmniParser 识别 UI 元素
- `click`: 点击指定坐标
- `type`: 输入文字
- `key`: 按键（支持 Win+D, Ctrl+C 等组合键）
- `scroll`: 滚动

需要配合 OmniParser API 服务使用。

## API 参考

### 发送消息

```typescript
import { sendMsg, sendImage, sendRecord } from "@superman1/moltbot-onebot/src/api";

// 发送文字
await sendMsg(config, {
  messageType: "private",
  userId: 12345678,
  message: "Hello!",
});

// 发送图片
await sendImage(config, {
  messageType: "group",
  groupId: 123456789,
  file: "https://example.com/image.png",
  text: "看这张图",
});

// 发送语音
await sendRecord(config, {
  messageType: "private",
  userId: 12345678,
  file: "base64://...",
});
```

### 解析消息

```typescript
import { extractTextFromMessage, extractMediaFromMessage } from "@superman1/moltbot-onebot/src/api";

const text = extractTextFromMessage(event.message);
const media = extractMediaFromMessage(event.message);
```

## 开发

### 构建

```bash
cd extensions/onebot
pnpm build
```

### 测试

```bash
pnpm test
```

### 本地开发

插件会在 Moltbot Gateway 启动时自动加载。修改代码后重启 Gateway 即可：

```bash
moltbot gateway restart
```

## 协议兼容性

| 特性 | OneBot v11 | go-cqhttp | NapCat |
|------|-----------|-----------|--------|
| 私聊消息 | ✅ | ✅ | ✅ |
| 群聊消息 | ✅ | ✅ | ✅ |
| 图片消息 | ✅ | ✅ | ✅ |
| 语音消息 | ✅ | ✅ | ✅ |
| 视频消息 | ✅ | ✅ | ✅ |
| 文件消息 | ✅ | ✅ | ✅ |
| 系统表情 | ✅ | ✅ | 部分 |
| 商城表情 | - | ✅ | ✅ |
| @消息 | ✅ | ✅ | ✅ |
| 撤回消息 | ✅ | ✅ | ✅ |

## 常见问题

### Q: 消息发送失败

检查：
1. NapCat 是否正常运行
2. httpUrl 配置是否正确
3. accessToken 是否匹配

### Q: 收不到消息

检查：
1. NapCat HTTP POST 是否配置正确
2. Moltbot Gateway 是否运行在 18789 端口
3. 防火墙是否放行

### Q: 语音消息无法转录

检查：
1. 语音文件路径是否可访问
2. 是否配置了转录服务（Whisper 等）

### Q: 表情发送失败

NapCat 只支持部分经典表情 ID (0-39, 96-110)，其他表情会降级为文字。

## 插件 API 说明

### MoltbotPluginApi

插件通过 `register(api)` 方法接收 API 对象：

```typescript
interface MoltbotPluginApi {
  // 当前配置
  config: MoltbotConfig;
  
  // 日志
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  
  // 运行时（访问核心功能）
  runtime: PluginRuntime;
  
  // 注册频道插件
  registerChannel(opts: { plugin: ChannelPlugin }): void;
  
  // 注册 HTTP 路由
  registerHttpRoute(opts: {
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  }): void;
  
  // 注册工具
  registerTool(opts: {
    name: string;
    label: string;
    description: string;
    parameters: TSchema;
    execute: (toolCallId: string, args: Record<string, unknown>) => Promise<ToolResult>;
  }): void;
}
```

### ChannelPlugin

频道插件需要实现的接口：

```typescript
interface ChannelPlugin<TAccount> {
  id: string;
  meta: { label: string; icon?: string };
  
  // 能力声明
  capabilities: {
    chatTypes: ("direct" | "group")[];
    reactions: boolean;
    threads: boolean;
    media: boolean;
    nativeCommands: boolean;
    blockStreaming: boolean;
  };
  
  // 配置管理
  config: {
    listAccountIds(): string[];
    resolveAccount(cfg, accountId): TAccount;
    isConfigured(account): boolean;
    // ...
  };
  
  // 消息发送
  outbound: {
    deliveryMode: "direct" | "queue";
    textChunkLimit: number;
    sendText(opts): Promise<{ channel: string; messageId: string }>;
    sendMedia(opts): Promise<{ channel: string; messageId: string }>;
  };
  
  // 状态监控
  status: {
    probeAccount(opts): Promise<{ ok: boolean; error?: string }>;
    // ...
  };
  
  // Gateway 生命周期
  gateway: {
    startAccount(ctx): Promise<void>;
  };
}
```

### PluginRuntime

运行时提供的核心功能：

```typescript
interface PluginRuntime {
  channel: {
    // 路由解析
    routing: {
      resolveAgentRoute(opts): { agentId: string; sessionKey: string; accountId: string };
    };
    
    // 会话管理
    session: {
      resolveStorePath(store, opts): string;
      readSessionUpdatedAt(opts): number | undefined;
      recordSessionMetaFromInbound(opts): Promise<void>;
    };
    
    // 回复处理
    reply: {
      formatAgentEnvelope(opts): string;
      finalizeInboundContext(ctx): InboundContext;
      resolveEnvelopeFormatOptions(cfg): EnvelopeOptions;
      dispatchReplyWithBufferedBlockDispatcher(opts): Promise<void>;
    };
  };
}
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT
