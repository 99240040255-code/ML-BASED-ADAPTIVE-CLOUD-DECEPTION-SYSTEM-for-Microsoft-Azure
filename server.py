from datetime import datetime
from routers.dashboard import router as dashboard_router
# Fold resource routers into the single /api router before mounting it.
api_router.include_router(dashboard_router)
logger = logging.getLogger(__name__)

# Include the router in the main app last so every endpoint remains under /api.
app.include_router(api_router)
