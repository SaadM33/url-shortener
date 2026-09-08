from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.urls import router
from app.api.routes.auth import router as auth_router

app = FastAPI(title="URL Shortener")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)
app.include_router(auth_router)


@app.get("/")
def home():
    return {"message": "URL shorener is running 👍"}
