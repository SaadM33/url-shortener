from fastapi import FastAPI, HTTPException
from schemas import URLInput, URLResponse
from database import Base, engine, session_local
from models import URL

import string
import secrets


app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return "Hello, World!"


@app.get("/urls", response_model=list[URLResponse]) 
def get_urls():
    db = session_local()
    data = db.query(URL).all()
    db.close()
    return data


# def generate_short_code(length=6):
#     alphabet = string.ascii_letters + string.digits  # a-z, A-Z, 0-9
#     return ''.join(secrets.choice(alphabet) for _ in range(length))

@app.post("/urls", response_model=URLResponse)
def create_url(data: URLInput):

    db = session_local()
    new_url = URL(long_url=data.url, short_code="short" + str(len(db.query(URL).all()) + 1))
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    db.close()
    return new_url



# @app.get("/urls/{id}")
# def get_url(id: int):
#     if 0 <= id < len(url_list):
#         return {"id": id, "url": url_list[id]}
#     else:
#         raise HTTPException(404, detail="URL ID out of range.")



