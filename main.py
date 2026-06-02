from fastapi import FastAPI
import pydantic

app = FastAPI()

url_list = []

@app.get("/")
def home():
    return {"message": "URL Shortener is running!"}

@app.get("/list")
def list():
    return url_list

@app.get("/url/{id}")
def get_url(id: str):
    return {"message": f"URL for ID {id}!"}

@app.post("/url")
def create_url(url: str):
    url_list.append(url)
    return {"message": f"URL {url} added!"}