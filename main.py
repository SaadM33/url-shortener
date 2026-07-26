from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from schemas import URLInput, URLResponse
from database import Base, engine, session_local
from models import URL

import string
import secrets


app = FastAPI()

# CORS middleware   
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return "URL shorener is running 👍"


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
    
    while True:
        code = generate_short_code()
        exists = db.query(URL).filter(URL.short_code == code).first()
        if not exists:
            break
            
    new_url = URL(long_url=str(data.url), short_code=code)
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    db.close()
    return new_url


@app.put("/urls/{code}", response_model=URLResponse)
def update_url(code: str, data: URLInput):
    db = session_local()
    url = db.query(URL).filter(URL.short_code == code).first()
    if url:
        url.long_url = str(data.url)
        db.commit()
        db.refresh(url)
        db.close()
        return url
    else:
        db.close()
        raise HTTPException(status_code=404, detail="short code not found")


@app.delete("/urls/{code}")
def del_url(code: str):
    db = session_local()
    res = db.query(URL).filter(URL.short_code == code).first()
    if res:
        db.delete(res)
        db.commit()
        db.close()
        return {"detail": "URL deleted successfully"}
    else:
        db.close()
        raise HTTPException(status_code=404, detail="short code not found")


@app.get("/{code}")
def get_url(code: str):
    db = session_local()
    res = db.query(URL).filter(URL.short_code == code).first()
    if res:
        res.visits += 1
        db.commit()
        long_url = res.long_url
        db.close()
        return RedirectResponse(url=long_url, status_code=302)
    else:
        db.close()
        raise HTTPException(status_code=404, detail="short code not found")


