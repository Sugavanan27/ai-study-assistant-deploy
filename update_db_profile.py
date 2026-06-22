import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.config import settings
from backend.services.supabase_service import get_supabase_admin_client

def update_user_profile():
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        print("Supabase database is not configured. Running in Mock Mode - no database update required.")
        return
        
    print("Connecting to Supabase PostgreSQL database...")
    try:
        supabase = get_supabase_admin_client()
        
        # We try to update for both formats (with and without .com)
        emails = ["qq489815@gmail", "qq489815@gmail.com"]
        updated = False
        
        for email in emails:
            # Check if user profile exists
            res = supabase.table("profiles").select("id").eq("email", email).execute()
            if res.data and len(res.data) > 0:
                user_id = res.data[0]["id"]
                print(f"User found with email: {email} (ID: {user_id}). Updating name to 'Sugavanan'...")
                
                # Update profiles table
                supabase.table("profiles").update({"full_name": "Sugavanan"}).eq("id", user_id).execute()
                print(f"Success: Profiles table updated for {email}.")
                updated = True
                
        if not updated:
            print("Warning: No user profile with email 'qq489815@gmail' or 'qq489815@gmail.com' was found in the database. Ensure the user has registered first.")
            
    except Exception as e:
        print(f"Database error during update: {e}")

if __name__ == "__main__":
    update_user_profile()
