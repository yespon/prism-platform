with open("backend/app/gateway/routers/models.py", "r") as f:
    content = f.read()

old_code = """    rows = await get_user_models(request.state.user_id, tenant_id=getattr(request.state, "tenant_id", None))"""
new_code = """    tenant_id = getattr(request.state, "tenant_id", None)
    rows = await get_available_models(
        request.state.user_id,
        tenant_id,
        is_tenant_admin=_is_tenant_admin(request),
        is_platform_admin=_is_platform_admin(request),
    )"""

if old_code in content:
    new_content = content.replace(old_code, new_code)
    with open("backend/app/gateway/routers/models.py", "w") as f:
        f.write(new_content)
    print("Successfully updated get_model_credentials!")
else:
    print("Could not find the target code to replace.")
