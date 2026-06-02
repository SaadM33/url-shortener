
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

app = FastAPI()

@app.get("/")
def home():
    return {"message": "URL Shortener: Welcome to root!"}

@app.get("/about")
def about():
    return {"message": "About: This is a simple URL shortener service built with FastAPI."}

@app.get("/url/{id}")
def get_url(id: str):
    return RedirectResponse(url="https://www.youtube.com/watch?v=jx96LweuWWI&list=RDjx96LweuWWI&start_radio=1")
    
    # always return the same URL for demonstration purposes
    # In a real application, you would look up the URL associated with the given ID in a database and return it. For example:
    # url = database.get_url_by_id(id)
    # if url:
    #     return {"url": url}
    # else:
    #     return {"error": "URL not found for the given ID."}

    # normally you would return the URL associated with the given ID so that the client can redirect to it, and the redirect would be handled on the client side
    # and the redirection is done like this in code:
    # from fastapi.responses import RedirectResponse
    # @app.get("/url/{id}")
    # def get_url(id: str):
    #     url = database.get_url_by_id(id)
    #     if url:
    #         return RedirectResponse(url=url)
    #     else if (url is None):
    #         return {"error": "URL not found for the given ID."}
    # In this example, the get_url function retrieves the URL associated with the given ID from the database and returns a RedirectResponse to that URL. If the URL is not found, it returns an error message.
    # and RedirectResponse is a class provided by FastAPI that allows you to return an HTTP response that redirects the client to a different URL. When the client receives this response, it will automatically navigate to the specified URL.
    #  that is how you would implement the redirection in a real URL shortener service, but for demonstration purposes, we are just returning a fixed URL for any given ID and redirecting it from the backend:
    # liek this:
    # from fastapi.responses import RedirectResponse


    # return {"message": f"URL for ID {id}!"}


# import requests
# r = requests.post("http://localhost:8000/url/123", params={"url": "https://www.youtube.com/watch?v=jx96LweuWWI&list=RDjx96LweuWWI&start_radio=1"})