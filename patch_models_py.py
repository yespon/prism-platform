import re

with open('backend/app/gateway/routers/models.py', 'r') as f:
    content = f.read()

# Add imports
imports = """
from deerflow.database.models import TenantModelConfig
from deerflow.database.session import get_session_factory
from deerflow.database.secrets_crypto import decrypt_model_settings
from sqlmodel import select
"""
content = content.replace("from deerflow.reflection.resolvers import resolve_class", "from deerflow.reflection.resolvers import resolve_class\n" + imports)

# Replace get_model_credentials
old_func_pattern = r'@router\.get\("/models/{model_name:path}/credentials".*?return ModelCredentialsResponse\([^)]+\)'
new_func = """@router.get("/models/{model_name:path}/credentials", response_model=ModelCredentialsResponse, include_in_schema=False)
async def get_model_credentials(model_name: str, request: Request) -> ModelCredentialsResponse:
    \"\"\"Internal endpoint for Next.js to fetch model credentials\"\"\"
    require_tenant_context(request)
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = request.state.user_id

    # Fetch model config directly to get encrypted settings
    session_factory = get_session_factory()
    async with session_factory() as session:
        # First check user models
        user_model = (await session.execute(
            select(TenantModelConfig).where(
                TenantModelConfig.name == model_name,
                TenantModelConfig.user_id == user_id,
                TenantModelConfig.tenant_id == tenant_id
            )
        )).scalar_one_or_none()

        # Then check tenant shared models
        if not user_model and tenant_id:
            from deerflow.database.user_config_service import _tenant_shared_model_owner_id
            user_model = (await session.execute(
                select(TenantModelConfig).where(
                    TenantModelConfig.name == model_name,
                    TenantModelConfig.user_id == _tenant_shared_model_owner_id(tenant_id),
                    TenantModelConfig.tenant_id == tenant_id
                )
            )).scalar_one_or_none()

        # Finally check global platform models
        if not user_model:
            from deerflow.database.user_config_service import PLATFORM_MODEL_OWNER_ID
            user_model = (await session.execute(
                select(TenantModelConfig).where(
                    TenantModelConfig.name == model_name,
                    TenantModelConfig.user_id == PLATFORM_MODEL_OWNER_ID,
                    TenantModelConfig.tenant_id.is_(None)
                )
            )).scalar_one_or_none()

    if not user_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    settings = user_model.settings if isinstance(getattr(user_model, "settings", None), dict) else {}
    settings = decrypt_model_settings(settings)
    
    return ModelCredentialsResponse(
        api_key=settings.get("api_key", ""),
        base_url=settings.get("base_url", ""),
        use=user_model.use or "langchain_openai.ChatOpenAI",
        model=user_model.model or ""
    )"""

content = re.sub(old_func_pattern, new_func, content, flags=re.DOTALL)

with open('backend/app/gateway/routers/models.py', 'w') as f:
    f.write(content)

print("Successfully patched models.py")
