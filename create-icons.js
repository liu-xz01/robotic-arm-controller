const fs = require('fs');
const { createCanvas } = require('canvas');

// 如果没有 canvas 模块，使用简单方案生成 SVG 引用
const sizes = [16, 32, 48, 64, 128, 192, 256, 512];
const svgContent = fs.readFileSync('./assets/icons/logo.svg', 'utf8');

// 创建 HTML 文件用于在浏览器中生成图标
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Generate Icons</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-container { display: inline-block; margin: 10px; text-align: center; }
        .icon-container img { display: block; margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>机械臂控制系统 - 图标</h1>
    <p>右键点击图标保存不同尺寸：</p>
    ${sizes.map(size => `
        <div class="icon-container">
            <img src="logo.svg" width="${size}" height="${size}">
            <span>${size}x${size}</span>
        </div>
    `).join('')}
</body>
</html>
`;

fs.writeFileSync('./generate-icons.html', htmlContent);
console.log('✅ 已创建图标生成页面: generate-icons.html');
console.log('请用浏览器打开此页面，右键保存所需尺寸的图标。');

// 同时更新 index.html 使用新 logo
try {
    let indexHtml = fs.readFileSync('./index.html', 'utf8');
    
    // 更新 favicon
    indexHtml = indexHtml.replace(
        /<link rel="icon"[^>]*>/,
        '<link rel="icon" type="image/svg+xml" href="assets/icons/logo.svg">'
    );
    
    // 更新 logo 引用
    indexHtml = indexHtml.replace(
        /<img src="assets\/logo\.png"[^>]*>/,
        '<img src="assets/icons/logo.svg" alt="机械臂控制系统" class="logo-icon-img">'
    );
    
    fs.writeFileSync('./index.html', indexHtml);
    console.log('✅ 已更新 index.html 使用新 Logo');
} catch (e) {
    console.log('⚠️ 更新 index.html 时出错:', e.message);
}

console.log('');
console.log('📁 生成的文件:');
console.log('  - assets/icons/logo.svg (矢量图标，可无限缩放)');
console.log('  - generate-icons.html (用于导出 PNG 的辅助页面)');
