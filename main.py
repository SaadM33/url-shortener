from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "URL Shortener is running!"}

@app.get("/about")
def about():
    return {"name": "Im saad", "age": 22, "hobby": "programming"}

@app.get("/url/{id}")
def get_url(id: str):
    return {"message": f"URL for ID {id}!"}

__name__ #means 