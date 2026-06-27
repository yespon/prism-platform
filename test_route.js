fetch("http://localhost:3000/api/terminal/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    // We don't have a valid cookie, but the Python backend might still return 401. Let's see.
  },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hi" }],
    modelName: "deepseek-v4-flash"
  })
}).then(res => res.text()).then(console.log).catch(console.error);
