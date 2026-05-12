#!/bin/bash
# GitHub 推送脚本
# 使用方法:
# 1. 先在 GitHub 注册账号并创建仓库
# 2. 修改下面的 GITHUB_USER 和 REPO_NAME
# 3. 运行: chmod +x push-to-github.sh && ./push-to-github.sh

# ===== 请修改以下配置 =====
GITHUB_USER="your-github-username"    # 您的GitHub用户名
REPO_NAME="robotic-arm-controller"     # 仓库名称
EMAIL="15801284138@139.com"            # 您的邮箱
# ==========================

echo "=========================================="
echo "   机械臂控制系统 - GitHub 推送脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 robotic-arm-controller 目录下运行此脚本"
    exit 1
fi

# 配置 Git
echo "📋 配置 Git..."
git config user.email "$EMAIL"
git config user.name "Robotic Arm Developer"

# 初始化仓库
echo "📦 初始化 Git 仓库..."
git init

# 添加所有文件
echo "📁 添加文件到仓库..."
git add .

# 提交
echo "💾 提交更改..."
git commit -m "Initial commit: Robotic Arm Controller v1.0

- 6-axis joint control
- TCP/WebSocket communication
- 3D visualization
- Cartesian coordinate control
- Preset actions (pick, place, wave, dance)"

# 添加远程仓库
echo "🔗 添加远程仓库..."
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo ""
echo "=========================================="
echo "✅ 本地仓库准备完成!"
echo "=========================================="
echo ""
echo "下一步操作:"
echo "1. 确保已在 GitHub 创建仓库: $REPO_NAME"
echo "2. 运行以下命令推送代码:"
echo ""
echo "   git push -u origin main"
echo ""
echo "或使用 (如果 main 分支名不同):"
echo ""
echo "   git push -u origin master"
echo ""
echo "首次推送需要输入 GitHub 用户名和密码"
echo "(建议使用 Personal Access Token 作为密码)"
echo ""
