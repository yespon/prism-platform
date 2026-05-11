import argparse
import asyncio

from deerflow.database.user_config_service import get_user_payloads


async def _main(user_id: str) -> None:
    app_payload, ext_payload = await get_user_payloads(user_id)

    models = app_payload.get("models") if isinstance(app_payload, dict) else []
    mcp_servers = ext_payload.get("mcpServers") if isinstance(ext_payload, dict) else {}
    skills = ext_payload.get("skills") if isinstance(ext_payload, dict) else {}

    print(f"seed-ok user_id={user_id}")
    print(f"models={len(models) if isinstance(models, list) else 0}")
    print(f"mcp_servers={len(mcp_servers) if isinstance(mcp_servers, dict) else 0}")
    print(f"skills={len(skills) if isinstance(skills, dict) else 0}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify user config seed and DB payload availability")
    parser.add_argument("--user-id", required=True, help="Target user id")
    args = parser.parse_args()
    asyncio.run(_main(args.user_id))