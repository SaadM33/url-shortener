from fastapi import FastAPI
from pydantic import BaseModel

class URL(BaseModel):
    url: str

app = FastAPI()

url_list = []

@app.get("/")
def home():
    return {"message": "URL Shortener is running!"}

@app.get("/urls")
def get_urls():
    return url_list

@app.get("/urls/{id}")
def get_url(id: str):
    return {"message": f"URL for ID {id}!"}

@app.post("/urls")
def create_url(url: URL):
    url_list.append(url.url)
    return {"message": f"URL {url.url} added!"}