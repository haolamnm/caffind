from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from googletrans import Translator
import inspect

app = FastAPI(title="Caffind Translator", version="0.1.0")
translator = Translator()

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


# Convenience script entry point
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
