
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

class URLInput(BaseModel):
    url: str

app = FastAPI()

url_list = []

@app.get("/")
def home():
    return "Hello, World! This is a simple URL storage API. You can use the /urls endpoint to store and retrieve URLs.\n"


@app.get("/urls")
def get_urls():
    return {"size": len(url_list), "urls": url_list}

@app.post("/urls")
def create_url(data: URLInput):
    url_list.append(data.url)
    return {"message": f"URL {data.url} added to id {len(url_list) - 1}!"}


@app.get("/urls/{id}")
def get_url(id: int):
    if 0 <= id < len(url_list):
        return {"id": id, "url": url_list[id]}
    else:
        raise HTTPException(404, detail="URL ID out of range.")



# use websockets to notify clients of new URLs added