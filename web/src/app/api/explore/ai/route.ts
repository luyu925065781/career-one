// AI job discovery is deliberately executed by the user's current Agent.
// Keep this legacy endpoint as an explicit boundary for older Web clients:
// it must never resolve or spawn a local Agent CLI.
export async function POST() {
  return Response.json(
    {
      code: "AGENT_HANDOFF_REQUIRED",
      error: "请在“岗位评估”中把具体岗位交给当前 Agent，Web 工作台不直接执行 AI 搜索。",
    },
    { status: 410 },
  );
}
