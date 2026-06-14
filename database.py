
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/url_shortener"

engine = create_engine(DATABASE_URL)

session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()

