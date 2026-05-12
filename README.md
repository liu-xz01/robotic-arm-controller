# 机械臂控制系统 v1.0 (TCP通信版)

## 📋 系统架构

```
┌─────────────────┐      WebSocket       ┌─────────────────┐      TCP       ┌─────────────────┐
│   Web 浏览器     │ ◄──────────────────► │  Node.js 服务器  │ ◄────────────► │   机械臂控制器   │
│  (前端界面)      │      ws://localhost  │  (协议转换网关)   │                │  (TCP Server)   │
└─────────────────┘      :3000           └─────────────────┘   :8080        └─────────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────────┐
                                           │  HTTP 静态服务器  │
                                           │  :8081          │
                                           └─────────────────┘
```

## ✨ 功能特点

- 🌐 **WebSocket + TCP 双协议** - 前端通过 WebSocket 连接后端，后端通过 TCP 连接机械臂
- 🔄 **自动重连机制** - 支持断线自动重连
- 💓 **心跳检测** - 保持连接活跃
- 🎮 **完整的控制功能** - 关节控制、坐标控制、预设动作
- 📊 **实时状态同步** - 机械臂状态实时反馈到界面

## 🚀 快速开始

### 1. 安装依赖

```bash
cd robotic-arm-controller
npm install
```

### 2. 配置 TCP 连接

编辑 `config.json` 文件：

```json
{
  "tcp": {
    "host": "192.168.1.100",    // 修改为您的机械臂IP地址
    "port": 8080,                // 机械臂TCP端口
    "reconnectInterval": 3000,   // 重连间隔(毫秒)
    "autoReconnect": true        // 是否自动重连
  },
  "websocket": {
    "port": 3000                 // WebSocket服务器端口
  }
}
```

### 3. 启动服务器

```bash
npm start
```

或开发模式（自动重启）：

```bash
npm run dev
```

### 4. 打开控制界面

浏览器访问：

```
http://localhost:8081
```

## 📁 文件结构

```
robotic-arm-controller/
├── 📄 server.js              # Node.js TCP/WebSocket 服务器
├── 📄 package.json           # Node.js 依赖配置
├── 📄 config.json            # 配置文件
├── 📄 index.html             # 前端界面
├── 📁 css/
│   └── style.css             # 样式文件
├── 📁 js/
│   └── app.js                # 前端逻辑 (含WebSocket通信)
├── 📁 .vscode/               # VSCode 配置
└── 📄 README.md              # 使用说明
```

## 🔌 通信协议

### WebSocket 消息格式 (前端 ↔ 后端)

```javascript
// 连接机械臂
{ type: 'connect_tcp' }

// 断开机械臂
{ type: 'disconnect_tcp' }

// 设置单个关节
{
  type: 'set_joint',
  joint: 0,           // 关节索引 0-5
  angle: 45.5,        // 目标角度
  speed: 50           // 速度 1-100
}

// 设置所有关节
{
  type: 'set_joints',
  angles: [0, 0, 0, 0, 0, 0],
  speed: 50
}

// 移动到坐标
{
  type: 'move_to',
  x: 300,
  y: 0,
  z: 200,
  orientation: { roll: 0, pitch: 0, yaw: 0 },
  speed: 50
}

// 紧急停止
{ type: 'emergency_stop' }

// 归位
{ type: 'go_home' }

// 控制夹爪
{
  type: 'set_gripper',
  open: true
}

// 执行预设动作
{
  type: 'execute_preset',
  preset: 'pick'      // pick | place | wave | dance
}
```

### TCP 消息格式 (后端 ↔ 机械臂)

消息使用 JSON 格式，以换行符 `\n` 分隔：

```javascript
// 发送到机械臂
{"cmd":"SET_JOINTS","angles":[0,0,0,0,0,0],"speed":50}\n
// 从机械臂接收
{"type":"STATUS","ready":true,"angles":[0,0,0,0,0,0]}\n
{"type":"ACK","command":"SET_JOINTS","result":"ok"}\n
{"type":"ERROR","error":"Joint 2 out of range"}\n
{"type":"POSITION","position":{"x":300,"y":0,"z":200}}\n```

## 🎯 使用指南

### 连接流程

1. 启动服务器后，浏览器会自动连接 WebSocket 服务器
2. 点击"连接机械臂"按钮建立 TCP 连接
3. 状态变为"已连接"后即可控制机械臂

### 控制模式

- **关节控制** - 拖动滑块调整各关节角度
- **坐标控制** - 输入 X/Y/Z 坐标，系统自动计算逆运动学

### 预设动作

- 📦 **抓取** - 移动到抓取位置并闭合夹爪
- 📍 **放置** - 移动到放置位置并张开夹爪
- 👋 **挥手** - 执行挥手动作
- 💃 **舞蹈** - 执行舞蹈动作序列

## ⚙️ 机械臂 TCP 协议接入

如果您要实现机械臂端的 TCP 服务器，需要处理以下命令：

| 命令 | 说明 |
|------|------|
| `HEARTBEAT` | 心跳检测 |
| `GET_STATUS` | 获取当前状态 |
| `SET_JOINT` | 设置单个关节角度 |
| `SET_JOINTS` | 设置所有关节角度 |
| `MOVE_TO` | 移动到指定坐标 |
| `GO_HOME` | 归位 |
| `EMERGENCY_STOP` | 紧急停止 |
| `SET_GRIPPER` | 控制夹爪 |
| `EXECUTE_PRESET` | 执行预设动作 |

## 🔧 开发扩展

### 修改机械臂 DH 参数

在 `app.js` 中修改 `dhParams`：

```javascript
this.dhParams = [
  { a: 0,   d: 150, alpha: 90,  theta: 0 },
  { a: 250, d: 0,   alpha: 0,   theta: 0 },
  // ...
];
```

### 添加新的预设动作

在 `server.js` 中处理新的预设类型：

```javascript
case 'execute_preset':
  if (msg.preset === 'your_preset') {
    // 发送给机械臂
    this.sendCommand({
      cmd: 'EXECUTE_PRESET',
      preset: 'your_preset'
    });
  }
  break;
```

## 🌐 浏览器支持

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome/Edge | ✅ 推荐 |
| Firefox | ✅ 支持 |
| Safari | ✅ 支持 |

## 🐛 故障排查

### WebSocket 连接失败
- 检查服务器是否已启动
- 检查端口 3000 是否被占用
- 检查防火墙设置

### TCP 连接失败
- 检查机械臂IP地址和端口配置
- 检查网络连接
- 查看服务器日志

### 命令无响应
- 检查机械臂是否已就绪
- 查看系统日志面板
- 检查 TCP 通信协议格式

## 📜 更新日志

### v1.0.0 (2026-05-12)
- ✅ 初始版本发布
- ✅ WebSocket/TCP 双协议通信
- ✅ 6轴关节控制
- ✅ 3D可视化
- ✅ 坐标控制模式
- ✅ 预设动作
- ✅ 自动重连

## 📝 注意事项

1. 请确保机械臂控制器已开启 TCP 服务器模式
2. 首次使用请修改 `config.json` 中的 IP 地址
3. 建议在同一局域网内使用以保证通信稳定

---

**开发日期**: 2026-05-12  
**版本**: v1.0.0  
**协议**: WebSocket + TCP
