import asyncio
import os
import tempfile
import subprocess

async def test():
    fd, path = tempfile.mkstemp(text=True)
    script_content = f"#!/bin/sh\necho 'wrongpassword'\n"
    os.write(fd, script_content.encode('utf-8'))
    os.close(fd)
    os.chmod(path, 0o700)
    
    cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=no", "-o", "ConnectTimeout=5", "-p", "22", "root@100.69.72.90", "echo", "SUCCESS"]
    env = os.environ.copy()
    env["SSH_ASKPASS"] = path
    env["SSH_ASKPASS_REQUIRE"] = "force"
    env["DISPLAY"] = "dummy:0"
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    print("STDOUT:", stdout)
    print("STDERR:", stderr)

asyncio.run(test())
