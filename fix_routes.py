import re

with open("backend/app/gateway/routers/models.py", "r") as f:
    content = f.read()

credentials_code = """
class ModelCredentialsResponse(BaseModel):
    api_key: str
    base_url: str
    use: str
    model: str

@router.get("/models/{model_name:path}/credentials", response_model=ModelCredentialsResponse, include_in_schema=False)
async def get_model_credentials(model_name: str, request: Request) -> ModelCredentialsResponse:
    \"\"\"Internal endpoint for Next.js to fetch model credentials\"\"\"
    require_tenant_context(request)
    rows = await get_user_models(request.state.user_id, tenant_id=getattr(request.state, "tenant_id", None))
    model = next((row for row in rows if row.name == model_name), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    settings = model.settings if isinstance(getattr(model, "settings", None), dict) else {}
    return ModelCredentialsResponse(
        api_key=settings.get("api_key", ""),
        base_url=settings.get("base_url", ""),
        use=model.use,
        model=model.model
    )
"""

# Find the get_model route
target_index = content.find('@router.get(\n    "/models/{model_name:path}",')
if target_index == -1:
    print("Could not find get_model route!")
    exit(1)

# Insert the credentials route before get_model
new_content = content[:target_index] + credentials_code + "\n" + content[target_index:]

with open("backend/app/gateway/routers/models.py", "w") as f:
    f.write(new_content)

print("Successfully restored and moved credentials route!")
