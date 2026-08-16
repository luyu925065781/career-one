#!/bin/zsh

set -u

readonly SCRIPT_DIR="${0:A:h}"

pause_on_error() {
  print
  print -r -- "启动失败。请保留此窗口，并把上面的错误信息发给维护者。"
  if [[ -t 0 ]]; then
    read -r "?按回车键关闭窗口…"
  fi
}

if ! cd -- "$SCRIPT_DIR"; then
  print -u2 -r -- "无法进入择程AI项目目录：$SCRIPT_DIR"
  pause_on_error
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  print -u2 -r -- "未找到 npm。请先安装 Node.js 20.9 或更高版本。"
  pause_on_error
  exit 1
fi

print -r -- "正在启动择程AI工作台…"
npm run dev:web -- --page /jobs
launcher_exit_code=$?

if (( launcher_exit_code != 0 )); then
  pause_on_error
fi

exit "$launcher_exit_code"
