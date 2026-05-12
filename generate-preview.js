// 生成项目预览图
const canvas = document.createElement('canvas');
canvas.width = 1200;
canvas.height = 700;
const ctx = canvas.getContext('2d');

// 背景
const gradient = ctx.createLinearGradient(0, 0, 0, 700);
gradient.addColorStop(0, '#f5f7fa');
gradient.addColorStop(1, '#e8ecf1');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 700);

// 标题栏
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 1200, 50);
ctx.strokeStyle = '#e1e4e8';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(0, 50);
ctx.lineTo(1200, 50);
ctx.stroke();

// Logo
ctx.fillStyle = '#1a5fb4';
ctx.font = 'bold 18px Inter, sans-serif';
ctx.fillText('🔧 机械臂控制系统', 20, 33);

// 右侧按钮区域
ctx.fillStyle = '#1a5fb4';
ctx.beginPath();
ctx.roundRect(950, 10, 100, 30, 5);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.font = '14px Inter, sans-serif';
ctx.fillText('⚫ 连接设备', 960, 30);

ctx.fillStyle = '#dc3545';
ctx.beginPath();
ctx.roundRect(1060, 10, 100, 30, 5);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.fillText('紧急停止', 1080, 30);

// 左侧面板
ctx.fillStyle = '#ffffff';
ctx.shadowColor = 'rgba(0,0,0,0.05)';
ctx.shadowBlur = 10;
ctx.beginPath();
ctx.roundRect(20, 70, 300, 610, 10);
ctx.fill();
ctx.shadowBlur = 0;

// 左侧面板标题
ctx.strokeStyle = '#e1e4e8';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(20, 115);
ctx.lineTo(320, 115);
ctx.stroke();

ctx.fillStyle = '#1a1a2e';
ctx.font = 'bold 14px Inter, sans-serif';
ctx.fillText('控制模式', 35, 100);

// 模式标签
ctx.fillStyle = '#1a5fb4';
ctx.beginPath();
ctx.roundRect(35, 130, 125, 35, 6);
ctx.fill();
ctx.fillStyle = '#ffffff';
ctx.font = '13px Inter, sans-serif';
ctx.fillText('关节控制', 70, 152);

ctx.fillStyle = '#f5f7fa';
ctx.strokeStyle = '#e1e4e8';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.roundRect(170, 130, 125, 35, 6);
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#5c6b7f';
ctx.fillText('坐标控制', 205, 152);

// 关节滑块示意
const joints = ['关节 1 (底座)', '关节 2 (肩部)', '关节 3 (肘部)', '关节 4 (腕部)', '关节 5 (翻转)', '关节 6 (旋转)'];
const values = ['0°', '-15°', '45°', '0°', '30°', '-45°'];
const percentages = [0.5, 0.42, 0.65, 0.5, 0.58, 0.38];

ctx.fillStyle = '#1a1a2e';
ctx.font = 'bold 14px Inter, sans-serif';
ctx.fillText('关节角度控制', 35, 195);

ctx.beginPath();
ctx.moveTo(20, 210);
ctx.lineTo(320, 210);
ctx.stroke();

for (let i = 0; i < 6; i++) {
    const y = 235 + i * 65;
    
    // 标签
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(joints[i], 35, y);
    
    // 值
    ctx.fillStyle = '#1a5fb4';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(values[i], 260, y);
    
    // 滑块背景
    ctx.fillStyle = '#e1e4e8';
    ctx.beginPath();
    ctx.roundRect(35, y + 10, 260, 6, 3);
    ctx.fill();
    
    // 滑块进度
    ctx.fillStyle = '#1a5fb4';
    ctx.beginPath();
    ctx.roundRect(35, y + 10, 260 * percentages[i], 6, 3);
    ctx.fill();
    
    // 滑块按钮
    ctx.fillStyle = '#1a5fb4';
    ctx.beginPath();
    ctx.arc(35 + 260 * percentages[i], y + 13, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(35 + 260 * percentages[i], y + 13, 3, 0, Math.PI * 2);
    ctx.fill();
}

// 右侧可视化区域
ctx.fillStyle = '#ffffff';
ctx.shadowColor = 'rgba(0,0,0,0.05)';
ctx.shadowBlur = 10;
ctx.beginPath();
ctx.roundRect(340, 70, 840, 450, 10);
ctx.fill();
ctx.shadowBlur = 0;

// 3D机械臂绘制 (简化示意)
function drawRobotArm() {
    const centerX = 760;
    const centerY = 350;
    
    // 网格背景
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * 40, centerY - 100);
        ctx.lineTo(centerX + i * 20, centerY + 50);
        ctx.stroke();
    }
    
    // 机械臂连杆
    ctx.strokeStyle = '#1a5fb4';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 底座
    ctx.fillStyle = '#0d9f61';
    ctx.beginPath();
    ctx.arc(centerX - 80, centerY + 80, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 80, centerY + 80, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // 连杆
    ctx.beginPath();
    ctx.moveTo(centerX - 80, centerY + 80);
    ctx.lineTo(centerX - 40, centerY + 20);
    ctx.lineTo(centerX + 20, centerY - 30);
    ctx.lineTo(centerX + 60, centerY - 10);
    ctx.lineTo(centerX + 100, centerY - 40);
    ctx.stroke();
    
    // 关节
    const joints = [
        { x: centerX - 40, y: centerY + 20 },
        { x: centerX + 20, y: centerY - 30 },
        { x: centerX + 60, y: centerY - 10 },
        { x: centerX + 100, y: centerY - 40 }
    ];
    
    joints.forEach(j => {
        ctx.fillStyle = '#1a5fb4';
        ctx.beginPath();
        ctx.arc(j.x, j.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(j.x, j.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 末端执行器
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX + 100, centerY - 40);
    ctx.lineTo(centerX + 130, centerY - 55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + 100, centerY - 40);
    ctx.lineTo(centerX + 130, centerY - 25);
    ctx.stroke();
    
    // 坐标轴
    ctx.lineWidth = 2;
    
    // X轴 - 红
    ctx.strokeStyle = '#dc3545';
    ctx.beginPath();
    ctx.moveTo(centerX - 80, centerY + 80);
    ctx.lineTo(centerX - 30, centerY + 95);
    ctx.stroke();
    
    // Y轴 - 绿
    ctx.strokeStyle = '#0d9f61';
    ctx.beginPath();
    ctx.moveTo(centerX - 80, centerY + 80);
    ctx.lineTo(centerX - 65, centerY + 30);
    ctx.stroke();
    
    // Z轴 - 蓝
    ctx.strokeStyle = '#1a5fb4';
    ctx.beginPath();
    ctx.moveTo(centerX - 80, centerY + 80);
    ctx.lineTo(centerX - 50, centerY + 65);
    ctx.stroke();
    
    // 坐标显示
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#e1e4e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(360, 90, 200, 40, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#1a5fb4';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('X: 324.5  Y: 125.3  Z: 198.7', 375, 115);
}

drawRobotArm();

// 底部状态面板
ctx.fillStyle = '#ffffff';
ctx.shadowColor = 'rgba(0,0,0,0.05)';
ctx.shadowBlur = 10;
ctx.beginPath();
ctx.roundRect(340, 535, 840, 70, 10);
ctx.fill();
ctx.shadowBlur = 0;

const statusItems = [
    { icon: '🔗', label: '连接状态', value: '已连接', color: '#0d9f61' },
    { icon: '⚡', label: '运行状态', value: '待机', color: '#1a5fb4' },
    { icon: '🎯', label: '当前模式', value: '关节控制', color: '#1a1a2e' },
    { icon: '🌡️', label: '电机温度', value: '35°C', color: '#1a1a2e' }
];

statusItems.forEach((item, i) => {
    const x = 370 + i * 200;
    
    // 背景
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.roundRect(x, 545, 170, 50, 6);
    ctx.fill();
    
    // 图标
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(item.icon, x + 12, 575);
    
    // 标签
    ctx.fillStyle = '#8b9aad';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(item.label, x + 42, 565);
    
    // 值
    ctx.fillStyle = item.color;
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(item.value, x + 42, 585);
});

// 日志面板
ctx.fillStyle = '#ffffff';
ctx.shadowColor = 'rgba(0,0,0,0.05)';
ctx.shadowBlur = 10;
ctx.beginPath();
ctx.roundRect(340, 615, 840, 65, 10);
ctx.fill();
ctx.shadowBlur = 0;

// 日志头部
ctx.fillStyle = '#f5f7fa';
ctx.beginPath();
ctx.roundRect(340, 615, 840, 35, { topLeft: 10, topRight: 10, bottomLeft: 0, bottomRight: 0 });
ctx.fill();

ctx.fillStyle = '#1a1a2e';
ctx.font = 'bold 13px Inter, sans-serif';
ctx.fillText('系统日志', 355, 637);

ctx.strokeStyle = '#e1e4e8';
ctx.beginPath();
ctx.moveTo(340, 650);
ctx.lineTo(1180, 650);
ctx.stroke();

// 日志内容
ctx.fillStyle = '#8b9aad';
ctx.font = '12px monospace';
ctx.fillText('09:15:30', 355, 670);
ctx.fillStyle = '#0dcaf0';
ctx.fillText('系统初始化完成', 420, 670);

// 保存图片
const link = document.createElement('a');
link.download = 'preview.png';
link.href = canvas.toDataURL();
link.click();

console.log('Preview image generated!');
