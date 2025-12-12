from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from googletrans import Translator
import inspect
import os
import firebase_admin
from firebase_admin import auth, credentials
from huggingface_hub import InferenceClient

app = FastAPI(title="Caffind API", version="0.2.0")
translator = Translator()

# Hugging Face Inference Client - works without token for free models
hf_client = InferenceClient()

# Initialize Firebase Admin SDK
# You can either use a service account JSON file or default credentials
firebase_credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
if firebase_credentials_path and os.path.exists(firebase_credentials_path):
    cred = credentials.Certificate(firebase_credentials_path)
    firebase_admin.initialize_app(cred)
else:
    # Use default credentials (for local development or cloud environments)
    try:
        firebase_admin.initialize_app()
    except ValueError:
        # App already initialized
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    target: str = Field("en", min_length=2, max_length=5, description="Target language code")
    source: str | None = Field(None, min_length=2, max_length=5, description="Optional source language code")


class TranslateResponse(BaseModel):
    translated_text: str
    detected_source: str
    target: str


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/translate", response_model=TranslateResponse)
async def translate(payload: TranslateRequest):
    try:
        result = translator.translate(
            payload.text,
            dest=payload.target,
            src=payload.source or "auto",
        )
        if inspect.isawaitable(result):
            result = await result
    except Exception as exc:  # pragma: no cover - googletrans raises generic exceptions
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TranslateResponse(
        translated_text=result.text,
        detected_source=result.src,
        target=result.dest,
    )


# ============== Authentication Endpoints ==============

class UserInfo(BaseModel):
    uid: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    provider_id: str | None


class TokenVerifyResponse(BaseModel):
    valid: bool
    user: UserInfo | None = None
    error: str | None = None


async def get_current_user(authorization: str = Header(None)) -> dict | None:
    """Dependency to verify Firebase ID token and get current user."""
    if not authorization:
        return None

    try:
        # Remove 'Bearer ' prefix if present
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        return None


async def require_auth(authorization: str = Header(...)) -> dict:
    """Dependency that requires authentication."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@app.post("/auth/verify", response_model=TokenVerifyResponse)
async def verify_token(authorization: str = Header(None)):
    """Verify a Firebase ID token."""
    if not authorization:
        return TokenVerifyResponse(valid=False, error="No token provided")

    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        decoded_token = auth.verify_id_token(token)

        # Get user info from Firebase
        user = auth.get_user(decoded_token["uid"])

        return TokenVerifyResponse(
            valid=True,
            user=UserInfo(
                uid=user.uid,
                email=user.email,
                display_name=user.display_name,
                photo_url=user.photo_url,
                provider_id=user.provider_id,
            ),
        )
    except auth.InvalidIdTokenError:
        return TokenVerifyResponse(valid=False, error="Invalid token")
    except auth.ExpiredIdTokenError:
        return TokenVerifyResponse(valid=False, error="Token expired")
    except Exception as exc:
        return TokenVerifyResponse(valid=False, error=str(exc))


@app.delete("/auth/user")
async def delete_user_account(current_user: dict = Depends(require_auth)):
    """Delete the currently authenticated user's account."""
    try:
        auth.delete_user(current_user["uid"])
        return {"success": True, "message": "Account deleted successfully"}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/auth/me", response_model=UserInfo)
async def get_current_user_info(current_user: dict = Depends(require_auth)):
    """Get current user information."""
    try:
        user = auth.get_user(current_user["uid"])
        return UserInfo(
            uid=user.uid,
            email=user.email,
            display_name=user.display_name,
            photo_url=user.photo_url,
            provider_id=user.provider_id,
        )
    except auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ============== Chat Endpoints ==============

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")
    history: list[ChatMessage] | None = Field(None, description="Optional chat history")


class ChatResponse(BaseModel):
    response: str


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """Chat with a coffee-focused LLM assistant."""
    try:
        messages = [
            {"role": "system", "content": "You are a friendly coffee expert. Keep answers short."},
            {"role": "user", "content": payload.message}
        ]
        
        response = hf_client.chat_completion(
            messages=messages,
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            max_tokens=150,
        )
        
        return ChatResponse(response=response.choices[0].message.content)
        
    except Exception as exc:
        print(f"Chat error: {exc}")
        return ChatResponse(response="Sorry, couldn't connect. Try again!")


# Convenience script entry point
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
