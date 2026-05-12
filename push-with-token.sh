#!/bin/bash
# 使用 GitHub Token 推送脚本
# 使用方法: ./push-with-token.sh YOUR_GITHUB_TOKEN

TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "❌ 错误: 请提供 GitHub Personal Access Token"
    echo ""
    echo "使用方法:"
    echo "  ./push-with-token.sh ghp_xxxxxxxxxxxxxxxxxxxx"
    echo ""
    echo "如何获取 Token:"
    echo "1. 访问 https://github.com/settings/tokens"
    echo "2. 点击 'Generate new token (classic)'"
    echo "3. 勾选 'repo' 权限"
    echo "4. 复制生成的 token"
    exit 1
fi

echo "🚀 正在推送到 GitHub..."
echo ""

# 使用 token 推送
git push https://liu-xz01:${TOKEN}@github.com/liu-xz01/robotic-arm-controller.git main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功!"
    echo ""
    echo "🌐 查看您的仓库:"
    echo "   https://github.com/liu-xz01/robotic-arm-controller"
else
    echo ""
    echo "❌ 推送失败，请检查:"
    echo "   1. Token 是否正确"
    echo "   2. 仓库是否已创建"
    echo "   3. Token 是否有 repo 权限"
fi
