from fastapi import FastAPI, HTTPException 
from fastapi.responses import RedirectResponse
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


def generate_short_code(length=6):
    pool = string.ascii_letters + string.digits  # a-z, A-Z, 0-9
    return  ''.join(secrets.choice(pool) for _ in range(length))

@app.post("/urls", response_model=URLResponse)
def create_url(data: URLInput):
    db = session_local()
    new_url = URL(long_url=data.url, short_code=generate_short_code())
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    db.close()
    return new_url


@app.get("/{code}")
def get_url(code: str):
    if (code == "test"):
        return RedirectResponse(url="urls")
    db = session_local()
    res = db.query(URL).filter(URL.short_code == code).first()
    if res is not None:
        res.visits += 1
        db.commit()
        long_url = res.long_url
        db.close()
        return RedirectResponse(url=long_url, status_code=302)
    else:
        db.close()
        raise HTTPException(status_code=404, detail="short code not found")


