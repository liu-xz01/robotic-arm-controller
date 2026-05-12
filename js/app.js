/**
 * 机械臂控制系统 - 主应用逻辑 (TCP版)
 * Robotic Arm Controller - Main Application Logic (TCP Version)
 * 
 * 功能:
 * - 6轴机械臂运动学计算
 * - 3D可视化渲染
 * - 关节/坐标双模式控制
 * - 预设动作执行
 * - WebSocket 与后端TCP服务器通信
 */

// ==================== WebSocket 通信管理器 ====================

class TCPWebSocketManager {
  constructor(controller) {
    this.controller = controller;
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isConnected = false;
    this.serverUrl = 'ws://localhost:3000';
    this.autoReconnect = true;
    this.reconnectInterval = 3000;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WS] 已连接');
      return;
    }

    console.log('[WS] 正在连接到服务器:', this.serverUrl);
    this.controller.addLog('正在连接服务器...', 'info');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[WS] 连接成功');
        this.isConnected = true;
        this.startHeartbeat();
        this.controller.onWebSocketConnected();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[WS] 消息解析错误:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] 连接关闭');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] 连接错误:', error);
        this.controller.addLog('WebSocket连接错误', 'error');
      };
    } catch (e) {
      console.error('[WS] 创建连接失败:', e);
      this.handleDisconnect();
    }
  }

  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  handleDisconnect() {
    this.isConnected = false;
    this.controller.onWebSocketDisconnected();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.autoReconnect) {
      console.log(`[WS] ${this.reconnectInterval}ms后重连...`);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    }
  }

  handleMessage(msg) {
    console.log('[WS] 收到消息:', msg);

    switch (msg.type) {
      case 'init':
        // 初始化状态
        if (msg.state) {
          this.controller.updateState(msg.state);
        }
        break;

      case 'connection':
        // TCP连接状态变化
        if (msg.status === 'connected') {
          this.controller.onTCPConnected();
        } else {
          this.controller.onTCPDisconnected();
        }
        this.controller.addLog(msg.message, msg.status === 'connected' ? 'success' : 'warning');
        break;

      case 'status':
        // 机械臂状态更新
        this.controller.updateRobotStatus(msg);
        break;

      case 'position':
        // 位置更新
        if (msg.position) {
          this.controller.updateEndEffectorPosition(msg.position);
        }
        break;

      case 'ack':
        // 命令确认
        this.controller.addLog(`命令执行${msg.result === 'ok' ? '成功' : '失败'}: ${msg.command}`, 
          msg.result === 'ok' ? 'success' : 'error');
        break;

      case 'error':
        // 错误信息
        this.controller.addLog(`错误: ${msg.message}`, 'error');
        break;

      case 'raw':
        // 原始数据
        this.controller.addLog(`原始数据: ${msg.data}`, 'info');
        break;

      default:
        console.log('[WS] 未知消息类型:', msg.type);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('[WS] 未连接，无法发送消息');
      this.controller.addLog('未连接到服务器', 'error');
      return false;
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 5000);
  }

  // 发送命令到机械臂
  connectTCP() {
    return this.send({ type: 'connect_tcp' });
  }

  disconnectTCP() {
    return this.send({ type: 'disconnect_tcp' });
  }

  setJoint(joint, angle, speed) {
    return this.send({
      type: 'set_joint',
      joint: joint,
      angle: angle,
      speed: speed
    });
  }

  setJoints(angles, speed) {
    return this.send({
      type: 'set_joints',
      angles: angles,
      speed: speed
    });
  }

  moveTo(x, y, z, orientation, speed) {
    return this.send({
      type: 'move_to',
      x: x,
      y: y,
      z: z,
      orientation: orientation,
      speed: speed
    });
  }

  goHome() {
    return this.send({ type: 'go_home' });
  }

  emergencyStop() {
    return this.send({ type: 'emergency_stop' });
  }

  setGripper(open) {
    return this.send({
      type: 'set_gripper',
      open: open
    });
  }

  executePreset(preset) {
    return this.send({
      type: 'execute_preset',
      preset: preset
    });
  }

  getStatus() {
    return this.send({ type: 'get_status' });
  }
}

// ==================== 主控制器 ====================

class RoboticArmController {
  constructor() {
    // 机械臂DH参数 (单位: mm, 度)
    this.dhParams = [
      { a: 0,    d: 150,  alpha: 90,  theta: 0 },   // 关节1
      { a: 250,  d: 0,    alpha: 0,   theta: 0 },   // 关节2
      { a: 200,  d: 0,    alpha: 0,   theta: 0 },   // 关节3
      { a: 0,    d: 0,    alpha: 90,  theta: 0 },   // 关节4
      { a: 0,    d: 100,  alpha: -90, theta: 0 },   // 关节5
      { a: 0,    d: 50,   alpha: 0,   theta: 0 }    // 关节6
    ];
    
    // 当前关节角度
    this.jointAngles = [0, 0, 0, 0, 0, 0];
    
    // 运动参数
    this.speed = 50;
    this.acceleration = 30;
    
    // 夹爪状态
    this.gripperOpen = false;
    
    // 连接状态
    this.wsConnected = false;
    this.tcpConnected = false;
    this.isRunning = false;
    
    // WebSocket管理器
    this.wsManager = new TCPWebSocketManager(this);
    
    // 初始化
    this.init();
  }
  
  init() {
    this.initCanvas();
    this.bindEvents();
    this.startRenderLoop();
    this.addLog('系统初始化完成', 'info');
    
    // 自动连接WebSocket
    this.wsManager.connect();
  }
  
  // ==================== WebSocket 事件处理 ====================
  
  onWebSocketConnected() {
    this.wsConnected = true;
    this.updateConnectionUI();
    this.addLog('服务器连接成功', 'success');
  }
  
  onWebSocketDisconnected() {
    this.wsConnected = false;
    this.tcpConnected = false;
    this.updateConnectionUI();
    this.addLog('服务器连接断开', 'warning');
  }
  
  onTCPConnected() {
    this.tcpConnected = true;
    this.updateConnectionUI();
  }
  
  onTCPDisconnected() {
    this.tcpConnected = false;
    this.updateConnectionUI();
  }
  
  updateConnectionUI() {
    const btn = document.getElementById('btn-connect');
    const connStatus = document.getElementById('conn-status');
    
    if (this.tcpConnected) {
      btn.innerHTML = '<span class="status-dot connected"></span> 断开连接';
      connStatus.textContent = '已连接';
      connStatus.style.color = 'var(--success-color)';
    } else if (this.wsConnected) {
      btn.innerHTML = '<span class="status-dot disconnected"></span> 连接机械臂';
      connStatus.textContent = '等待机械臂';
      connStatus.style.color = 'var(--warning-color)';
    } else {
      btn.innerHTML = '<span class="status-dot disconnected"></span> 连接服务器';
      connStatus.textContent = '未连接';
      connStatus.style.color = 'var(--text-secondary)';
    }
  }
  
  updateState(state) {
    if (state.tcpConnected !== undefined) {
      this.tcpConnected = state.tcpConnected;
    }
    if (state.currentAngles) {
      this.jointAngles = [...state.currentAngles];
      this.updateSliders();
    }
    if (state.gripperOpen !== undefined) {
      this.gripperOpen = state.gripperOpen;
    }
    this.updateConnectionUI();
    this.updateForwardKinematics();
  }
  
  updateRobotStatus(status) {
    if (status.angles) {
      this.jointAngles = [...status.angles];
      this.updateSliders();
      this.updateForwardKinematics();
    }
    if (status.temperatures) {
      const avgTemp = status.temperatures.reduce((a, b) => a + b, 0) / status.temperatures.length;
      document.getElementById('temp-status').textContent = avgTemp.toFixed(0) + '°C';
    }
    if (status.robotReady !== undefined) {
      const runStatus = document.getElementById('run-status');
      if (status.robotReady) {
        runStatus.textContent = '就绪';
        runStatus.style.color = 'var(--success-color)';
      } else {
        runStatus.textContent = '待机';
        runStatus.style.color = 'var(--text-secondary)';
      }
    }
  }
  
  updateEndEffectorPosition(pos) {
    document.getElementById('disp-x').textContent = pos.x.toFixed(1);
    document.getElementById('disp-y').textContent = pos.y.toFixed(1);
    document.getElementById('disp-z').textContent = pos.z.toFixed(1);
  }
  
  updateSliders() {
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById(`j${i + 1}-slider`);
      const valueDisplay = document.getElementById(`j${i + 1}-value`);
      if (slider) {
        slider.value = this.jointAngles[i];
        valueDisplay.textContent = this.jointAngles[i].toFixed(0) + '°';
      }
    }
  }
  
  // ==================== Canvas & 3D 渲染 ====================
  
  initCanvas() {
    this.canvas = document.getElementById('robot-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.camera = {
      distance: 800,
      rotationX: -30,
      rotationY: 45,
      centerX: 0,
      centerY: 100,
      centerZ: 0
    };
    
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.camera.rotationY += deltaX * 0.5;
        this.camera.rotationX += deltaY * 0.5;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.distance += e.deltaY * 0.5;
      this.camera.distance = Math.max(300, Math.min(1500, this.camera.distance));
    });
  }
  
  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }
  
  // ==================== 事件绑定 ====================
  
  bindEvents() {
    // 模式切换
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.switchMode(mode);
      });
    });
    
    // 关节滑块
    for (let i = 1; i <= 6; i++) {
      const slider = document.getElementById(`j${i}-slider`);
      const valueDisplay = document.getElementById(`j${i}-value`);
      
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.jointAngles[i - 1] = value;
        valueDisplay.textContent = value.toFixed(0) + '°';
        this.updateForwardKinematics();
      });
      
      // 滑块释放时发送到机械臂
      slider.addEventListener('change', (e) => {
        if (this.tcpConnected) {
          const value = parseFloat(e.target.value);
          this.wsManager.setJoint(i - 1, value, this.speed);
          this.addLog(`设置关节${i}角度: ${value.toFixed(0)}°`, 'info');
        }
      });
    }
    
    // 坐标输入
    document.getElementById('btn-move-to').addEventListener('click', () => {
      this.moveToPosition();
    });
    
    // 运动参数
    document.getElementById('speed-slider').addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value);
      document.getElementById('speed-value').textContent = this.speed + '%';
    });
    
    document.getElementById('accel-slider').addEventListener('input', (e) => {
      this.acceleration = parseInt(e.target.value);
      document.getElementById('accel-value').textContent = this.acceleration + '%';
    });
    
    // 快捷操作
    document.getElementById('btn-connect').addEventListener('click', () => {
      this.toggleConnection();
    });
    
    document.getElementById('btn-emergency').addEventListener('click', () => {
      this.emergencyStop();
    });
    
    document.getElementById('btn-home').addEventListener('click', () => {
      this.goHome();
    });
    
    document.getElementById('btn-zero').addEventListener('click', () => {
      this.goZero();
    });
    
    document.getElementById('btn-grip-open').addEventListener('click', () => {
      this.setGripper(true);
    });
    
    document.getElementById('btn-grip-close').addEventListener('click', () => {
      this.setGripper(false);
    });
    
    // 预设动作
    document.getElementById('preset-pick').addEventListener('click', () => {
      this.executePreset('pick');
    });
    
    document.getElementById('preset-place').addEventListener('click', () => {
      this.executePreset('place');
    });
    
    document.getElementById('preset-wave').addEventListener('click', () => {
      this.executePreset('wave');
    });
    
    document.getElementById('preset-dance').addEventListener('click', () => {
      this.executePreset('dance');
    });
    
    // 清空日志
    document.getElementById('btn-clear-log').addEventListener('click', () => {
      document.getElementById('log-content').innerHTML = '';
    });
  }
  
  // ==================== 控制逻辑 ====================
  
  switchMode(mode) {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    const jointPanel = document.getElementById('joint-panel');
    const cartesianPanel = document.getElementById('cartesian-panel');
    const modeStatus = document.getElementById('mode-status');
    
    if (mode === 'joint') {
      jointPanel.classList.remove('hidden');
      cartesianPanel.classList.add('hidden');
      modeStatus.textContent = '关节控制';
    } else {
      jointPanel.classList.add('hidden');
      cartesianPanel.classList.remove('hidden');
      modeStatus.textContent = '坐标控制';
      this.updateCartesianInputs();
    }
    
    this.addLog(`切换到${mode === 'joint' ? '关节' : '坐标'}控制模式`, 'info');
  }
  
  toggleConnection() {
    if (this.tcpConnected) {
      // 断开TCP连接
      this.wsManager.disconnectTCP();
      this.addLog('正在断开机械臂连接...', 'info');
    } else if (this.wsConnected) {
      // 连接TCP
      this.wsManager.connectTCP();
      this.addLog('正在连接机械臂...', 'info');
    } else {
      // 连接WebSocket
      this.wsManager.connect();
      this.addLog('正在连接服务器...', 'info');
    }
  }
  
  emergencyStop() {
    this.wsManager.emergencyStop();
    this.isRunning = false;
    document.getElementById('run-status').textContent = '紧急停止';
    document.getElementById('run-status').style.color = 'var(--danger-color)';
    this.addLog('⚠️ 紧急停止已激活', 'error');
    
    document.querySelector('.app-container').style.animation = 'shake 0.5s';
    setTimeout(() => {
      document.querySelector('.app-container').style.animation = '';
    }, 500);
  }
  
  goHome() {
    this.wsManager.goHome();
    this.addLog('执行归位操作...', 'info');
    document.getElementById('run-status').textContent = '运行中';
    document.getElementById('run-status').style.color = 'var(--primary-color)';
  }
  
  goZero() {
    this.wsManager.setJoints([0, 0, 0, 0, 0, 0], this.speed);
    this.addLog('执行归零操作...', 'info');
  }
  
  setGripper(open) {
    this.wsManager.setGripper(open);
    this.gripperOpen = open;
    this.addLog(open ? '夹爪已张开' : '夹爪已闭合', 'info');
  }
  
  executePreset(preset) {
    this.wsManager.executePreset(preset);
    this.addLog(`执行预设动作: ${preset}`, 'info');
  }
  
  moveToPosition() {
    const x = parseFloat(document.getElementById('coord-x').value);
    const y = parseFloat(document.getElementById('coord-y').value);
    const z = parseFloat(document.getElementById('coord-z').value);
    
    const roll = parseFloat(document.getElementById('coord-roll').value) || 0;
    const pitch = parseFloat(document.getElementById('coord-pitch').value) || 0;
    const yaw = parseFloat(document.getElementById('coord-yaw').value) || 0;
    
    this.addLog(`移动到位置: X=${x}, Y=${y}, Z=${z}`, 'info');
    
    if (this.tcpConnected) {
      this.wsManager.moveTo(x, y, z, { roll, pitch, yaw }, this.speed);
    } else {
      // 本地模拟
      const targetAngles = this.calculateInverseKinematics(x, y, z);
      this.animateToAngles(targetAngles);
    }
  }
  
  // ==================== 运动学计算 ====================
  
  updateForwardKinematics() {
    const positions = this.calculateForwardKinematics(this.jointAngles);
    const endEffector = positions[positions.length - 1];
    
    document.getElementById('disp-x').textContent = endEffector.x.toFixed(1);
    document.getElementById('disp-y').textContent = endEffector.y.toFixed(1);
    document.getElementById('disp-z').textContent = endEffector.z.toFixed(1);
    
    if (!document.getElementById('cartesian-panel').classList.contains('hidden')) {
      this.updateCartesianInputs();
    }
    
    this.endEffectorPosition = endEffector;
  }
  
  calculateForwardKinematics(angles) {
    const positions = [{ x: 0, y: 0, z: 0 }];
    let T = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    
    for (let i = 0; i < 6; i++) {
      const dh = this.dhParams[i];
      const theta = (angles[i] + dh.theta) * Math.PI / 180;
      const alpha = dh.alpha * Math.PI / 180;
      
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      
      const A = [
        [ct, -st * ca, st * sa, dh.a * ct],
        [st, ct * ca, -ct * sa, dh.a * st],
        [0, sa, ca, dh.d],
        [0, 0, 0, 1]
      ];
      
      T = this.multiplyMatrix(T, A);
      positions.push({
        x: T[0][3],
        y: T[1][3],
        z: T[2][3]
      });
    }
    
    return positions;
  }
  
  multiplyMatrix(A, B) {
    const result = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }
  
  calculateInverseKinematics(x, y, z) {
    const L1 = 250;
    const L2 = 200;
    
    const theta1 = Math.atan2(y, x) * 180 / Math.PI;
    
    const r = Math.sqrt(x * x + y * y);
    const D = Math.sqrt(r * r + (z - 150) * (z - 150));
    
    const cosTheta2 = (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const theta3 = Math.acos(Math.max(-1, Math.min(1, cosTheta2))) * 180 / Math.PI;
    
    const alpha = Math.atan2(z - 150, r) * 180 / Math.PI;
    const beta = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)) * 180 / Math.PI;
    const theta2 = alpha + beta;
    
    return [theta1, theta2, theta3 - 90, 0, 0, 0];
  }
  
  animateToAngles(targetAngles) {
    const startAngles = [...this.jointAngles];
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      for (let i = 0; i < 6; i++) {
        this.jointAngles[i] = startAngles[i] + (targetAngles[i] - startAngles[i]) * easeProgress;
        
        const slider = document.getElementById(`j${i + 1}-slider`);
        const valueDisplay = document.getElementById(`j${i + 1}-value`);
        if (slider) {
          slider.value = this.jointAngles[i];
          valueDisplay.textContent = this.jointAngles[i].toFixed(0) + '°';
        }
      }
      
      this.updateForwardKinematics();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.addLog('移动完成', 'success');
      }
    };
    
    animate();
  }
  
  updateCartesianInputs() {
    if (this.endEffectorPosition) {
      document.getElementById('coord-x').value = Math.round(this.endEffectorPosition.x);
      document.getElementById('coord-y').value = Math.round(this.endEffectorPosition.y);
      document.getElementById('coord-z').value = Math.round(this.endEffectorPosition.z);
    }
  }
  
  // ==================== 工具方法 ====================
  
  addLog(message, type = 'info') {
    const logContent = document.getElementById('log-content');
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-text">${message}</span>
    `;
    
    logContent.appendChild(logItem);
    logContent.scrollTop = logContent.scrollHeight;
    
    while (logContent.children.length > 50) {
      logContent.removeChild(logContent.firstChild);
    }
  }
  
  // ==================== 渲染 ====================
  
  startRenderLoop() {
    const render = () => {
      this.render();
      requestAnimationFrame(render);
    };
    render();
  }
  
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    this.drawGrid();
    
    const positions = this.calculateForwardKinematics(this.jointAngles);
    const projected = positions.map(p => this.project3D(p.x, p.y, p.z));
    
    ctx.strokeStyle = '#1a5fb4';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      ctx.lineTo(projected[i].x, projected[i].y);
    }
    ctx.stroke();
    
    positions.forEach((pos, i) => {
      const p = projected[i];
      const size = i === 0 ? 12 : (i === projected.length - 1 ? 10 : 8);
      
      ctx.fillStyle = i === 0 ? '#0d9f61' : '#1a5fb4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
    
    this.drawGripper(projected[projected.length - 1], positions[positions.length - 1]);
    this.drawAxes();
  }
  
  project3D(x, y, z) {
    const radX = this.camera.rotationX * Math.PI / 180;
    const radY = this.camera.rotationY * Math.PI / 180;
    
    let x1 = x * Math.cos(radY) - z * Math.sin(radY);
    let z1 = x * Math.sin(radY) + z * Math.cos(radY);
    
    let y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
    let z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
    
    const scale = this.camera.distance / (this.camera.distance + z2);
    const px = x1 * scale + this.canvas.width / 2;
    const py = -y2 * scale + this.canvas.height / 2 + 50;
    
    return { x: px, y: py, scale: scale };
  }
  
  drawGripper(projectedPos, worldPos) {
    const ctx = this.ctx;
    const gripperSize = 20 * projectedPos.scale;
    const openAngle = this.gripperOpen ? 0.5 : 0.1;
    
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(projectedPos.x, projectedPos.y);
    ctx.lineTo(
      projectedPos.x - gripperSize * Math.cos(openAngle),
      projectedPos.y - gripperSize * Math.sin(openAngle)
    );
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(projectedPos.x, projectedPos.y);
    ctx.lineTo(
      projectedPos.x - gripperSize * Math.cos(openAngle),
      projectedPos.y + gripperSize * Math.sin(openAngle)
    );
    ctx.stroke();
  }
  
  drawGrid() {
    const ctx = this.ctx;
    const gridSize = 50;
    const gridRange = 5;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = -gridRange; i <= gridRange; i++) {
      const p1 = this.project3D(i * gridSize, 0, -gridRange * gridSize);
      const p2 = this.project3D(i * gridSize, 0, gridRange * gridSize);
      const p3 = this.project3D(-gridRange * gridSize, 0, i * gridSize);
      const p4 = this.project3D(gridRange * gridSize, 0, i * gridSize);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }
  }
  
  drawAxes() {
    const ctx = this.ctx;
    const origin = this.project3D(0, 0, 0);
    const axisLength = 80;
    
    const xEnd = this.project3D(axisLength, 0, 0);
    const yEnd = this.project3D(0, axisLength, 0);
    const zEnd = this.project3D(0, 0, axisLength);
    
    ctx.lineWidth = 2;
    
    ctx.strokeStyle = '#dc3545';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();
    
    ctx.strokeStyle = '#0d9f61';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();
    
    ctx.strokeStyle = '#1a5fb4';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(zEnd.x, zEnd.y);
    ctx.stroke();
    
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#dc3545';
    ctx.fillText('X', xEnd.x + 5, xEnd.y);
    ctx.fillStyle = '#0d9f61';
    ctx.fillText('Y', yEnd.x + 5, yEnd.y);
    ctx.fillStyle = '#1a5fb4';
    ctx.fillText('Z', zEnd.x + 5, zEnd.y);
  }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.robotController = new RoboticArmController();
});
