import re
with open('src/core/threads/hooks.ts', 'r') as f:
    text = f.read()

target = 'await thread.submit('
replacement = '''const apiClient = getAPIClient(isMock);
          if (thread.messages.length === 0) {
            try {
              await apiClient.threads.create({ threadId });
            } catch (err: any) {
              const strErr = typeof err?.detail === "string" ? err.detail : String(err);
              if (strErr.includes("409") || strErr.includes("already exists")) {
              } else {
                console.warn("Silent thread creation warning:", err);
              }
            }
          }
          await thread.submit('''

# only replace the first occurrence inside sendMessage (which is preceded by 'filesForSubmit')
text = text.replace('          await thread.submit(', replacement)

with open('src/core/threads/hooks.ts', 'w') as f:
    f.write(text)

