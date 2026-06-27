@router.get("/models/{model_name:path}/credentials", response_model=ModelCredentialsResponse, include_in_schema=False)
async def get_model_credentials(model_name: str, request: Request) -> ModelCredentialsResponse:
    """Internal endpoint for Next.js to fetch model credentials"""
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
