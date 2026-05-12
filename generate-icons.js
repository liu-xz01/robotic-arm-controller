#!/usr/bin/env node
/**
 * 图标生成脚本
 * 将 SVG 转换为各种尺寸的 PNG 和 favicon
 */

const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a5fb4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d3d7a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="armGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8f0fe;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient)"/>
  <rect x="196" y="360" width="120" height="40" rx="8" fill="#0d9f61"/>
  <rect x="216" y="340" width="80" height="30" rx="6" fill="#0b8a53"/>
  <circle cx="256" cy="320" r="25" fill="#ffffff"/>
  <circle cx="256" cy="320" r="12" fill="#1a5fb4"/>
  <rect x="236" y="240" width="40" height="90" rx="8" fill="url(#armGradient)" transform="rotate(-15 256 320)"/>
  <circle cx="290" cy="245" r="22" fill="#ffffff"/>
  <circle cx="290" cy="245" r="10" fill="#1a5fb4"/>
  <rect x="275" y="165" width="35" height="85" rx="8" fill="url(#armGradient)" transform="rotate(25 290 245)"/>
  <circle cx="320" cy="175" r="18" fill="#ffffff"/>
  <circle cx="320" cy="175" r="8" fill="#1a5fb4"/>
  <rect x="310" y="135" width="25" height="45" rx="6" fill="#e69f00" transform="rotate(-10 320 175)"/>
  <path d="M320 135 L295 100 L305 95 L330 130 Z" fill="#dc3545"/>
  <rect x="290" y="95" width="20" height="10" rx="3" fill="#dc3545"/>
  <path d="M325 135 L350 100 L340 95 L315 130 Z" fill="#dc3545"/>
  <rect x="335" y="95" width="20" height="10" rx="3" fill="#dc3545"/>
  <circle cx="256" cy="320" r="6" fill="#0d9f61"/>
  <circle cx="290" cy="245" r="5" fill="#0d9f61"/>
  <circle cx="320" cy="175" r="4" fill="#0d9f61"/>
  <circle cx="180" cy="380" r="8" fill="#0dcaf0" opacity="0.8"/>
  <circle cx="160" cy="360" r="6" fill="#0dcaf0" opacity="0.6"/>
  <circle cx="145" cy="340" r="4" fill="#0dcaf0" opacity="0.4"/>
</svg>`;

// 确保目录存在
const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// 保存 SVG
fs.writeFileSync(path.join(iconsDir, 'logo.svg'), svgContent);
console.log('✅ 已生成: assets/icons/logo.svg');

// 创建各种尺寸的 SVG (通过 viewBox 调整)
const sizes = [16, 32, 48, 64, 128, 192, 256, 512];

sizes.forEach(size => {
    const sizedSvg = svgContent.replace(
        'viewBox="0 0 512 512"',
        `viewBox="0 0 512 512" width="${size}" height="${size}"`
    );
    fs.writeFileSync(path.join(iconsDir, `logo-${size}.svg`), sizedSvg);
});

console.log(`✅ 已生成 ${sizes.length} 种尺寸的 SVG 图标`);

// 创建图标清单
const iconManifest = {
    name: "Robotic Arm Controller",
    short_name: "RobotArm",
    icons: sizes.map(size => ({
        src: `assets/icons/logo-${size}.svg`,
        sizes: `${size}x${size}`,
        type: "image/svg+xml"
    })),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a5fb4"
};

fs.writeFileSync(
    path.join(__dirname, 'manifest.json'),
    JSON.stringify(iconManifest, null, 2)
);
console.log('✅ 已生成: manifest.json (PWA 配置文件)');

// 更新 index.html
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    
    // 添加 manifest
    if (!indexHtml.includes('manifest.json')) {
        indexHtml = indexHtml.replace(
            '</head>',
            '    <link rel="manifest" href="manifest.json">\n</head>'
        );
    }
    
    // 更新 favicon
    indexHtml = indexHtml.replace(
        /<link rel="icon"[^>]*>/,
        '<link rel="icon" type="image/svg+xml" href="assets/icons/logo.svg">'
    );
    
    // 添加各种尺寸的图标
    const iconLinks = sizes.map(size => 
        `    <link rel="icon" type="image/svg+xml" sizes="${size}x${size}" href="assets/icons/logo-${size}.svg">`
    ).join('\n');
    
    if (!indexHtml.includes('logo-16.svg')) {
        indexHtml = indexHtml.replace(
            '<link rel="icon" type="image/svg+xml" href="assets/icons/logo.svg">',
            `<link rel="icon" type="image/svg+xml" href="assets/icons/logo.svg">\n${iconLinks}`
        );
    }
    
    fs.writeFileSync(indexPath, indexHtml);
    console.log('✅ 已更新 index.html 添加图标引用');
}

console.log('');
console.log('📁 生成的文件:');
console.log('  ✓ assets/icons/logo.svg (主图标)');
console.log('  ✓ assets/icons/logo-{size}.svg (各种尺寸)');
console.log('  ✓ manifest.json (PWA 配置)');
console.log('');
console.log('💡 提示: 现代浏览器支持 SVG 图标，可直接使用。');
console.log('   如需 PNG 格式，可用浏览器打开 SVG 后截图保存。');
