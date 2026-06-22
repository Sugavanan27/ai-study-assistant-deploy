from supabase import create_client, Client
from backend.config import settings

def get_supabase_client() -> Client:
    """Returns a general Supabase client using the anon key."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_admin_client() -> Client:
    """Returns an admin Supabase client using the service role key."""
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        # Fallback to general client if service role key is not set
        return get_supabase_client()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def get_supabase_user_client(token: str) -> Client:
    """Returns a Supabase client authenticated as the specific user."""
    # We can pass the user's JWT token in the headers for all requests
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    client.postgrest.auth(token)
    return client
