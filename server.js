/**
 * 机械臂控制系统 - TCP通信服务器
 * Robotic Arm Controller - TCP Communication Server
 * 
 * 功能:
 * - WebSocket 服务端 (与前端通信)
 * - TCP 客户端 (与机械臂通信)
 * - 协议转换 (WebSocket <-> TCP)
 * - 心跳检测与自动重连
 */

const net = require('net');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// 加载配置
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// 全局状态
const state = {
  tcpConnected: false,
  robotReady: false,
  currentAngles: [0, 0, 0, 0, 0, 0],
  targetAngles: [0, 0, 0, 0, 0, 0],
  endEffectorPos: { x: 300, y: 0, z: 200 },
  motorTemps: [35, 35, 35, 35, 35, 35],
  gripperOpen: false
};

// ==================== TCP Client (连接机械臂) ====================

class TCPClient {
  constructor() {
    this.socket = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.buffer = '';
  }

  connect() {
    if (this.socket) {
      console.log('[TCP] 已有连接，跳过');
      return;
    }

    console.log(`[TCP] 正在连接到机械臂: ${config.tcp.host}:${config.tcp.port}`);
    
    this.socket = new net.Socket();
    
    this.socket.connect(config.tcp.port, config.tcp.host, () => {
      console.log('[TCP] 机械臂连接成功!');
      state.tcpConnected = true;
      this.startHeartbeat();
      broadcastToClients({
        type: 'connection',
        status: 'connected',
        message: '机械臂已连接'
      });
      this.sendCommand({ cmd: 'GET_STATUS' });
    });

    this.socket.on('data', (data) => {
      this.handleData(data);
    });

    this.socket.on('error', (err) => {
      console.error('[TCP] 连接错误:', err.message);
      this.handleDisconnect();
    });

    this.socket.on('close', () => {
      console.log('[TCP] 连接已关闭');
      this.handleDisconnect();
    });
  }

  handleData(data) {
    this.buffer += data.toString();
    
    // 处理多行数据 (假设以 \n 分隔)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // 保留不完整的数据
    
    lines.forEach(line => {
      if (line.trim()) {
        this.parseMessage(line.trim());
      }
    });
  }

  parseMessage(data) {
    try {
      // 尝试解析 JSON
      const msg = JSON.parse(data);
      console.log('[TCP] 收到消息:', msg);
      
      switch (msg.type) {
        case 'STATUS':
          this.handleStatusUpdate(msg);
          break;
        case 'ACK':
          this.handleAck(msg);
          break;
        case 'ERROR':
          this.handleError(msg);
          break;
        case 'POSITION':
          this.handlePositionUpdate(msg);
          break;
        default:
          // 透传给前端
          broadcastToClients(msg);
      }
    } catch (e) {
      // 非 JSON 数据，按文本处理
      console.log('[TCP] 收到文本:', data);
      broadcastToClients({
        type: 'raw',
        data: data
      });
    }
  }

  handleStatusUpdate(msg) {
    state.robotReady = msg.ready || false;
    state.currentAngles = msg.angles || state.currentAngles;
    state.motorTemps = msg.temperatures || state.motorTemps;
    
    broadcastToClients({
      type: 'status',
      robotReady: state.robotReady,
      angles: state.currentAngles,
      temperatures: state.motorTemps
    });
  }

  handleAck(msg) {
    broadcastToClients({
      type: 'ack',
      command: msg.command,
      result: msg.result
    });
  }

  handleError(msg) {
    console.error('[TCP] 机械臂错误:', msg.error);
    broadcastToClients({
      type: 'error',
      source: 'robot',
      message: msg.error
    });
  }

  handlePositionUpdate(msg) {
    if (msg.position) {
      state.endEffectorPos = msg.position;
      broadcastToClients({
        type: 'position',
        position: msg.position
      });
    }
  }

  sendCommand(command) {
    if (!this.socket || !state.tcpConnected) {
      console.warn('[TCP] 未连接，无法发送命令');
      return false;
    }
    
    const data = JSON.stringify(command) + '\n';
    this.socket.write(data);
    console.log('[TCP] 发送命令:', command);
    return true;
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.sendCommand({ cmd: 'HEARTBEAT' });
    }, config.protocol.heartbeatInterval);
  }

  handleDisconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    
    state.tcpConnected = false;
    state.robotReady = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    broadcastToClients({
      type: 'connection',
      status: 'disconnected',
      message: '机械臂连接断开'
    });

    // 自动重连
    if (config.tcp.autoReconnect) {
      console.log(`[TCP] ${config.tcp.reconnectInterval}ms 后尝试重连...`);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, config.tcp.reconnectInterval);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.end();
    }
  }
}

// ==================== WebSocket Server (连接前端) ====================

let wss = null;
const clients = new Set();

function startWebSocketServer() {
  const server = http.createServer();
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('[WS] 客户端连接:', req.socket.remoteAddress);
    clients.add(ws);
    
    // 发送当前状态
    ws.send(JSON.stringify({
      type: 'init',
      state: state
    }));

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        handleWebSocketMessage(ws, msg);
      } catch (e) {
        console.error('[WS] 消息解析错误:', e.message);
      }
    });

    ws.on('close', () => {
      console.log('[WS] 客户端断开');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] 错误:', err.message);
      clients.delete(ws);
    });
  });

  server.listen(config.websocket.port, () => {
    console.log(`[WS] WebSocket 服务器启动在端口 ${config.websocket.port}`);
  });
}

function handleWebSocketMessage(ws, msg) {
  console.log('[WS] 收到消息:', msg);
  
  switch (msg.type) {
    case 'connect_tcp':
      tcpClient.connect();
      break;
    
    case 'disconnect_tcp':
      tcpClient.disconnect();
      break;
    
    case 'set_joint':
      // 设置单个关节角度
      tcpClient.sendCommand({
        cmd: 'SET_JOINT',
        joint: msg.joint,
        angle: msg.angle,
        speed: msg.speed || 50
      });
      break;
    
    case 'set_joints':
      // 设置所有关节角度
      tcpClient.sendCommand({
        cmd: 'SET_JOINTS',
        angles: msg.angles,
        speed: msg.speed || 50
      });
      break;
    
    case 'move_to':
      // 移动到坐标位置
      tcpClient.sendCommand({
        cmd: 'MOVE_TO',
        position: { x: msg.x, y: msg.y, z: msg.z },
        orientation: msg.orientation,
        speed: msg.speed || 50
      });
      break;
    
    case 'go_home':
      tcpClient.sendCommand({ cmd: 'GO_HOME' });
      break;
    
    case 'emergency_stop':
      tcpClient.sendCommand({ cmd: 'EMERGENCY_STOP' });
      break;
    
    case 'set_gripper':
      tcpClient.sendCommand({
        cmd: 'SET_GRIPPER',
        open: msg.open
      });
      break;
    
    case 'execute_preset':
      tcpClient.sendCommand({
        cmd: 'EXECUTE_PRESET',
        preset: msg.preset
      });
      break;
    
    case 'get_status':
      tcpClient.sendCommand({ cmd: 'GET_STATUS' });
      break;
    
    default:
      // 透传给机械臂
      tcpClient.sendCommand(msg);
  }
}

function broadcastToClients(msg) {
  const data = JSON.stringify(msg);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ==================== HTTP Server (静态文件) ====================

function startHTTPServer() {
  const app = express();
  app.use(cors());
  app.use(express.static(path.join(__dirname)));
  
  app.get('/api/status', (req, res) => {
    res.json(state);
  });
  
  app.get('/api/config', (req, res) => {
    // 返回不包含敏感信息的配置
    res.json({
      tcp: {
        host: config.tcp.host,
        port: config.tcp.port
      },
      robot: config.robot
    });
  });

  const HTTP_PORT = 8081;
  app.listen(HTTP_PORT, () => {
    console.log(`[HTTP] 静态文件服务器启动在端口 ${HTTP_PORT}`);
    console.log(`[HTTP] 访问 http://localhost:${HTTP_PORT} 打开控制界面`);
  });
}

// ==================== Main ====================

const tcpClient = new TCPClient();

console.log('========================================');
console.log('   机械臂控制系统 - TCP通信服务器');
console.log('   Robotic Arm Controller Server');
console.log('========================================');
console.log('');

startWebSocketServer();
startHTTPServer();

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  tcpClient.disconnect();
  process.exit(0);
});
