import httpx
import json

with httpx.stream("POST", "http://localhost:8001/api/v1/agent-terminal/chat", json={
    "session_id": "test_session",
    "model_name": "gpt-4o",
    "mode": "cmd",
    "user_input": "检查系统负载"
}) as response:
    for line in response.iter_lines():
        if line:
            print(line)
