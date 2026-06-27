with open("backend/app/gateway/routers/models.py", "r") as f:
    content = f.read()

old_code = """    model = next((row for row in rows if row.name == model_name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    settings = model.settings if isinstance(getattr(model, "settings", None), dict) else {}
    return ModelCredentialsResponse(
        api_key=settings.get("api_key", ""),
        base_url=settings.get("base_url", ""),
        use=model.use,
        model=model.model
    )"""

new_code = """    model = next((row for row in rows if row["name"] == model_name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    settings = model.get("settings") if isinstance(model.get("settings"), dict) else {}
    return ModelCredentialsResponse(
        api_key=settings.get("api_key", ""),
        base_url=settings.get("base_url", ""),
        use=model.get("use", ""),
        model=model.get("model", "")
    )"""

if old_code in content:
    new_content = content.replace(old_code, new_code)
    with open("backend/app/gateway/routers/models.py", "w") as f:
        f.write(new_content)
    print("Successfully fixed dict access!")
else:
    print("Could not find the target code to replace.")
